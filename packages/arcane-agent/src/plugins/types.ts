/**
 * Plugin types - Types untuk plugin agent system
 */

import { logger } from '@arcane/logger';
import type { AgentDefinition, Tool } from '../types';

export interface PluginAgentDefinition extends AgentDefinition {
  pluginName: string;
  version?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  agents: {
    name: string;
    description: string;
    events?: string[];
    tools?: string[];
  }[];
}

export interface ToolDecoratorConfig {
  name: string;
  description: string;
}

export interface AgentDecoratorConfig {
  name: string;
  description: string;
  events?: string[];
  tools?: Tool[];
}
