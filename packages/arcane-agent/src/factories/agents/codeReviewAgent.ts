/**
 * Code Review Agent Factory
 */

import { logger } from '@arcane/logger';
import type { AgentInstance, Tool } from '../../types';
import { gitTools } from '../../tools/GitTools';
import { createAgent } from '../createAgent';

export interface CodeReviewAgentConfig {
  name?: string;
  tools?: Tool[];
  hitl?: boolean;
}

export function createCodeReviewAgent(config: CodeReviewAgentConfig = {}): AgentInstance {
  return createAgent({
    type: 'code-review',
    name: config.name || 'PR-Reviewer',
    tools: [...gitTools, ...(config.tools || [])],
    hitl: config.hitl ? { enabled: true } : undefined,
  });
}
