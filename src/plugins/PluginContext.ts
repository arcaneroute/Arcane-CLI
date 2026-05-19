/*
 * arcane-route :: src/plugins/PluginContext.ts
 * Sandboxed context builder with permission enforcement for plugins
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { EventBus } from '../core/EventBus.ts';
import type { ArcaneEvent } from '../types/index.ts';
import type {
  CommandHandler,
  PluginCommandRegistry,
  PluginConfig,
  PluginContext,
  PluginEventBus,
  PluginFileSystem,
  PluginLLM,
  PluginLogger,
  PluginManifest,
  PluginNetwork,
  PluginShell,
  PluginTokenUsage,
  PluginUI,
  ShellResult,
} from '../types/plugin.ts';
import { PluginPermissionError } from '../types/plugin.ts';

/**
 * Builds a sandboxed PluginContext for a single plugin.
 * Each plugin gets its own isolated context instance.
 */
export class PluginContextBuilder {
  private manifest: PluginManifest | null = null;
  private arcaneVersion: string = '1.0.0';
  private projectRoot: string = process.cwd();
  private eventBus: EventBus = EventBus.getInstance();
  private budgetLimiter: { recordUsage(tokens: PluginTokenUsage): void } | null = null;
  private llmClient: {
    send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
  } | null = null;

  public withManifest(manifest: PluginManifest): this {
    this.manifest = manifest;
    return this;
  }

  public withArcaneVersion(version: string): this {
    this.arcaneVersion = version;
    return this;
  }

  public withProjectRoot(root: string): this {
    this.projectRoot = root;
    return this;
  }

  public withEventBus(bus: EventBus): this {
    this.eventBus = bus;
    return this;
  }

  public withBudgetLimiter(limiter: { recordUsage(tokens: PluginTokenUsage): void }): this {
    this.budgetLimiter = limiter;
    return this;
  }

  public withLLMClient(client: {
    send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
  }): this {
    this.llmClient = client;
    return this;
  }

  public build(): PluginContext {
    if (!this.manifest) {
      throw new Error('Manifest is required to build PluginContext');
    }

    const manifest = this.manifest;
    const permissions = new Set(manifest.permissions);

    const baseContext = {
      id: manifest.id,
      arcaneVersion: this.arcaneVersion,
      logger: new PluginLoggerImpl(manifest.id),
      events: new PluginEventBusImpl(manifest.id, this.eventBus, manifest.hooks),
      commands: new PluginCommandRegistryImpl(manifest.id),
      config: new PluginConfigImpl(manifest.id, this.projectRoot, manifest.config),
      ui: new PluginUIImpl(),
      fs: new PluginFileSystemImpl(manifest.id, this.projectRoot, permissions),
    };

    const context: PluginContext = {
      ...baseContext,
      ...(permissions.has('shell:exec') && { shell: new PluginShellImpl() }),
      ...(permissions.has('network:outbound') && { network: new PluginNetworkImpl() }),
      ...(permissions.has('llm:invoke') &&
        this.llmClient && {
          llm: new PluginLLMImpl(this.llmClient, this.budgetLimiter),
        }),
    };

    return context;
  }
}

// ============================================================================
// PluginLogger Implementation
// ============================================================================

class PluginLoggerImpl implements PluginLogger {
  private readonly prefix: string;

