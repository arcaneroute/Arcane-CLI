// Re-export FileAction and ArcaneEventMap from events/types
export type {
  FileAction as EventFileAction,
  ArcaneEventMap,
} from '../events/types';

// Keep existing types inline
export type AppStatus = "idle" | "running" | "streaming" | "verifying" | "writing" | "complete" | "error";
export type TUIMode = "chat" | "verify" | "dream" | "idle";

export interface BudgetSummary {
  totalTokens: number;
  maxTokens: number;
  estimatedCostUSD: number;
  turns: number;
  maxTurns: number;
}

export interface MemoryStatus {
  entryCount: number;
  sizeKb: number;
  status: "normal" | "warning" | "critical";
}

export interface SWDStatus {
  status: "idle" | "ready" | "busy" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  fileActions?: FileAction[];
}

export interface FileAction {
  type: "CREATE" | "MODIFY" | "DELETE";
  path: string;
}

export interface DriftReport {
  driftCount: number;
  summary: string;
}

export interface DreamProgressState {
  phase: "analyzing" | "compressing" | "writing" | "complete";
  progress?: number;
  entryCountBefore?: number;
  entryCountAfter?: number;
  reductionPercent?: number;
}