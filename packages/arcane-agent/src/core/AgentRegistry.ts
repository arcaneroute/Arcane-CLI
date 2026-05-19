/**
 * AgentRegistry - Global registry untuk tracking semua agents
 * Mendukung core agents dan plugin agents
 */

import { logger } from '@arcane/logger';
import type {
  AgentDefinition,
  AgentRegistry as AgentRegistryInterface,
  Tool,
} from '../types';

export class AgentRegistry implements AgentRegistryInterface {
  private agents: Map<string, AgentDefinition> = new Map();

  register(agent: AgentDefinition): void {
    if (this.agents.has(agent.name)) {
      logger.warn({ agent: agent.name }, `Agent '${agent.name}' is already registered. Overwriting.`);
    } else {
      logger.info({ agent: agent.name, toolsCount: agent.tools.length }, 'Registering new agent');
    }
    this.agents.set(agent.name, agent);
  }

  unregister(name: string): void {
    if (!this.agents.has(name)) {
      logger.warn({ name }, `Agent '${name}' is not registered.`);
      return;
    }
    logger.info({ agent: name }, 'Unregistering agent');
    this.agents.delete(name);
  }

  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  getAvailableAgents(): string[] {
    const agents = Array.from(this.agents.keys());
    logger.debug({ agents, count: agents.length }, 'Getting available agents');
    return agents;
  }

  getAgentTools(): Tool[] {
    const tools: Tool[] = [];
    for (const agent of this.agents.values()) {
      tools.push(...agent.tools);
    }
    logger.debug({ toolsCount: tools.length }, 'Getting agent tools');
    return tools;
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getByEvent(eventType: string): AgentDefinition[] {
    const result: AgentDefinition[] = [];
    for (const agent of this.agents.values()) {
      if (agent.events?.includes(eventType)) {
        result.push(agent);
      }
    }
    return result;
  }

  clear(): void {
    logger.info({ count: this.agents.size }, 'Clearing agent registry');
    this.agents.clear();
  }

  size(): number {
    return this.agents.size;
  }
}
