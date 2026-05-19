// ─────────────────────────────────────────────────────────────
//  arcane-route :: test/unit/MemoryManager.test.ts
//  Unit tests for MemoryManager ARCANE_MEMORY.md operations
// ─────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryEntry } from '../../src/memory/MemoryEntry.ts';
import { MemoryManager } from '../../src/memory/MemoryManager.ts';
import type { BudgetConfig, ProviderPricing } from '../../src/types/index.ts';

// ── Stub ConfigManager for test isolation ────────────────────
const TEST_MEMORY_FILE = `.test-memory-${Date.now()}.md`;

function makeStubConfig(): ConstructorParameters<typeof MemoryManager>[0] {
  return {
    getMemoryFilePath: () => TEST_MEMORY_FILE,
    getMemoryDreamThreshold: () => 100,
    getProvider: () => 'anthropic',
    getAnthropicApiKey: () => 'sk-ant-test',
    getAnthropicModel: () => 'claude-opus-4-6',
    getAnthropicBaseUrl: () => undefined,
    getAnthropicLowEffortModel: () => 'claude-haiku-3-5',
    getOpenAIApiKey: () => 'sk-test',
    getOpenAIBaseUrl: () => 'https://api.openai.com/v1',
    getOpenAIModel: () => 'gpt-4o',
    getSystemPrompt: () => 'test prompt',
    getDefaultBudgetConfig: () =>
      ({ maxTokens: 100_000, maxTurns: 50, warnAtPercent: 80 }) as BudgetConfig,
    getProviderPricing: () => ({ costPerInputToken: 0, costPerOutputToken: 0 }) as ProviderPricing,
    getIgnorePatterns: () => [],
    getMaxCorrectionRetries: () => 2,
    get: (_key: string) => '',
    validate: () => {},
  } as unknown as ConstructorParameters<typeof MemoryManager>[0];
}

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager(makeStubConfig());
  });

  afterEach(() => {
    const path = resolve(process.cwd(), TEST_MEMORY_FILE);
    if (existsSync(path)) unlinkSync(path);
  });

  it('initializes with empty entries', async () => {
    await manager.load();
    const count = await manager.countEntries();
    expect(count).toBe(0);
  });

  it('adds and retrieves entries', async () => {
    await manager.load();

    const entry = new MemoryEntry({
      sessionId: 'test-session',
      effort: 'high',
      provider: 'anthropic',
      actions: [{ type: 'CREATE', path: 'src/test.ts', rawBlock: '' }],
      summary: 'Created test file',
      tokensUsed: 100,
    });

    await manager.addEntry(entry);
    const entries = await manager.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.summary).toBe('Created test file');
    expect(entries[0]?.provider).toBe('anthropic');
  });

  it('returns recent entries correctly', async () => {
    await manager.load();

    for (let i = 0; i < 5; i++) {
      await manager.addEntry(
        new MemoryEntry({
          sessionId: 'test',
          effort: 'low',
          provider: 'openai',
          actions: [],
          summary: `Entry ${i}`,
          tokensUsed: 10 * i,
        }),
      );
    }

    const recent = await manager.getRecentEntries(3);
    expect(recent).toHaveLength(3);
    expect(recent[2]?.summary).toBe('Entry 4');
  });

  it('getStatus returns correct metadata', async () => {
    await manager.load();
    const status = await manager.getStatus();
    expect(status.entryCount).toBe(0);
    expect(status.needsDream).toBe(false);
  });
});
