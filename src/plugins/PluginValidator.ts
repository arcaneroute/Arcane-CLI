/*
 * arcane-route :: src/plugins/PluginValidator.ts
 * Validates plugin manifest schema, version compatibility, and permissions
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import semver from 'semver';
import type { PluginManifest, PluginPermission } from '../types/plugin.ts';
import { PluginManifestError, PluginPermissionError, PluginVersionError } from '../types/plugin.ts';

const MANIFEST_FILENAME = 'plugin.manifest.json';

const VALID_PERMISSIONS: readonly PluginPermission[] = [
  'fs:read',
  'fs:write',
  'shell:exec',
  'network:outbound',
  'memory:read',
  'memory:write',
  'llm:invoke',
];

const VALID_HOOKS = [
  'swd:verified',
  'swd:mismatch',
  'swd:correction_needed',
  'swd:yield_to_human',
  'memory:entry_added',
  'memory:compressed',
  'budget:warning',
  'budget:exceeded',
  'chat:turn_complete',
] as const;

/**
 * Validates plugin manifest and schema compliance.
 */
export class PluginValidator {
  private readonly arcaneVersion: string;

  constructor(arcaneVersion: string = '1.0.0') {
    this.arcaneVersion = arcaneVersion;
  }

  /**
   * Validate a plugin manifest file exists and has valid schema.
   */
  public async validateManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = join(pluginPath, MANIFEST_FILENAME);

    if (!existsSync(manifestPath)) {
      throw new PluginManifestError(`Missing plugin manifest: ${MANIFEST_FILENAME}`, undefined);
    }

    let content: string;
    try {
      content = readFileSync(manifestPath, 'utf8');
    } catch {
      throw new PluginManifestError(`Failed to read manifest: ${manifestPath}`);
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(content);
    } catch {
      throw new PluginManifestError('Invalid JSON in manifest');
    }

