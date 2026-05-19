/*
 * arcane-route :: src/budget/BudgetLimiter.ts
 * Hard limits enforcer: token & turn budgets with warnings
 */

import type { ConfigManager } from '../core/ConfigManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import { BudgetExceededError } from '../types/errors.ts';
import type { BudgetConfig, BudgetStatus, BudgetSummary, TokenUsage } from '../types/index.ts';
import { CostTracker } from './CostTracker.ts';

/**
 * Enforces hard limits on token spend and turn count per session.
 * Emits EventBus events at warning threshold (80%) and on exhaustion.
 */
export class BudgetLimiter {
  private readonly config: BudgetConfig;
  private readonly costTracker: CostTracker;
  private turnCount = 0;
  private readonly startedAt: number;

  private constructor(
    config: BudgetConfig,
    costTracker: CostTracker,
    private readonly eventBus: EventBus,
  ) {
    this.config = config;
    this.costTracker = costTracker;
    this.startedAt = Date.now();
  }

  /**
   * Factory method — creates a BudgetLimiter from ConfigManager.
   * Reads default budget config and provider pricing; applies optional overrides
   * from CLI flags (--max-tokens, --max-turns).
   */
  public static fromOptions(
    config: ConfigManager,
    eventBus: EventBus,
    overrides?: Partial<BudgetConfig>,
  ): BudgetLimiter {
    const defaults = config.getDefaultBudgetConfig();
    const pricing = config.getProviderPricing();
    const provider = config.getProvider();

    const budgetConfig: BudgetConfig = {
      maxTokens: overrides?.maxTokens ?? defaults.maxTokens,
      maxTurns: overrides?.maxTurns ?? defaults.maxTurns,
      warnAtPercent: overrides?.warnAtPercent ?? defaults.warnAtPercent,
    };

    const tracker = new CostTracker(provider, pricing);
    return new BudgetLimiter(budgetConfig, tracker, eventBus);
  }

  /**
   * Record a completed turn's token usage and increment the turn counter.
   * Emits `budget:warning` when usage crosses the warn threshold,
   * or `budget:exceeded` when a hard limit is hit.
   */
  public recordTurn(usage: TokenUsage): void {
    this.costTracker.record(usage);
    this.turnCount++;

    const status = this.checkBudget();

    if (!status.ok) {
      this.eventBus.emit('budget:exceeded', {
        reason: status.reason ?? 'Budget exceeded',
      });
    } else if (status.warning) {
      this.eventBus.emit('budget:warning', {
        tokensPercent: status.tokensPercent,
        turnsPercent: status.turnsPercent,
      });
    }
  }

  /** Check the current budget status. */
  public checkBudget(): BudgetStatus {
    const totalTokens = this.costTracker.getTotalTokens();
    const tokensPercent = (totalTokens / this.config.maxTokens) * 100;
    const turnsPercent = (this.turnCount / this.config.maxTurns) * 100;
    const warning =
      tokensPercent >= this.config.warnAtPercent || turnsPercent >= this.config.warnAtPercent;

    if (totalTokens >= this.config.maxTokens) {
      return {
        ok: false,
        exhausted: true,
        reason: `Token budget exhausted: ${totalTokens.toLocaleString()}/${this.config.maxTokens.toLocaleString()} tokens. Use --max-tokens <n> to increase.`,
        tokensPercent: Math.min(tokensPercent, 100),
        turnsPercent,
        warning: true,
      };
    }

    if (this.turnCount >= this.config.maxTurns) {
      return {
        ok: false,
        exhausted: true,
        reason: `Turn limit reached: ${this.turnCount}/${this.config.maxTurns} turns. Use --max-turns <n> to increase.`,
        tokensPercent,
        turnsPercent: Math.min(turnsPercent, 100),
        warning: true,
      };
    }

    return { ok: true, tokensPercent, turnsPercent, warning, exhausted: false };
  }

  /** Returns true if budget is exhausted. */
  public isExceeded(): boolean {
    return !this.checkBudget().ok;
  }

  /** Remaining token budget. */
  public getRemainingTokens(): number {
    return Math.max(0, this.config.maxTokens - this.costTracker.getTotalTokens());
  }

  /** Remaining turn budget. */
  public getRemainingTurns(): number {
    return Math.max(0, this.config.maxTurns - this.turnCount);
  }

  /** Full budget summary snapshot. */
  public getSummary(): BudgetSummary {
    return {
      totalTokens: this.costTracker.getTotalTokens(),
      inputTokens: this.costTracker.getInputTokens(),
      outputTokens: this.costTracker.getOutputTokens(),
      turns: this.turnCount,
      maxTokens: this.config.maxTokens,
      maxTurns: this.config.maxTurns,
      elapsedMs: Date.now() - this.startedAt,
      estimatedCostUSD: this.costTracker.getEstimatedCostUSD(),
    };
  }

  /**
   * Format a visual budget bar for terminal display.
   * `renderer.progressBar` must accept (percent: number, width: number).
   */
  public formatBar(renderer: { progressBar: (p: number, w: number) => string }): string {
    const summary = this.getSummary();
    const tokPct = Math.min((summary.totalTokens / summary.maxTokens) * 100, 100);
    const turnPct = Math.min((summary.turns / summary.maxTurns) * 100, 100);

    return (
      `\x1b[90m[BUDGET]\x1b[0m ` +
      `${renderer.progressBar(tokPct, 16)} ` +
      `\x1b[96m${summary.totalTokens.toLocaleString()}\x1b[90m/${summary.maxTokens.toLocaleString()} tokens\x1b[0m · ` +
      `${renderer.progressBar(turnPct, 8)} ` +
      `\x1b[96m${summary.turns}\x1b[90m/${summary.maxTurns} turns\x1b[0m · ` +
      `\x1b[93m~${this.costTracker.formatCost()}\x1b[0m`
    );
  }

  /**
   * Throw `BudgetExceededError` if the session budget is exhausted.
   * Call this at the start of each API call to guard against overspend.
   */
  public assertNotExceeded(): void {
    const status = this.checkBudget();
    if (!status.ok && status.reason) {
      throw new BudgetExceededError(status.reason);
    }
  }

  /** Returns the underlying CostTracker for detailed token and cost queries. */
  public getCostTracker(): CostTracker {
    return this.costTracker;
  }
}
