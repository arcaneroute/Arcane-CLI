/**
 * PluginLoader - Auto-discovery mechanism untuk plugin agents
 */

import { Glob } from 'bun';
import { logger } from '@arcane/logger';
import type { AgentDefinition } from '../types';
import { AgentRegistry } from '../core/AgentRegistry';
import { setGlobalRegistry } from './decorators';

export interface PluginLoaderConfig {
  pluginDirs: string[];
  registry: AgentRegistry;
  autoRegister?: boolean;
}

export class PluginLoader {
  private pluginDirs: string[];
  private registry: AgentRegistry;
  private autoRegister: boolean;
  private loadedModules: Set<string> = new Set();

  constructor(config: PluginLoaderConfig) {
    this.pluginDirs = config.pluginDirs;
    this.registry = config.registry;
    this.autoRegister = config.autoRegister ?? true;

    setGlobalRegistry(this.registry);
    logger.debug({ pluginDirs: this.pluginDirs, autoRegister: this.autoRegister }, 'PluginLoader initialized');
  }

  async discover(): Promise<AgentDefinition[]> {
    logger.info({ pluginDirs: this.pluginDirs }, 'Discovering plugins');
    const discovered: AgentDefinition[] = [];

    for (const dir of this.pluginDirs) {
      const agents = await this.discoverInDir(dir);
      discovered.push(...agents);
    }

    logger.info({ discoveredCount: discovered.length }, 'Plugin discovery completed');
    return discovered;
  }

  private async discoverInDir(dir: string): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];

    try {
      const glob = new Glob('**/*.ts');
      const files: string[] = [];
      for await (const file of glob.scan({ cwd: dir })) {
        files.push(file);
      }

      for (const file of files) {
        const absolutePath = `${dir}/${file}`;
        if (this.loadedModules.has(absolutePath)) continue;
        if (absolutePath.includes('node_modules')) continue;

        try {
          await this.loadModule(absolutePath);
          this.loadedModules.add(absolutePath);
        } catch (error) {
          logger.warn({ path: absolutePath, error: String(error) }, `Failed to load plugin module ${absolutePath}`);
        }
      }
    } catch (error) {
      logger.warn({ dir, error: String(error) }, `Failed to scan directory ${dir}`);
    }

    for (const agent of this.registry.getAll()) {
      if (!this.isBuiltInAgent(agent.name)) {
        agents.push(agent);
      }
    }

    return agents;
  }

  private async loadModule(file: string): Promise<void> {
    const module = await import(file);
    for (const key of Object.keys(module)) {
      if (this.isAgentClass(module[key])) {
      }
    }
  }

  private isAgentClass(obj: unknown): boolean {
    if (typeof obj !== 'function') return false;
    const str = obj.toString();
    return (
      str.includes('execute') ||
      str.includes('node') ||
      str.includes('Agent')
    );
  }

  private isBuiltInAgent(name: string): boolean {
    const builtInAgents = [
      'FileAgent',
      'CodeAgent',
      'ReviewAgent',
      'ChatAgent',
      'PluginTools',
    ];
    return builtInAgents.includes(name);
  }

  async scanForDecorators(dir: string): Promise<string[]> {
    const files: string[] = [];
    const glob = new Glob('**/*.ts');

    for await (const file of glob.scan({ cwd: dir })) {
      if (file.includes('node_modules')) continue;
      const fullPath = `${dir}/${file}`;
      try {
        const content = await Bun.file(fullPath).text();
        if (content.includes('registerAgent') || content.includes('@registerTool')) {
          files.push(fullPath);
        }
      } catch {
      }
    }

    return files;
  }

  getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }
}