    return this.validateManifestData(manifest);
  }

  /**
   * Validate manifest data (already parsed).
   */
  public validateManifestData(manifest: unknown): PluginManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw new PluginManifestError('Manifest must be an object');
    }

    const obj = manifest as Record<string, unknown>;

    // Required string fields
    this.validateRequiredString(obj, 'id');
    this.validateRequiredString(obj, 'name');
    this.validateRequiredString(obj, 'version');
    this.validateRequiredString(obj, 'description');
    this.validateRequiredString(obj, 'author');
    this.validateRequiredString(obj, 'arcaneVersion');
    this.validateRequiredString(obj, 'entrypoint');

    // Validate ID format
    const id = obj.id as string;
    if (!id.startsWith('arcane-plugin-')) {
      throw new PluginManifestError('Plugin ID must start with "arcane-plugin-"', id);
    }

    // Validate semver version
    const version = obj.version as string;
    if (!semver.valid(version)) {
      throw new PluginManifestError(`Invalid semver version: ${version}`, id);
    }

    // Validate arcaneVersion range
    const arcaneVersionRange = obj.arcaneVersion as string;
    if (!semver.validRange(arcaneVersionRange)) {
      throw new PluginManifestError(`Invalid arcaneVersion range: ${arcaneVersionRange}`, id);
    }

    // Check compatibility
    if (!semver.satisfies(this.arcaneVersion, arcaneVersionRange)) {
      throw new PluginVersionError(
        `Plugin requires arcane-route ${arcaneVersionRange}, but running ${this.arcaneVersion}`,
        id,
      );
    }

    // Validate permissions
    const permissions = obj.permissions;
    if (!Array.isArray(permissions)) {
      throw new PluginManifestError('permissions must be an array', id);
    }

    for (const perm of permissions) {
      if (typeof perm !== 'string') {
        throw new PluginManifestError('permission entries must be strings', id);
      }
      if (!VALID_PERMISSIONS.includes(perm as PluginPermission)) {
        throw new PluginPermissionError(`Unknown permission: ${perm}`, id);
      }
    }

    // Validate hooks if present
    const hooks = obj.hooks;
    if (hooks !== undefined) {
      if (!Array.isArray(hooks)) {
        throw new PluginManifestError('hooks must be an array', id);
      }
      for (const hook of hooks) {
        if (typeof hook !== 'string') {
          throw new PluginManifestError('hook entries must be strings', id);
        }
        if (!VALID_HOOKS.includes(hook as (typeof VALID_HOOKS)[number])) {
          throw new PluginManifestError(`Unknown hook: ${hook}`, id);
        }
      }
    }

    // Validate commands if present
    const commands = obj.commands;
    if (commands !== undefined) {
      if (!Array.isArray(commands)) {
        throw new PluginManifestError('commands must be an array', id);
      }
      for (const cmd of commands) {
        this.validateCommand(cmd, id);
      }
    }

    // Validate config schema if present
    const config = obj.config;
    if (config !== undefined) {
      this.validateConfigSchema(config, id);
    }

    return manifest as unknown as PluginManifest;
  }

  /**
   * Check if all declared permissions are allowed by the manifest.
   */
  public validatePermissions(
    manifestPermissions: readonly string[],
    requestedPermission: PluginPermission,
  ): void {
    if (!manifestPermissions.includes(requestedPermission)) {
      throw new PluginPermissionError(
        `Permission "${requestedPermission}" not declared in manifest`,
      );
    }
  }

  /**
   * Check if a hook is valid for the plugin.
   */
  public validateHook(manifestHooks: readonly string[] | undefined, hook: string): void {
    if (!manifestHooks?.includes(hook)) {
      throw new PluginManifestError(`Hook "${hook}" not declared in manifest.hooks`);
    }
  }

  // ---------------------------------------------------------------------------

  private validateRequiredString(obj: Record<string, unknown>, field: string): void {
    if (typeof obj[field] !== 'string' || (obj[field] as string).trim() === '') {
      throw new PluginManifestError(`Missing or invalid required field: ${field}`);
    }
  }

  private validateCommand(cmd: unknown, pluginId: string): void {
    if (!cmd || typeof cmd !== 'object') {
      throw new PluginManifestError('Command must be an object', pluginId);
    }

    const c = cmd as Record<string, unknown>;

    if (typeof c.name !== 'string' || c.name.trim() === '') {
      throw new PluginManifestError('Command name must be a non-empty string', pluginId);
    }

    if (!c.name.startsWith('/')) {
      throw new PluginManifestError('Command name must start with "/"', pluginId);
    }

    if (typeof c.description !== 'string' || c.description.trim() === '') {
      throw new PluginManifestError('Command description must be a non-empty string', pluginId);
    }

    if (c.alias !== undefined && typeof c.alias !== 'string') {
      throw new PluginManifestError('Command alias must be a string', pluginId);
    }
  }

  private validateConfigSchema(config: unknown, pluginId: string): void {
    if (!config || typeof config !== 'object') {
      throw new PluginManifestError('config must be an object', pluginId);
    }

    const c = config as Record<string, unknown>;

    if (!c.schema || typeof c.schema !== 'object') {
      throw new PluginManifestError('config.schema must be an object', pluginId);
    }

    const schema = c.schema as Record<string, unknown>;

    if (schema.type !== 'object') {
      throw new PluginManifestError('config.schema.type must be "object"', pluginId);
    }

    if (!schema.properties || typeof schema.properties !== 'object') {
      throw new PluginManifestError('config.schema.properties must be an object', pluginId);
    }

    const props = schema.properties as Record<string, unknown>;
    for (const [key, prop] of Object.entries(props)) {
      this.validateConfigProperty(key, prop, pluginId);
    }
  }

  private validateConfigProperty(key: string, prop: unknown, pluginId: string): void {
    if (!prop || typeof prop !== 'object') {
      throw new PluginManifestError(`config schema property "${key}" must be an object`, pluginId);
    }

    const p = prop as Record<string, unknown>;
    const validTypes = ['string', 'number', 'boolean', 'object', 'array'];

    if (!validTypes.includes(p.type as string)) {
      throw new PluginManifestError(
        `config schema property "${key}" must have type: ${validTypes.join(', ')}`,
        pluginId,
      );
    }

    if (p.enum !== undefined && !Array.isArray(p.enum)) {
      throw new PluginManifestError(
        `config schema property "${key}" enum must be an array`,
        pluginId,
      );
    }
  }
}
