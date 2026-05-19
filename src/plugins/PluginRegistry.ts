/*
 * arcane-route :: src/plugins/PluginRegistry.ts
 * Singleton registry for managing loaded plugins at project-level scope
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ArcanePlugin,
  PluginContext,
  PluginRegistryData,
  PluginRegistryEntry,
  PluginSource,
} from '../types/plugin.ts';
import { PluginError } from '../types/plugin.ts';

const REGISTRY_VERSION = 1 as const;
const REGISTRY_FILENAME = 'plugins.json';
const PLUGIN_DIR = '.arcane/plugins';

/**
 * Singleton registry of loaded plugins.
 * Persists plugin registry to `.arcane/plugins.json` at project level.
 */
export class PluginRegistry {
  private static _instance: PluginRegistry | null = null;

  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private pluginInstances: Map<string, ArcanePlugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private readonly projectRoot: string;

  private constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /** Get singleton instance */
  public static getInstance(projectRoot?: string): PluginRegistry {
    PluginRegistry._instance ??= new PluginRegistry(projectRoot);
    return PluginRegistry._instance;
  }

  /** Reset singleton — for unit testing only */
  public static _reset(): void {
    PluginRegistry._instance = null;
  }

  /** Get registry file path */
  private get registryPath(): string {
    return join(this.projectRoot, '.arcane', REGISTRY_FILENAME);
  }

  /** Get plugin directory path */
  public get pluginsDir(): string {
    return join(this.projectRoot, PLUGIN_DIR);
  }

  /** Load registry from disk */
  public load(): void {
    if (!existsSync(this.registryPath)) {
      this.plugins.clear();
      return;
    }

    try {
      const content = readFileSync(this.registryPath, 'utf8');
      const data = JSON.parse(content) as PluginRegistryData;

      if (data.version !== REGISTRY_VERSION) {
        throw new PluginError(`Unsupported registry version: ${data.version}`);
      }

      this.plugins.clear();
      for (const entry of data.plugins) {
        this.plugins.set(entry.id, entry);
      }
    } catch (err) {
      if (err instanceof PluginError) throw err;
      throw new PluginError(`Failed to load plugin registry: ${err}`);
    }
  }

  /** Persist registry to disk */
  public save(): void {
    const dir = join(this.projectRoot, '.arcane');
    mkdirSync(dir, { recursive: true });
    const data: PluginRegistryData = {
      version: REGISTRY_VERSION,
      plugins: Array.from(this.plugins.values()),
    };

    writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
  }

  /** Register a new plugin */
  public register(id: string, version: string, path: string, source: PluginSource): void {
    if (this.plugins.has(id)) {
      throw new PluginError(`Plugin already registered: ${id}`, id);
    }

    const entry: PluginRegistryEntry = {
      id,
      version,
      enabled: true,
      installedAt: new Date().toISOString(),
      path,
      source,
    };

    this.plugins.set(id, entry);
    this.save();
  }

  /** Unregister a plugin */
  public unregister(id: string): void {
    if (!this.plugins.has(id)) {
      throw new PluginError(`Plugin not found: ${id}`, id);
    }

    this.plugins.delete(id);
    this.pluginInstances.delete(id);
    this.pluginContexts.delete(id);
    this.save();
  }

  /** Enable a plugin */
  public enable(id: string): void {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new PluginError(`Plugin not found: ${id}`, id);
    }

    const updated: PluginRegistryEntry = { ...entry, enabled: true };
    this.plugins.set(id, updated);
    this.save();
  }

  /** Disable a plugin */
  public disable(id: string): void {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new PluginError(`Plugin not found: ${id}`, id);
    }

    const updated: PluginRegistryEntry = { ...entry, enabled: false };
    this.plugins.set(id, updated);
    this.save();
  }

  /** Get all registered plugins */
  public getAll(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /** Get all enabled plugins */
  public getEnabled(): PluginRegistryEntry[] {
    return this.getAll().filter((p) => p.enabled);
  }

  /** Get plugin entry by ID */
  public get(id: string): PluginRegistryEntry | undefined {
    return this.plugins.get(id);
  }

  /** Check if plugin is registered */
  public has(id: string): boolean {
    return this.plugins.has(id);
  }

  /** Check if plugin is enabled */
  public isEnabled(id: string): boolean {
    return this.plugins.get(id)?.enabled ?? false;
  }

  /** Store plugin instance (internal use by PluginLoader) */
  public setInstance(id: string, instance: ArcanePlugin): void {
    this.pluginInstances.set(id, instance);
  }

  /** Get plugin instance (internal use by PluginLoader) */
  public getInstance(id: string): ArcanePlugin | undefined {
    return this.pluginInstances.get(id);
  }

  /** Store plugin context (internal use by PluginLoader) */
  public setContext(id: string, context: PluginContext): void {
    this.pluginContexts.set(id, context);
  }

  /** Get plugin context (internal use by PluginLoader) */
  public getContext(id: string): PluginContext | undefined {
    return this.pluginContexts.get(id);
  }

  /** Find command handler by name across all enabled plugins */
  public findCommand(
    name: string,
  ): { pluginId: string; handler: (args: string[]) => Promise<void> } | undefined {
    for (const [pluginId, context] of this.pluginContexts) {
      if (!this.isEnabled(pluginId)) continue;

      // Access commands through internal interface
      const commands = context.commands as unknown as {
        getHandler(name: string): ((args: string[]) => Promise<void>) | undefined;
      };
      const handler = commands.getHandler(name);
      if (handler) {
        return { pluginId, handler };
      }
    }
    return undefined;
  }
}
