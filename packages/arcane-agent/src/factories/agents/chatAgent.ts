/**
 * Chat Agent Factory
 */

import { logger } from '@arcane/logger';
import type { AgentInstance, Tool } from '../../types';
import { createAgent } from '../createAgent';

export interface ChatAgentConfig {
  name?: string;
  tools?: Tool[];
  hitl?: boolean;
}

export function createChatAgent(config: ChatAgentConfig = {}): AgentInstance {
  return createAgent({
    type: 'chat',
    name: config.name || 'ChatAssistant',
    tools: config.tools || [],
    hitl: config.hitl ? { enabled: true } : undefined,
  });
}
