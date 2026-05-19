/*
 * arcane-route :: src/budget/CostTracker.ts
 * Provider-aware real-time cost calculator
 */

import type { LLMProvider, ProviderPricing, TokenUsage } from '../types/index.ts';

/**
 * Tracks cumulative token usage and calculates estimated USD cost.
 * Provider-aware: uses different pricing for Anthropic vs OpenAI.
 */
export class CostTracker {
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(
    private readonly provider: LLMProvider,
    private readonly pricing: ProviderPricing,
  ) {}

  /** Record token usage from an API response. */
  public record(usage: TokenUsage): void {
    this.totalInputTokens += usage.inputTokens;
    this.totalOutputTokens += usage.outputTokens;
  }

  /** Total tokens consumed (input + output). */
  public getTotalTokens(): number {
    return this.totalInputTokens + this.totalOutputTokens;
  }

  /** Total input tokens consumed. */
  public getInputTokens(): number {
    return this.totalInputTokens;
  }

  /** Total output tokens consumed. */
  public getOutputTokens(): number {
    return this.totalOutputTokens;
  }

  /** Estimated cost in USD based on provider pricing. */
  public getEstimatedCostUSD(): number {
    return (
      this.totalInputTokens * this.pricing.costPerInputToken +
      this.totalOutputTokens * this.pricing.costPerOutputToken
    );
  }

  /** Format cost as a currency string. */
  public formatCost(): string {
    return `$${this.getEstimatedCostUSD().toFixed(4)}`;
  }

  /**
   * Format a one-line token usage summary for terminal display.
   * Output contains ANSI color codes and is intended for direct console output.
   */
  public formatUsageLine(): string {
    const total = this.getTotalTokens();
    return (
      `\x1b[90mtokens: \x1b[96m${this.totalInputTokens.toLocaleString()}\x1b[90m in · ` +
      `\x1b[96m${this.totalOutputTokens.toLocaleString()}\x1b[90m out · ` +
      `\x1b[93m${total.toLocaleString()}\x1b[90m total · ` +
      `\x1b[93m${this.formatCost()}\x1b[0m`
    );
  }

  /** Returns the active LLM provider name (used to select pricing). */
  public getProvider(): LLMProvider {
    return this.provider;
  }

  /** Reset all cumulative token counters to zero. Useful between sessions. */
  public reset(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }
}
