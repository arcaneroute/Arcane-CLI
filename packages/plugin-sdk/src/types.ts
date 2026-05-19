/*
 * @arcane-route/plugin-sdk
 * TypeScript types for Arcane Route plugin development
 */

// These types must match the PluginContext interface exposed by arcane-route core

// ============================================================================
// Plugin Manifest (user-facing, matches plugin.manifest.json schema)
// ============================================================================

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly homepage?: string;
  readonly arcaneVersion: string;
  readonly entrypoint: string;
  readonly hooks?: readonly string[];
  readonly commands?: readonly PluginCommand[];
  readonly permissions: readonly PluginPermission[];
  readonly config?: PluginConfigSchema;
}

export interface PluginCommand {
  readonly name: string;
  readonly description: string;
  readonly alias?: string;
}

export interface PluginConfigSchema {
  readonly schema: {
    readonly type: 'object';
    readonly properties: Record<string, PluginConfigProperty>;
    readonly additionalProperties?: boolean;
  };
}

export interface PluginConfigProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly description?: string;
}

// ============================================================================
// Permission System
// ============================================================================

export type PluginPermission =
  | 'fs:read'
  | 'fs:write'
  | 'shell:exec'
  | 'network:outbound'
  | 'memory:read'
  | 'memory:write'
  | 'llm:invoke';

// ============================================================================
// Main Plugin Interface
// ============================================================================

export interface ArcanePlugin {
  onLoad(ctx: PluginContext): Promise<void>;
  onUnload(ctx: PluginContext): Promise<void>;
}

// ============================================================================
// Plugin Context API (sandboxed surface exposed to plugins)
// ============================================================================

export interface PluginContext {
  readonly id: string;
  readonly arcaneVersion: string;
  readonly logger: PluginLogger;
  readonly events: PluginEventBus;
  readonly commands: PluginCommandRegistry;
  readonly config: PluginConfig;
  readonly ui: PluginUI;
  readonly fs: PluginFileSystem;
  readonly shell?: PluginShell;
  readonly network?: PluginNetwork;
  readonly llm?: PluginLLM;
}

// ============================================================================
// Sub-interfaces
// ============================================================================

export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: Error): void;
  debug(message: string): void;
}

export interface PluginEventBus {
  on(event: string, listener: (payload: unknown) => void): void;
  off(event: string, listener: (payload: unknown) => void): void;
  emit(event: `plugin:${string}`, payload?: unknown): void;
}

export interface PluginCommandRegistry {
  register(name: string, handler: CommandHandler): void;
  unregister(name: string): void;
}

export type CommandHandler = (args: string[]) => Promise<void>;

export interface PluginConfig {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
  getAll(): Record<string, unknown>;
}

export interface PluginUI {
  print(message: string): void;
  printSuccess(message: string): void;
  printWarning(message: string): void;
  printError(message: string): void;
}

export interface PluginFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readDir(path: string): Promise<string[]>;
}

export interface PluginShell {
  exec(command: string): Promise<ShellResult>;
}

export interface ShellResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface PluginNetwork {
  fetch(url: string, options?: RequestOptions): Promise<NetworkResponse>;
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

export interface NetworkResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export interface PluginLLM {
  sendMessage(params: PluginLLMParams): Promise<PluginLLMResponse>;
}

export interface PluginLLMParams {
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly effort?: 'high' | 'medium' | 'low';
}

export interface PluginLLMResponse {
  readonly text: string;
  readonly tokensUsed: PluginTokenUsage;
}

export interface PluginTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginId?: string,
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PluginManifestError extends PluginError {
  constructor(message: string, pluginId?: string) {
    super(message, pluginId);
    this.name = 'PluginManifestError';
  }
}

export class PluginLoadError extends PluginError {
  constructor(
    message: string,
    pluginId?: string,
    public override cause?: Error,
  ) {
    super(message, pluginId);
    this.name = 'PluginLoadError';
  }
}

export class PluginPermissionError extends PluginError {
  constructor(message: string, pluginId?: string) {
    super(message, pluginId);
    this.name = 'PluginPermissionError';
  }
}

export class PluginVersionError extends PluginError {
  constructor(message: string, pluginId?: string) {
    super(message, pluginId);
    this.name = 'PluginVersionError';
  }
}