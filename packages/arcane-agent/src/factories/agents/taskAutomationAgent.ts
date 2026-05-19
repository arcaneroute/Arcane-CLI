/**
 * Task Automation Agent Factory
 */

import { logger } from '@arcane/logger';
import type { AgentInstance, Tool } from '../../types';
import { standardTools } from '../../tools';
import { createAgent } from '../createAgent';

export interface TaskAutomationAgentConfig {
  name?: string;
  tools?: Tool[];
  hitl?: boolean;
}

export function createTaskAutomationAgent(
  config: TaskAutomationAgentConfig = {}
): AgentInstance {
  return createAgent({
    type: 'task-automation',
    name: config.name || 'TaskAutomator',
    tools: [...standardTools, ...(config.tools || [])],
    hitl: config.hitl ? { enabled: true } : undefined,
  });
}
