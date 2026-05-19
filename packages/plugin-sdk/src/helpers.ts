/*
 * @arcane-route/plugin-sdk
 * Helper utilities for plugin developers
 */

import { logger } from '@arcane/logger';
import type { ArcanePlugin, PluginContext } from './types.js';

/**
 * Type-safe wrapper for defining an ArcanePlugin.
 * Ensures the plugin object conforms to the ArcanePlugin interface.
 *
 * @example
 * ```typescript
 * import { definePlugin } from '@arcane-route/plugin-sdk';
 *
 * export default definePlugin({
 *   async onLoad(ctx) {
 *     ctx.logger.info('Plugin loaded!');
 *   },
 *   async onUnload(ctx) {
 *     ctx.logger.info('Plugin unloaded.');
 *   }
 * });
 * ```
 */
export function definePlugin(plugin: ArcanePlugin): ArcanePlugin {
  return plugin;
}

/**
 * Creates a logger with a custom prefix.
 * Useful for plugins that want to use multiple named loggers.
 *
 * @param prefix - The prefix to use for all log messages
 * @param logger - The underlying logger (defaults to console-style)
 *
 * @example
 * ```typescript
 * const logger = createLogger('my-feature');
 * logger.info('Starting operation'); // [my-feature] Starting operation
 * ```
 */
export function createLogger(
  prefix: string,
  parentLogger?: Pick<PluginContext['logger'], 'info' | 'warn' | 'error' | 'debug'>,
): PluginContext['logger'] {
  const parent = parentLogger ?? logger;

  return {
    info: (msg: string) => parent.info({ prefix }, msg),
    warn: (msg: string) => parent.warn({ prefix }, msg),
    error: (msg: string, err?: Error) => parent.error({ prefix, err: err?.message, stack: err?.stack }, msg),
    debug: (msg: string) => parent.debug({ prefix }, msg),
  };
}

/**
 * Permission constants for use in plugin.manifest.json
 */
export const PERMISSIONS = {
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  SHELL_EXEC: 'shell:exec',
  NETWORK_OUTBOUND: 'network:outbound',
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  LLM_INVOKE: 'llm:invoke',
} as const;

/**
 * Common hooks that plugins can subscribe to
 */
export const HOOKS = {
  SWD_VERIFIED: 'swd:verified',
  SWD_MISMATCH: 'swd:mismatch',
  SWD_CORRECTION_NEEDED: 'swd:correction_needed',
  SWD_YIELD_TO_HUMAN: 'swd:yield_to_human',
  MEMORY_ENTRY_ADDED: 'memory:entry_added',
  MEMORY_COMPRESSED: 'memory:compressed',
  BUDGET_WARNING: 'budget:warning',
  BUDGET_EXCEEDED: 'budget:exceeded',
  CHAT_TURN_COMPLETE: 'chat:turn_complete',
} as const;

/**
 * Default config schema builder helper
 *
 * @example
 * ```typescript
 * const configSchema = defineConfig({
 *   format: { type: 'string', enum: ['conventional', 'simple'], default: 'conventional' },
 *   verbose: { type: 'boolean', default: false }
 * });
 * ```
 */
export function defineConfig(
  properties: Record<string, { type: string; enum?: string[]; default?: unknown; description?: string }>,
): { schema: { type: 'object'; properties: typeof properties } } {
  return {
    schema: {
      type: 'object',
      properties,
    },
  };
}