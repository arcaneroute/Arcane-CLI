/**
 * Multi-Agent Orchestration Factory
 */

import { logger } from '@arcane/logger';
import type { AgentInstance } from '../../types';
import { createAgent } from '../createAgent';

export interface MultiAgentConfig {
  name?: string;
  subAgents?: AgentInstance[];
  hitl?: boolean;
}

export function createMultiAgent(config: MultiAgentConfig = {}): AgentInstance {
  return createAgent({
    type: 'multi-agent',
    name: config.name || 'Orchestrator',
    hitl: config.hitl ? { enabled: true } : undefined,
  });
}
