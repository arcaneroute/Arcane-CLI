// ─────────────────────────────────────────────────────────────
//  arcane-route :: test/unit/BudgetLimiter.test.ts
//  Unit tests for BudgetLimiter token and turn enforcement
// ─────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'bun:test';
import { BudgetLimiter } from '../../src/budget/BudgetLimiter.ts';
import { ConfigManager } from '../../src/core/ConfigManager.ts';
import { EventBus } from '../../src/core/EventBus.ts';
import { BudgetExceededError } from '../../src/types/errors.ts';

describe('BudgetLimiter', () => {
  let limiter: BudgetLimiter;

  beforeEach(() => {
    ConfigManager._reset();
    EventBus._reset();

    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const config = ConfigManager.getInstance();
    limiter = BudgetLimiter.fromOptions(config, EventBus.getInstance(), {
      maxTokens: 1000,
      maxTurns: 5,
      warnAtPercent: 80,
    });
  });

  it('starts with ok status', () => {
    const status = limiter.checkBudget();
    expect(status.ok).toBe(true);
    expect(status.exhausted).toBe(false);
    expect(status.warning).toBe(false);
  });

  it('tracks token usage', () => {
    limiter.recordTurn({ inputTokens: 100, outputTokens: 200 });
    const summary = limiter.getSummary();
    expect(summary.totalTokens).toBe(300);
    expect(summary.turns).toBe(1);
  });

  it('triggers warning at 80%', () => {
    limiter.recordTurn({ inputTokens: 400, outputTokens: 400 }); // 800/1000 = 80%
    const status = limiter.checkBudget();
    expect(status.warning).toBe(true);
    expect(status.ok).toBe(true); // still ok, just warning
  });

  it('exhausts on token limit exceeded', () => {
    limiter.recordTurn({ inputTokens: 600, outputTokens: 500 }); // 1100/1000
    const status = limiter.checkBudget();
    expect(status.ok).toBe(false);
    expect(status.exhausted).toBe(true);
  });

  it('exhausts on turn limit reached', () => {
    for (let i = 0; i < 5; i++) {
      limiter.recordTurn({ inputTokens: 10, outputTokens: 10 });
    }
    const status = limiter.checkBudget();
    expect(status.ok).toBe(false);
    expect(status.exhausted).toBe(true);
  });

  it('assertNotExceeded throws when budget exhausted', () => {
    limiter.recordTurn({ inputTokens: 600, outputTokens: 500 });
    expect(() => limiter.assertNotExceeded()).toThrow(BudgetExceededError);
  });

  it('calculates remaining tokens correctly', () => {
    limiter.recordTurn({ inputTokens: 300, outputTokens: 200 });
    expect(limiter.getRemainingTokens()).toBe(500);
  });

  it('calculates remaining turns correctly', () => {
    limiter.recordTurn({ inputTokens: 10, outputTokens: 10 });
    limiter.recordTurn({ inputTokens: 10, outputTokens: 10 });
    expect(limiter.getRemainingTurns()).toBe(3);
  });
});