  constructor(pluginId: string) {
    this.prefix = `[${pluginId}]`;
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${level} ${this.prefix} ${message}`);
  }

  public info(message: string): void {
    this.log('INFO', message);
  }

  public warn(message: string): void {
    this.log('WARN', message);
  }

  public error(message: string, error?: Error): void {
    this.log('ERROR', message);
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  public debug(message: string): void {
    if (process.env.DEBUG === 'true' || process.env.DEBUG?.includes('plugins')) {
      this.log('DEBUG', message);
    }
  }
}

// ============================================================================
// PluginEventBus Implementation
// ============================================================================

class PluginEventBusImpl implements PluginEventBus {
  private readonly pluginId: string;
  private readonly eventBus: EventBus;
  private readonly allowedHooks: readonly string[] | undefined;
  private readonly listenerMap: Map<string, Set<(payload: unknown) => void>> = new Map();

  constructor(pluginId: string, eventBus: EventBus, allowedHooks: readonly string[] | undefined) {
    this.pluginId = pluginId;
    this.eventBus = eventBus;
    this.allowedHooks = allowedHooks;
  }

  public on(event: string, listener: (payload: unknown) => void): void {
    this.validateHook(event);

    const wrappedListener = (payload: unknown) => {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[${this.pluginId}] Event listener error:`, err);
      }
    };

    this.eventBus.on(event as ArcaneEvent, wrappedListener);

    if (!this.listenerMap.has(event)) {
      this.listenerMap.set(event, new Set());
    }
    this.listenerMap.get(event)?.add(wrappedListener);
  }

  public off(event: string, _listener: (payload: unknown) => void): void {
    const listeners = this.listenerMap.get(event);
    if (listeners) {
      for (const l of listeners) {
        this.eventBus.off(event as ArcaneEvent, l);
      }
      listeners.clear();
    }
  }

  public emit(event: `plugin:${string}`, payload?: unknown): void {
    if (!event.startsWith(`plugin:${this.pluginId}:`)) {
      console.warn(
        `[${this.pluginId}] Plugin can only emit events with prefix plugin:${this.pluginId}:, got: ${event}`,
      );
      return;
    }
    this.eventBus.emit(event as ArcaneEvent, payload as Parameters<EventBus['emit']>[1]);
  }

  private validateHook(event: string): void {
    if (event.startsWith('plugin:')) return; // Custom plugin events don't need validation
    if (!this.allowedHooks?.includes(event)) {
      throw new PluginPermissionError(
        `Hook "${event}" not declared in manifest.hooks`,
        this.pluginId,
      );
    }
  }
}

// ============================================================================
// PluginCommandRegistry Implementation
// ============================================================================

class PluginCommandRegistryImpl implements PluginCommandRegistry {
  private readonly pluginId: string;
  private readonly commands: Map<string, CommandHandler> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  public register(name: string, handler: CommandHandler): void {
    if (!name.startsWith('/')) {
      throw new PluginPermissionError(
        `Command name must start with "/", got: ${name}`,
        this.pluginId,
      );
    }
    this.commands.set(name, handler);
  }

  public unregister(name: string): void {
    this.commands.delete(name);
  }

  public getHandler(name: string): CommandHandler | undefined {
    return this.commands.get(name);
  }

  public getAllCommands(): Map<string, CommandHandler> {
    return new Map(this.commands);
  }
}

// ============================================================================
// PluginConfig Implementation
// ============================================================================

class PluginConfigImpl implements PluginConfig {
  private readonly configPath: string;
  private readonly defaults: Record<string, unknown>;
  private cache: Record<string, unknown> = {};

  constructor(
    pluginId: string,
    projectRoot: string,
    schema?: { schema: { properties: Record<string, { default?: unknown }> } },
  ) {
    this.configPath = join(projectRoot, '.arcane', 'plugin-config', `${pluginId}.json`);

    // Extract defaults from schema
    this.defaults = {};
    if (schema?.schema?.properties) {
      for (const [key, prop] of Object.entries(schema.schema.properties)) {
        if (prop.default !== undefined) {
          this.defaults[key] = prop.default;
        }
      }
    }

    // Load on construction
    this.loadSync();
  }

  private loadSync(): void {
    if (existsSync(this.configPath)) {
      try {
        const content = readFileSync(this.configPath, 'utf8');
        this.cache = { ...this.defaults, ...JSON.parse(content) };
      } catch {
        this.cache = { ...this.defaults };
      }
    } else {
      this.cache = { ...this.defaults };
    }
  }

  private persistSync(): void {
    const dir = join(this.configPath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(this.cache, null, 2));
  }

  public get<T>(key: string): T | undefined {
    return this.cache[key] as T | undefined;
  }

  public set<T>(key: string, value: T): Promise<void> {
    this.cache[key] = value;
    this.persistSync();
    return Promise.resolve();
  }

  public getAll(): Record<string, unknown> {
    return { ...this.cache };
  }
}

// ============================================================================
// PluginUI Implementation
// ============================================================================

class PluginUIImpl implements PluginUI {
  public print(message: string): void {
    console.log(message);
  }

