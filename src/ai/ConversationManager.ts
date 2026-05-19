/*
 * arcane-route :: src/ai/ConversationManager.ts
 * Multi-turn message history — provider-agnostic
 */

import type { Message } from '../types/index.ts';

/** Maximum number of messages to retain before pruning oldest pairs. */
const MAX_HISTORY_MESSAGES = 100;

/**
 * Manages the multi-turn conversation history for a chat session.
 * Provider-agnostic — stores only Message[] structures.
 */
export class ConversationManager {
  private messages: Message[] = [];

  /** Add a user message to history. */
  public addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
    this.pruneIfNeeded();
  }

  /** Add an assistant message to history. */
  public addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
    this.pruneIfNeeded();
  }

  /**
   * Inject memory context at the beginning of the conversation.
   * This simulates "restoring memory" from ARCANE_MEMORY.md at session start.
   */
  public injectMemoryContext(context: string): void {
    if (!context.trim()) return;

    // Only inject if history is empty (start of session)
    if (this.messages.length === 0) {
      this.messages.push({
        role: 'user',
        content: `[CONTEXT: RECENT ARCANE MEMORY]\n${context}`,
      });
      this.messages.push({
        role: 'assistant',
        content: 'Acknowledged. I have restored context from ARCANE_MEMORY.md.',
      });
    }
  }

  /** Get the full message history. */
  public getHistory(): readonly Message[] {
    return this.messages;
  }

  /**
   * Clear all conversation history.
   * Memory (ARCANE_MEMORY.md) is NOT cleared — only the in-session context.
   */
  public clear(): void {
    this.messages = [];
  }

  /** Returns the number of messages in history. */
  public get length(): number {
    return this.messages.length;
  }

  /**
   * Rough token estimate for the current history (4 chars per token).
   * Used for budget display and memory injection decisions.
   */
  public getTokenEstimate(): number {
    const totalChars = this.messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Serialize the conversation for ARCANE_MEMORY.md summary logging.
   * Each message is truncated to 80 characters to keep entries compact.
   */
  public serialize(): string {
    return this.messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content.slice(0, 80)}...`)
      .join('\n');
  }

  // Pruning

  /**
   * Prune the oldest user+assistant pairs when history exceeds MAX_HISTORY_MESSAGES.
   * Always keeps the first 2 messages (memory context injection) and the
   * most recent (MAX_HISTORY_MESSAGES - 2) messages.
   */
  private pruneIfNeeded(): void {
    if (this.messages.length <= MAX_HISTORY_MESSAGES) return;

    // Keep first 2 messages (memory context) + most recent messages
    const kept = [
      ...this.messages.slice(0, 2),
      ...this.messages.slice(-(MAX_HISTORY_MESSAGES - 2)),
    ];
    this.messages = kept;
  }
}
