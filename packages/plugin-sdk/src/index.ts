/*
 * @arcane-route/plugin-sdk
 * Official SDK for building Arcane Route plugins
 *
 * @example
 * ```typescript
 * import { definePlugin, createLogger, PERMISSIONS, HOOKS } from '@arcane-route/plugin-sdk';
 *
 * const plugin = definePlugin({
 *   async onLoad(ctx) {
 *     ctx.logger.info('My plugin loaded!');
 *     ctx.events.on('chat:turn_complete', (payload) => {
 *       console.log('Turn complete:', payload);
 *     });
 *   },
 *   async onUnload(ctx) {
 *     ctx.logger.info('My plugin unloaded');
 *   }
 * });
 *
 * export default plugin;
 * ```
 */

// Types
export type { ArcanePlugin } from './types.js';

export type {
  PluginManifest,
  PluginCommand,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginPermission,
  PluginContext,
  PluginLogger,
  PluginEventBus,
  PluginCommandRegistry,
  CommandHandler,
  PluginConfig,
  PluginUI,
  PluginFileSystem,
  PluginShell,
  ShellResult,
  PluginNetwork,
  RequestOptions,
  NetworkResponse,
  PluginLLM,
  PluginLLMParams,
  PluginLLMResponse,
  PluginTokenUsage,
  PluginError,
  PluginManifestError,
  PluginLoadError,
  PluginPermissionError,
  PluginVersionError,
} from './types.js';

// Helpers
export { definePlugin, createLogger, defineConfig, PERMISSIONS, HOOKS } from './helpers.js';