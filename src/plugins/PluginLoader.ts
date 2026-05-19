/*
 * arcane-route :: src/plugins/PluginLoader.ts
 * Discovers, validates, and hydrates plugins from .arcane/plugins/
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EventBus } from '../core/EventBus.ts';
import type {
  ArcanePlugin,
  PluginContext,
  PluginManifest,
  PluginTokenUsage,
} from '../types/plugin.ts';
import { PluginLoadError, PluginManifestError } from '../types/plugin.ts';
import { PluginContextBuilder } from './PluginContext.ts';
import type { PluginRegistry } from './PluginRegistry.ts';
import { PluginValidator } from './PluginValidator.ts';

/**
 * Discovers, validates, and loads plugins from the plugin registry.
 * Handles error isolation — plugin failures don't crash the main app.
 */
export class PluginLoader {
  private readonly registry: PluginRegistry;
  private readonly validator: PluginValidator;
  private readonly eventBus: EventBus;
  private readonly arcaneVersion: string;
  private readonly projectRoot: string;
  private budgetLimiter: { recordUsage(tokens: PluginTokenUsage): void } | null = null;
  private llmClient: {
    send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
  } | null = null;

  constructor(
    registry: PluginRegistry,
    eventBus: EventBus,
    arcaneVersion: string = '1.0.0',
    projectRoot: string = process.cwd(),
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.arcaneVersion = arcaneVersion;
    this.projectRoot = projectRoot;
    this.validator = new PluginValidator(arcaneVersion);
  }

  /**
   * Set the budget limiter for tracking plugin LLM usage.
   */
  public setBudgetLimiter(budgetLimiter: { recordUsage(tokens: PluginTokenUsage): void }): void {
    this.budgetLimiter = budgetLimiter;
  }

  /**
   * Set the LLM client for plugins with llm:invoke permission.
   */
  public setLLMClient(client: {
    send(prompt: string, system?: string): Promise<{ text: string; tokens: PluginTokenUsage }>;
  }): void {
    this.llmClient = client;
  }

  /**
   * Load all enabled plugins from the registry.
   */
  public async loadAll(): Promise<void> {
    await this.registry.load();

    const enabledPlugins = this.registry.getEnabled();
    const logger = { info: (m: string) => console.log(`[PluginLoader] ${m}`) };

    logger.info(`Loading ${enabledPlugins.length} enabled plugin(s)...`);

    for (const entry of enabledPlugins) {
      try {
        await this.loadOne(entry.id);
        logger.info(`  ✓ ${entry.id} loaded`);
      } catch (err) {
        logger.info(`  ✗ ${entry.id} failed: ${err}`);
        // Disable plugin on load failure
        await this.registry.disable(entry.id);
      }
    }
  }

  /**
   * Load a single plugin by ID.
   */
  public async loadOne(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginLoadError(`Plugin not found in registry: ${pluginId}`, pluginId);
    }

    if (!entry.enabled) {
      throw new PluginLoadError(`Plugin is disabled: ${pluginId}`, pluginId);
    }

    // Validate manifest
    const manifest = await this.validator.validateManifest(entry.path);

    // Import plugin module
    const plugin = await this.importPlugin(entry.path, manifest.entrypoint);

    // Build context
    const context = this.buildContext(manifest);

    // Store instance and context
    this.registry.setInstance(pluginId, plugin);
    this.registry.setContext(pluginId, context);

    // Call onLoad
    try {
      await plugin.onLoad(context);
    } catch (err) {
      throw new PluginLoadError(
        `onLoad failed for plugin: ${pluginId}`,
        pluginId,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Unload a single plugin by ID.
   */
  public async unloadOne(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginLoadError(`Plugin not found in registry: ${pluginId}`, pluginId);
    }

    const plugin = this.registry.getInstance(pluginId);
    const context = this.registry.getContext(pluginId);

    if (plugin && context) {
      try {
        await plugin.onUnload(context);
      } catch (err) {
        console.error(`[PluginLoader] onUnload failed for ${pluginId}:`, err);
      }
    }

    this.registry.setInstance(pluginId, undefined as unknown as ArcanePlugin);
    this.registry.setContext(pluginId, undefined as unknown as PluginContext);
  }

  /**
   * Unload all loaded plugins.
   */
  public async unloadAll(): Promise<void> {
    const entries = this.registry.getAll();

    for (const entry of entries) {
      if (this.registry.getInstance(entry.id)) {
        try {
          await this.unloadOne(entry.id);
        } catch (err) {
          console.error(`[PluginLoader] Failed to unload ${entry.id}:`, err);
        }
      }
    }
  }

  /**
   * Reload a plugin (unload + load).
   */
  public async reload(pluginId: string): Promise<void> {
    await this.unloadOne(pluginId);
    await this.loadOne(pluginId);
  }

  // -------------------------------------------------------------------------

  private async importPlugin(pluginPath: string, entrypoint: string): Promise<ArcanePlugin> {
    const entryPath = join(pluginPath, entrypoint);

    if (!existsSync(entryPath)) {
      throw new PluginManifestError(`Plugin entry point not found: ${entrypoint}`);
    }

    try {
      // Dynamic import with explicit file extension for Bun
      const module = await import(`file://${entryPath}`);
      const plugin = module.default;

      if (!plugin || typeof plugin !== 'object') {
        throw new PluginLoadError('Plugin must export a default object');
      }

      if (typeof plugin.onLoad !== 'function' || typeof plugin.onUnload !== 'function') {
        throw new PluginLoadError('Plugin must implement onLoad and onUnload methods');
      }

      return plugin as ArcanePlugin;
    } catch (err) {
      if (err instanceof PluginLoadError || err instanceof PluginManifestError) {
        throw err;
      }
      throw new PluginLoadError(
        `Failed to import plugin: ${err}`,
        undefined,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private buildContext(manifest: PluginManifest): PluginContext {
    const builder = new PluginContextBuilder()
      .withManifest(manifest)
      .withArcaneVersion(this.arcaneVersion)
      .withProjectRoot(this.projectRoot)
      .withEventBus(this.eventBus);

    if (this.budgetLimiter) {
      builder.withBudgetLimiter(this.budgetLimiter);
    }
    if (this.llmClient) {
      builder.withLLMClient(this.llmClient);
    }

    return builder.build();
  }
}
