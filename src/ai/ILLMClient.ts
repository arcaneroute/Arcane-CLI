/*
 * arcane-route :: src/ai/ILLMClient.ts
 * Provider-agnostic interface for all LLM clients
 */

import type {
  ClaudeResponse,
  CorrectionParams,
  LLMProvider,
  SendMessageParams,
} from '../types/index.ts';

/**
 * Common interface that every LLM provider must implement.
 * Commands depend only on this interface — never on concrete providers.
 */
export interface ILLMClient {
  /**
   * Send a multi-turn streaming message.
   * Calls `onThinkingDelta` and `onTextDelta` during streaming.
   */
  sendMessage(params: SendMessageParams): Promise<ClaudeResponse>;

  /**
   * Send a non-streaming correction turn after SWD verification fails.
   * Injects the failure context and attempts remaining into the message.
   */
  sendCorrectionTurn(params: CorrectionParams): Promise<ClaudeResponse>;

  /**
   * Send a low-effort, non-streaming message for operations like
   * memory compression (dream). Uses a cheaper/faster model.
   */
  sendLowEffortMessage(params: SendMessageParams): Promise<ClaudeResponse>;

  /** Returns the provider identifier. */
  getProviderName(): LLMProvider;

  /**
   * Returns true if the provider supports extended thinking tokens.
   * Only Anthropic currently supports this feature.
   */
  supportsThinking(): boolean;
}
