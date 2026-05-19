/*
 * arcane-route :: src/plugins/PluginManager.ts
 * Handles plugin lifecycle: install, uninstall, list, enable, disable
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PluginManifest, PluginRegistryEntry, PluginSource } from '../types/plugin.ts';
import { PluginError, PluginManifestError } from '../types/plugin.ts';
import { PluginRegistry } from './PluginRegistry.ts';
import { PluginValidator } from './PluginValidator.ts';

const PLUGIN_MANIFEST_FILENAME = 'plugin.manifest.json';

/**
 * Manages plugin lifecycle operations.
 * Handles install, uninstall, list, enable, disable operations.
 */
export class PluginManager {
  private readonly registry: PluginRegistry;
  private readonly validator: PluginValidator;
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.registry = PluginRegistry.getInstance(projectRoot);
    this.validator = new PluginValidator();
  }

  /**
   * Install a plugin from various sources.
   * Supported sources:
   * - npm: `arcane-plugin-foo`
   * - local path: `./my-plugin` or `/absolute/path`
   * - github: `github:username/repo`
   */
  public async install(source: string): Promise<void> {
    this.registry.load();

    const { id, version, installPath, manifest } = await this.resolveSource(source);

    if (this.registry.has(id)) {
      throw new PluginError(`Plugin already installed: ${id}`, id);
    }

    console.log(`Installing ${id}@${version}...`);

    // Validate manifest
    this.validator.validateManifestData(manifest);

    // For npm packages, install dependencies
    if (source.includes(':') && !source.startsWith('./') && !source.startsWith('/')) {
      await this.installNpmDeps(installPath);
    }

    // Register plugin
    this.registry.register(id, version, installPath, this.detectSource(source));
    console.log(`✓ ${id} installed successfully`);
  }

  /**
   * Uninstall a plugin by ID.
   */
  public async uninstall(pluginId: string): Promise<void> {
    this.registry.load();

    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginError(`Plugin not found: ${pluginId}`, pluginId);
    }

    // Call unload first if plugin is loaded
    // Note: This assumes PluginLoader is managed separately

    // Remove plugin directory
    if (existsSync(entry.path)) {
      rmSync(entry.path, { recursive: true, force: true });
    }

    // Unregister
    this.registry.unregister(pluginId);
    console.log(`✓ ${pluginId} uninstalled`);
  }

  /**
   * List all installed plugins.
   */
  public list(): PluginRegistryEntry[] {
    this.registry.load();
    return this.registry.getAll();
  }

  /**
   * Enable a disabled plugin.
   */
  public enable(pluginId: string): void {
    this.registry.load();

    if (!this.registry.has(pluginId)) {
      throw new PluginError(`Plugin not found: ${pluginId}`, pluginId);
    }

    this.registry.enable(pluginId);
    console.log(`✓ ${pluginId} enabled`);
  }

  /**
   * Disable a plugin without uninstalling.
   */
  public disable(pluginId: string): void {
    this.registry.load();

    if (!this.registry.has(pluginId)) {
      throw new PluginError(`Plugin not found: ${pluginId}`, pluginId);
    }

    this.registry.disable(pluginId);
    console.log(`✓ ${pluginId} disabled`);
  }

  /**
   * Get info about a specific plugin.
   */
  public info(pluginId: string): PluginRegistryEntry | undefined {
    this.registry.load();
    return this.registry.get(pluginId);
  }

  // -------------------------------------------------------------------------

  private async resolveSource(
    source: string,
  ): Promise<{ id: string; version: string; installPath: string; manifest: PluginManifest }> {
    const pluginsDir = this.registry.pluginsDir;

    // Local path
    if (source.startsWith('./') || source.startsWith('/')) {
      return this.resolveLocalSource(source, pluginsDir);
    }

    // GitHub source
    if (source.startsWith('github:')) {
      return this.resolveGitHubSource(source, pluginsDir);
    }

    // NPM package
    return this.resolveNpmSource(source, pluginsDir);
  }

  private async resolveLocalSource(
    source: string,
    pluginsDir: string,
  ): Promise<{ id: string; version: string; installPath: string; manifest: PluginManifest }> {
    const manifestPath = join(source, PLUGIN_MANIFEST_FILENAME);

    if (!existsSync(manifestPath)) {
      throw new PluginManifestError(`No plugin manifest found at: ${source}`);
    }

    const manifest = this.readManifest(manifestPath);
    const installPath = join(pluginsDir, manifest.id);

    // Copy plugin to plugins directory
    this.copyPlugin(source, installPath);

    return { id: manifest.id, version: manifest.version, installPath, manifest };
  }

  private async resolveGitHubSource(
    source: string,
    pluginsDir: string,
  ): Promise<{ id: string; version: string; installPath: string; manifest: PluginManifest }> {
    const repo = source.replace('github:', '');
    const tempDir = join(this.projectRoot, '.arcane', 'temp', repo.replace('/', '_'));

    console.log(`Cloning ${repo}...`);

    // Clone repository
    const cloneResult = spawnSync(
      'git',
      ['clone', `--depth=1`, `https://github.com/${repo}`, tempDir],
      {
        encoding: 'utf8',
      },
    );

    if (cloneResult.status !== 0) {
      throw new PluginError(`Failed to clone GitHub repository: ${repo}`);
    }

    const manifestPath = join(tempDir, PLUGIN_MANIFEST_FILENAME);
    if (!existsSync(manifestPath)) {
      throw new PluginManifestError(`No plugin manifest found in repository: ${repo}`);
    }

    const manifest = this.readManifest(manifestPath);
    const installPath = join(pluginsDir, manifest.id);

    // Copy plugin to plugins directory
    this.copyPlugin(tempDir, installPath);

    // Clean up temp
    rmSync(tempDir, { recursive: true, force: true });

    return { id: manifest.id, version: manifest.version, installPath, manifest };
  }

  private async resolveNpmSource(
    source: string,
    pluginsDir: string,
  ): Promise<{ id: string; version: string; installPath: string; manifest: PluginManifest }> {
    const tempDir = join(this.projectRoot, '.arcane', 'temp', source.replace('/', '_'));

    console.log(`Installing ${source} from npm...`);

    // Create temp directory
    mkdirSync(tempDir, { recursive: true });

    // Install npm package
    const installResult = spawnSync('bun', ['add', source], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    if (installResult.status !== 0) {
      throw new PluginError(`Failed to install npm package: ${source}\n${installResult.stderr}`);
    }

    // Find the installed package directory
    const packageJsonPath = join(tempDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new PluginError(`package.json not found after install: ${source}`);
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const manifestPath = join(tempDir, 'node_modules', packageJson.name, PLUGIN_MANIFEST_FILENAME);

    if (!existsSync(manifestPath)) {
      throw new PluginManifestError(`No plugin manifest found in npm package: ${source}`);
    }

    const manifest = this.readManifest(manifestPath);
    const installPath = join(pluginsDir, manifest.id);

    // Copy plugin to plugins directory (without node_modules for cleaner isolation)
    this.copyPlugin(join(tempDir, 'node_modules', packageJson.name), installPath);

    // Clean up temp
    rmSync(tempDir, { recursive: true, force: true });

    return { id: manifest.id, version: manifest.version, installPath, manifest };
  }

  private readManifest(manifestPath: string): PluginManifest {
    try {
      const content = readFileSync(manifestPath, 'utf8');
      return JSON.parse(content) as PluginManifest;
    } catch {
      throw new PluginManifestError(`Failed to read manifest: ${manifestPath}`);
    }
  }

  private copyPlugin(from: string, to: string): void {
    // Ensure destination directory exists
    mkdirSync(dirname(to), { recursive: true });

    // Use git archive if available, otherwise use cp
    const copyResult = spawnSync('cp', ['-r', from, to], { encoding: 'utf8' });

    if (copyResult.status !== 0) {
      throw new PluginError(`Failed to copy plugin: ${from} -> ${to}`);
    }
  }

  private async installNpmDeps(pluginPath: string): Promise<void> {
    console.log('Installing plugin dependencies...');

    const installResult = spawnSync('bun', ['install'], {
      cwd: pluginPath,
      encoding: 'utf8',
    });

    if (installResult.status !== 0) {
      console.warn(`Warning: Failed to install dependencies: ${installResult.stderr}`);
    }
  }

  private detectSource(source: string): PluginSource {
    if (source.startsWith('github:')) return 'github';
    if (source.startsWith('./') || source.startsWith('/')) return 'local';
    return 'npm';
  }
}
