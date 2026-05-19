/**
 * Plugin decorators - @registerAgent dan @registerTool decorators
 */

import { logger } from '@arcane/logger';
import type { AgentDefinition, Tool, ToolFunction, AgentState, AgentNodeFunction } from '../types';
import { AgentRegistry } from '../core/AgentRegistry';

let globalRegistry: AgentRegistry | null = null;

export const setGlobalRegistry = (registry: AgentRegistry): void => {
  logger.debug('Setting global registry');
  globalRegistry = registry;
};

export const getGlobalRegistry = (): AgentRegistry | null => {
  return globalRegistry;
};

function registerAgent(config: {
  name: string;
  description: string;
  events?: string[];
  tools?: Tool[];
}) {
  return function <T extends new (...args: unknown[]) => { execute: (state: AgentState) => AgentState }>(
    Target: T
  ): T {
    if (!globalRegistry) {
      logger.warn('No global registry set. Agent will not be registered.');
      return Target;
    }

    const instance = new Target();
    const node: AgentNodeFunction = async (state: AgentState) => {
      return instance.execute(state) as AgentState;
    };

    const agent: AgentDefinition = {
      name: config.name,
      description: config.description,
      events: config.events ?? [],
      tools: config.tools ?? [],
      node,
    };

    globalRegistry.register(agent);
    return Target;
  };
}

function registerTool(config: { name: string; description: string }) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const originalMethod = descriptor.value as ToolFunction;
    const tool: Tool = {
      name: config.name,
      description: config.description,
      execute: originalMethod,
    };

    if (!globalRegistry) {
      logger.warn('No global registry set. Tool will not be registered.');
      return;
    }

    const existingAgent = globalRegistry.get('PluginTools');
    if (existingAgent) {
      existingAgent.tools.push(tool);
    } else {
      globalRegistry.register({
        name: 'PluginTools',
        description: 'Aggregate agent for plugin tools',
        tools: [tool],
        node: async (state: AgentState) => state,
      });
    }
  };
}

export { registerAgent, registerTool };
