/**
 * Arcane Agent - Core Types
 * TypeScript interfaces untuk seluruh agent system
 */

// ============================================================================
// Core Agent Types
// ============================================================================

export interface AgentDefinition {
  name: string;
  description: string;
  tools: Tool[];
  node: AgentNodeFunction;
  events?: string[];
}

export type AgentNodeFunction = (state: AgentState) => Promise<AgentState>;

export interface AgentState {
  task: string;
  context: Record<string, unknown>;
  messages: Message[];
  currentAgent: string;
  channels: ChannelState;
  results: Record<string, unknown>;
  errors: ErrorInfo[];
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  execute: ToolFunction;
  metadata?: Record<string, unknown>;
}

export type ToolFunction = (input: unknown, ctx: ToolContext) => Promise<unknown>;

export interface ToolContext {
  agentId: string;
  sessionId: string;
  channels: ChannelBus;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}

export interface ChannelState {
  [channelName: string]: unknown[];
}

export interface ErrorInfo {
  node: string;
  error: string;
  timestamp: number;
}

// ============================================================================
// Human-in-the-Loop Types
// ============================================================================

export type ApprovalDecision = 'approve' | 'reject' | 'modify';

export interface ApprovalRequest {
  id: string;
  agent: string;
  action: string;
  description: string;
  context: Record<string, unknown>;
  createdAt: number;
  expiresAt?: number;
}

export interface ApprovalResponse {
  requestId: string;
  decision: ApprovalDecision;
  feedback?: string;
  modifiedParams?: Record<string, unknown>;
}

export type ApprovalHandler = (
  request: ApprovalRequest
) => Promise<ApprovalResponse>;

export interface HITLConfig {
  enabled: boolean;
  autoApprove?: boolean;
  approvalHandler?: ApprovalHandler;
  timeout?: number;
  promptFormatter?: (req: ApprovalRequest) => string;
}

// ============================================================================
// Factory Types
// ============================================================================

export type AgentType =
  | 'code-review'
  | 'task-automation'
  | 'chat'
  | 'multi-agent';

export interface AgentConfig {
  type: AgentType;
  name?: string;
  tools?: Tool[];
  llmProvider?: 'anthropic' | 'openai' | 'auto';
  persistence?: PersistenceConfig;
  streaming?: StreamingConfig;
  hitl?: HITLConfig;
  promptsDir?: string;
}

export interface AgentInstance {
  run(input: string, ctx?: Record<string, unknown>): Promise<AgentResult>;
  stream(input: string, ctx?: Record<string, unknown>): AsyncGenerator<StreamEvent>;
  getState(): AgentState;
  checkpoint(): Promise<string>;
  restore(path: string): Promise<void>;
  subscribe(channel: string, handler: EventHandler): void;
  unsubscribe(channel: string, handler: EventHandler): void;
  requestApproval(request: ApprovalRequest): Promise<ApprovalResponse>;
  getPendingApprovals(): ApprovalRequest[];
  setApprovalHandler(handler: ApprovalHandler): void;
  setLLMClient(client: unknown): void;
}

export interface AgentResult {
  success: boolean;
  output: unknown;
  state: AgentState;
  checkpoints: string[];
}

export interface PersistenceConfig {
  type: 'sqlite' | 'json';
  path: string;
  checkpointInterval?: number;
}

export interface StreamingConfig {
  events: StreamEventType[];
}

// ============================================================================
// Channel Types
// ============================================================================

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

export interface AgentEvent {
  type: string;
  agent: string;
  payload: unknown;
  timestamp: number;
}

export interface ChannelBus {
  subscribe(channel: string, handler: EventHandler): void;
  unsubscribe(channel: string, handler: EventHandler): void;
  publish(channel: string, event: AgentEvent): void;
  createAsyncIterator(channel: string): AsyncGenerator<AgentEvent>;
}

// ============================================================================
// Stream Event Types
// ============================================================================

export type StreamEventType =
  | 'start'
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'agent_handoff'
  | 'channel_publish'
  | 'error'
  | 'checkpoint'
  | 'complete'
  | 'progress'
  | 'approval_request'
  | 'approval_response'
  | 'waiting_input';

export type StreamEvent =
  | { type: 'start'; agent: string; task: string }
  | { type: 'thought'; agent: string; content: string }
  | { type: 'tool_call'; agent: string; tool: string; input: unknown }
  | { type: 'tool_result'; agent: string; tool: string; output: unknown }
  | { type: 'agent_handoff'; from: string; to: string; reason: string }
  | { type: 'channel_publish'; agent: string; channel: string; event: unknown }
  | { type: 'error'; agent: string; error: string; recoverable: boolean }
  | { type: 'checkpoint'; agent: string; path: string }
  | { type: 'complete'; result: unknown }
  | { type: 'progress'; agent: string; progress: number; message: string }
  | { type: 'approval_request'; agent: string; request: ApprovalRequest; message: string }
  | { type: 'approval_response'; agent: string; requestId: string; decision: ApprovalDecision }
  | { type: 'waiting_input'; agent: string; reason: string };

// ============================================================================
// Supervisor Types
// ============================================================================

export interface SupervisorConfig {
  llmClient: unknown;
  registry: AgentRegistry;
  channels: ChannelBus;
  hitl?: HITLConfig;
}

export interface AgentRegistry {
  register(agent: AgentDefinition): void;
  unregister(name: string): void;
  get(name: string): AgentDefinition | undefined;
  getAvailableAgents(): string[];
  getAgentTools(): Tool[];
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
  id: string;
  agentId: string;
  timestamp: number;
  state: AgentState;
  graphSnapshot: unknown;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  id: string;
  agentId: string;
  messages: Message[];
  state: AgentState;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface PluginAgentDefinition extends AgentDefinition {
  pluginName: string;
  version?: string;
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
