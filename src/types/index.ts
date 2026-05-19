/*
 * arcane-route :: src/types/index.ts
 * All shared TypeScript interfaces and types
 */

// Provider Types
export type LLMProvider = 'anthropic' | 'openai' | 'arcane';
export type EffortLevel = 'high' | 'medium' | 'low';

// Message Types
export interface Message {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface ThinkingConfig {
  readonly type: 'adaptive' | 'disabled';
  readonly effort: EffortLevel;
  readonly budgetTokens: number;
}

// API Response Types
export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface ClaudeResponse {
  readonly thinking: string;
  readonly text: string;
  readonly usage: TokenUsage;
}

export interface SendMessageParams {
  readonly messages: Message[];
  readonly effort: EffortLevel;
  readonly systemPrompt?: string;
  readonly onThinkingDelta?: (text: string) => void;
  readonly onTextDelta?: (text: string) => void;
}

export interface CorrectionParams {
  readonly messages: Message[];
  readonly effort: EffortLevel;
  readonly failureSummary: string;
  readonly attemptsRemaining: number;
}

// Filesystem Types
export type FileActionType = 'CREATE' | 'MODIFY' | 'DELETE' | 'READ';

export interface FileAction {
  readonly type: FileActionType;
  readonly path: string;
  readonly rawBlock: string;
}

export interface SnapshotDiff {
  readonly added: readonly string[];
  readonly modified: readonly string[];
  readonly deleted: readonly string[];
  readonly unchanged: readonly string[];
}

export interface VerificationResult {
  readonly allVerified: boolean;
  readonly verified: readonly FileAction[];
  readonly failed: readonly FileAction[];
  readonly unmatched: readonly FileAction[];
}

// Memory Types
export interface MemoryEntryData {
  readonly timestamp: string;
  readonly sessionId: string;
  readonly effort: EffortLevel;
  readonly provider: LLMProvider;
  readonly actions: readonly FileAction[];
  readonly summary: string;
  readonly tokensUsed: number;
}

export interface MemoryStatus {
  readonly entryCount: number;
  readonly fileSizeBytes: number;
  readonly hasCompressedBlock: boolean;
  readonly needsDream: boolean;
}

// Budget Types
export interface BudgetConfig {
  readonly maxTokens: number;
  readonly maxTurns: number;
  readonly warnAtPercent: number;
}

export interface BudgetStatus {
  readonly ok: boolean;
  readonly tokensPercent: number;
  readonly turnsPercent: number;
  readonly warning: boolean;
  readonly exhausted: boolean;
  readonly reason?: string;
}

export interface BudgetSummary {
  readonly totalTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly turns: number;
  readonly maxTokens: number;
  readonly maxTurns: number;
  readonly elapsedMs: number;
  readonly estimatedCostUSD: number;
}

// Drift Types
export interface DriftReport {
  readonly verified: readonly string[];
  readonly drifted: readonly string[];
  readonly missing: readonly string[];
  readonly untracked: readonly string[];
}

// CLI Command Types
export interface ChatOptions {
  readonly effort: EffortLevel;
  readonly dryRun: boolean;
  readonly verbose: boolean;
  readonly maxTokens?: number;
  readonly maxTurns?: number;
}

export interface VerifyOptions {
  readonly fix: boolean;
  readonly json: boolean;
  readonly dryRun: boolean;
}

export interface DreamOptions {
  readonly force: boolean;
  readonly dryRun: boolean;
}

// EventBus Types
export type ArcaneEvent =
  | 'swd:verified'
  | 'swd:mismatch'
  | 'swd:correction_needed'
  | 'swd:yield_to_human'
  | 'memory:entry_added'
  | 'memory:compressed'
  | 'budget:warning'
  | 'budget:exceeded'
  | 'chat:turn_complete'
  | `plugin:${string}`;

// Pricing Types
export interface ProviderPricing {
  readonly costPerInputToken: number;
  readonly costPerOutputToken: number;
}
