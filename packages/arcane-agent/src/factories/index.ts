/**
 * Factories - Export factory functions
 */

import { logger } from '@arcane/logger';
export { logger };

export { createAgent } from './createAgent';
export { createCodeReviewAgent } from './agents/codeReviewAgent';
export { createTaskAutomationAgent } from './agents/taskAutomationAgent';
export { createChatAgent } from './agents/chatAgent';
export { createMultiAgent } from './agents/multiAgent';
export { ArcaneAgentFactory, type ArcaneAgentFactoryConfig } from './ArcaneAgentFactory';
