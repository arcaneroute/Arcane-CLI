/*
 * arcane-route :: src/plugins/index.ts
 * Public exports for the plugin subsystem
 */

// Types (re-exported from types/plugin.ts for convenience)
// Errors
export type {
  ArcanePlugin,
  CommandHandler,
  NetworkResponse,
  PluginCommand,
  PluginCommandRegistry,
  PluginConfig,
  PluginConfigProperty,
  PluginConfigSchema,
  PluginContext,
  PluginError,
  PluginEventBus,
  PluginEventPayloads,
  PluginFileSystem,
  PluginLLM,
  PluginLLMParams,
  PluginLLMResponse,
  PluginLogger,
  PluginManifest,
  PluginManifestError,
  PluginNetwork,
  PluginPermission,
  PluginPermissionError,
  PluginRegistryData,
  PluginRegistryEntry,
  PluginSource,
  PluginTokenUsage,
  PluginVersionError,
  RequestOptions,
  ShellResult,
} from '../types/plugin.ts';
export { PluginContextBuilder } from './PluginContext.ts';
// Plugin Core
export { PluginLoader } from './PluginLoader.ts';
export { PluginRegistry } from './PluginRegistry.ts';
export { PluginValidator } from './PluginValidator.ts';
