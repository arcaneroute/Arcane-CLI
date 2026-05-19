/*
 * arcane-route :: src/types/plugin.ts
 * TypeScript types for the plugin system
 */

// ============================================================================
// Plugin Manifest
// ============================================================================

export interface PluginManifest {
  /** Unique identifier, format: arcane-plugin-{name} */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Semver version */
  readonly version: string;
  /** Short description */
  readonly description: string;
  /** Author name and email */
  readonly author: string;
  /** Homepage URL */
  readonly homepage?: string;
  /** Semver range of Arcane Route compatibility */
  readonly arcaneVersion: string;
  /** Entry point file, relative to plugin root */
  readonly entrypoint: string;
  /** ArcaneEvent channels this plugin subscribes to */
  readonly hooks?: readonly string[];
  /** Slash commands registered by this plugin */
  readonly commands?: readonly PluginCommand[];
  /** Explicit permissions required by this plugin */
  readonly permissions: readonly PluginPermission[];
  /** JSON Schema for plugin configuration */
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
// Plugin Permission System
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
// Plugin Interface
// ============================================================================

/**
 * Main plugin interface — plugins export a default object conforming to this.
 */
export interface ArcanePlugin {
  /**
   * Called once when the plugin is loaded into the registry.
   * Use to register listeners, commands, and initialize state.
   */
  onLoad(ctx: PluginContext): Promise<void>;

  /**
   * Called when the plugin is unloaded or Arcane Route shuts down.
   * Use to clean up resources (timers, file handles, etc).
   */
  onUnload(ctx: PluginContext): Promise<void>;
}

// ============================================================================
// Plugin Context API (sandboxed surface exposed to plugins)
// ============================================================================

export interface PluginContext {
  /** ID from manifest */
  readonly id: string;

  /** Running Arcane Route version */
  readonly arcaneVersion: string;

  /** Isolated logger with plugin prefix */
  readonly logger: PluginLogger;

  /** Typed event bus — only for events registered in manifest.hooks */
  readonly events: PluginEventBus;

  /** Slash command registration */
  readonly commands: PluginCommandRegistry;

  /** Plugin configuration access */
  readonly config: PluginConfig;

  /** Terminal UI output */
  readonly ui: PluginUI;

  /** Limited filesystem access (based on permissions) */
  readonly fs: PluginFileSystem;

  /** Limited shell access (only if shell:exec permission granted) */
  readonly shell?: PluginShell;

  /** Limited network access (only if network:outbound permission granted) */
  readonly network?: PluginNetwork;

  /** LLM access via user's provider (only if llm:invoke permission granted) */
  readonly llm?: PluginLLM;
}

// ============================================================================
// PluginContext Sub-interfaces
// ============================================================================

export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: Error): void;
  debug(message: string): void;
}

export interface PluginEventBus {
  /**
   * Subscribe to an event. Only events listed in manifest.hooks are allowed.
   * @throws {Error} if event is not in manifest.hooks
   */
  on(event: string, listener: (payload: unknown) => void): void;

  /**
   * Unsubscribe from an event.
   */
  off(event: string, listener: (payload: unknown) => void): void;

  /**
   * Emit a custom event with plugin namespace.
   * Format: plugin:{pluginId}:{action}
   */
  emit(event: `plugin:${string}`, payload?: unknown): void;
}

export interface PluginEventPayloads {
  'chat:turn_complete': { turn: number; tokensUsed: number };
  'memory:entry_added': { entryCount: number };
  'swd:verified': { path: string; hash: string };
  [key: `plugin:${string}`]: unknown;
}

export interface PluginCommandRegistry {
  /** Register a new slash command */
  register(name: string, handler: CommandHandler): void;
  /** Remove a command registration */
  unregister(name: string): void;
}

export type CommandHandler = (args: string[]) => Promise<void>;

export interface PluginConfig {
  /** Get a config value, returns undefined if not set */
  get<T>(key: string): T | undefined;
  /** Set a config value (persisted to disk) */
  set<T>(key: string, value: T): Promise<void>;
  /** Get all config as plain object */
  getAll(): Record<string, unknown>;
}

export interface PluginUI {
  /** Print output to terminal */
  print(message: string): void;
  /** Print styled output */
  printSuccess(message: string): void;
  /** Print warning */
  printWarning(message: string): void;
  /** Print error */
  printError(message: string): void;
}

export interface PluginFileSystem {
  /** Read file — only if fs:read permission granted */
  readFile(path: string): Promise<string>;
  /** Write file — only if fs:write permission granted */
  writeFile(path: string, content: string): Promise<void>;
  /** Check if path exists */
  exists(path: string): Promise<boolean>;
  /** List directory contents */
  readDir(path: string): Promise<string[]>;
}

export interface PluginShell {
  /** Execute a shell command — only if shell:exec permission granted */
  exec(command: string): Promise<ShellResult>;
}

export interface ShellResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface PluginNetwork {
  /** Make HTTP request — only if network:outbound permission granted */
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
  /** Send message to LLM. Token usage counts toward session budget. */
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
// Plugin Registry Types
// ============================================================================

export interface PluginRegistryEntry {
  readonly id: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly installedAt: string;
  readonly path: string;
  readonly source: PluginSource;
}

export type PluginSource = 'npm' | 'local' | 'github';

export interface PluginRegistryData {
  readonly version: 1;
  readonly plugins: readonly PluginRegistryEntry[];
}

// ============================================================================
// Plugin Error Types
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
    override cause?: Error,
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