  public printSuccess(message: string): void {
    console.log(`\x1b[32m✓ ${message}\x1b[0m`);
  }

  public printWarning(message: string): void {
    console.warn(`\x1b[33m⚠ ${message}\x1b[0m`);
  }

  public printError(message: string): void {
    console.error(`\x1b[31m✗ ${message}\x1b[0m`);
  }
}

// ============================================================================
// PluginFileSystem Implementation
// ============================================================================

class PluginFileSystemImpl implements PluginFileSystem {
  private readonly pluginId: string;
  private readonly allowedRoot: string;
  private readonly permissions: Set<string>;

  constructor(pluginId: string, projectRoot: string, permissions: Set<string>) {
    this.pluginId = pluginId;
    this.allowedRoot = projectRoot;
    this.permissions = permissions;
  }

  private validatePermission(permission: 'fs:read' | 'fs:write'): void {
    if (!this.permissions.has(permission)) {
      throw new PluginPermissionError(`Permission "${permission}" not granted`, this.pluginId);
    }
  }

  private validatePath(userPath: string): string {
    const resolved = resolve(this.allowedRoot, userPath);
    const relativePath = relative(this.allowedRoot, resolved);

    // Path traversal prevention
    if (relativePath.startsWith('..') || !resolved.startsWith(this.allowedRoot)) {
      throw new PluginPermissionError(`Path traversal detected: ${userPath}`, this.pluginId);
    }

    return resolved;
  }

  public async readFile(path: string): Promise<string> {
    this.validatePermission('fs:read');
    const resolved = this.validatePath(path);
    return readFileSync(resolved, 'utf8');
  }

  public async writeFile(path: string, content: string): Promise<void> {
    this.validatePermission('fs:write');
    const resolved = this.validatePath(path);
    writeFileSync(resolved, content);
  }

  public async exists(path: string): Promise<boolean> {
    const resolved = this.validatePath(path);
    return existsSync(resolved);
  }

  public async readDir(path: string): Promise<string[]> {
    this.validatePermission('fs:read');
    const resolved = this.validatePath(path);

    try {
      return readdirSync(resolved);
    } catch {
      return [];
    }
  }
}

// ============================================================================
// PluginShell Implementation
// ============================================================================

class PluginShellImpl implements PluginShell {
  public async exec(command: string): Promise<ShellResult> {
    try {
      const result = Bun.spawnSync({
        cmd: ['sh', '-c', command],
        stdout: 'pipe',
        stderr: 'pipe',
      });

      return {
        stdout: result.stdout?.toString() ?? '',
        stderr: result.stderr?.toString() ?? '',
        exitCode: result.exitCode ?? 1,
      };
    } catch (err) {
      return {
        stdout: '',
        stderr: String(err),
        exitCode: 1,
      };
    }
  }
}

// ============================================================================
// PluginNetwork Implementation
// ============================================================================

class PluginNetworkImpl implements PluginNetwork {
  public async fetch(
    url: string,
    options?: { method?: string; headers?: Record<string, string>; body?: string },
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }> {
    try {
      const response = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: options?.headers,
        body: options?.body,
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        body: await response.text(),
      };
    } catch (err) {
      return {
        status: 0,
        statusText: String(err),
        headers: {},
        body: '',
      };
    }
  }
}

// ============================================================================
// PluginLLM Implementation
// ============================================================================

class PluginLLMImpl implements PluginLLM {
  private readonly client: {
    send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
  };
  private readonly budgetLimiter: { recordUsage(tokens: PluginTokenUsage): void } | null;

  constructor(
    client: {
      send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
    },
    budgetLimiter: { recordUsage(tokens: PluginTokenUsage): void } | null,
  ) {
    this.client = client;
    this.budgetLimiter = budgetLimiter;
  }

  public async sendMessage(params: {
    prompt: string;
    systemPrompt?: string;
    effort?: 'high' | 'medium' | 'low';
  }): Promise<{
    text: string;
    tokensUsed: PluginTokenUsage;
  }> {
    const result = await this.client.send(params.prompt, params.systemPrompt);

    if (this.budgetLimiter) {
      this.budgetLimiter.recordUsage(result.tokens);
    }

    return {
      text: result.text,
      tokensUsed: result.tokens,
    };
  }
}
