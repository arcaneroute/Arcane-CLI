/**
 * Arcane Agent - Public API
 *
 * LangGraph-based agent system untuk:
 * - Code review/verification
 * - Task automation
 * - Chat assistant
 * - Multi-agent orchestration
 * - Plugin-based agent extension
 * - Human-in-the-loop approval
 */

import { logger } from '@arcane/logger';
export { logger };

// ============================================================================
// Types
// ============================================================================

export type {
  AgentDefinition,
  AgentState,
  AgentNodeFunction,
  Tool,
  ToolFunction,
  ToolContext,
  Message,
  ChannelState,
  ErrorInfo,
  ApprovalDecision,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalHandler,
  HITLConfig,
  AgentType,
  AgentConfig,
  AgentInstance,
  AgentResult,
  PersistenceConfig,
  StreamingConfig,
  EventHandler,
  AgentEvent,
  StreamEvent,
  StreamEventType,
  SupervisorConfig,
  Checkpoint,
  Session,
  PluginAgentDefinition,
} from './types';

// ============================================================================
// Core
// ============================================================================

export { ChannelBus } from './core/ChannelBus';
export { AgentRegistry } from './core/AgentRegistry';
export { AgentSupervisor } from './core/AgentSupervisor';
export { PromptManager } from './core/PromptManager';
export { HumanInteractionManager } from './core/HumanInteractionManager';
export { GraphCompiler } from './core/GraphCompiler';

// ============================================================================
// HITL
// ============================================================================

export { ApprovalQueue } from './hitl/ApprovalQueue';
export { UserPrompt } from './hitl/UserPrompt';
export { DecisionHandler } from './hitl/DecisionHandler';

// ============================================================================
// Agents
// ============================================================================

export { FileAgent } from './agents/FileAgent';
export { CodeAgent } from './agents/CodeAgent';
export { ReviewAgent } from './agents/ReviewAgent';
export { ChatAgent } from './agents/ChatAgent';

// ============================================================================
// Tools
// ============================================================================

export { fileTools, shellTools, gitTools, searchTools, webTools, standardTools } from './tools';

// ============================================================================
// Plugins
// ============================================================================

export { registerAgent, registerTool, setGlobalRegistry, getGlobalRegistry } from './plugins/decorators';
export { PluginLoader } from './plugins/PluginLoader';

// ============================================================================
// Persistence
// ============================================================================

export { CheckpointManager } from './persistence/CheckpointManager';
export { SessionStore } from './persistence/SessionStore';
export { MemoryStore } from './persistence/MemoryStore';

// ============================================================================
// Streaming
// ============================================================================

export { EventStream, createEventStream } from './streaming/EventStream';
export { ConsoleFormatter, JsonFormatter } from './streaming/Formatters';

// ============================================================================
// Factories
// ============================================================================

export { createAgent } from './factories/createAgent';
export { createCodeReviewAgent } from './factories/agents/codeReviewAgent';
export { createTaskAutomationAgent } from './factories/agents/taskAutomationAgent';
export { createChatAgent } from './factories/agents/chatAgent';
export { createMultiAgent } from './factories/agents/multiAgent';
export { ArcaneAgentFactory } from './factories/ArcaneAgentFactory';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
