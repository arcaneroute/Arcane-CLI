// ─────────────────────────────────────────────────────────────
//  arcane-route :: test/integration/chat.test.ts
//  Integration test: ArcaneAgentProvider
// ─────────────────────────────────────────────────────────────

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { ArcaneAgentProvider } from '../../src/ai/providers/ArcaneAgentProvider.ts';
import { ConfigManager } from '../../src/core/ConfigManager.ts';
import { ApiKeyMissingError } from '../../src/types/errors.ts';

describe('ArcaneAgentProvider', () => {
  beforeEach(() => {
    ConfigManager._reset();
  });

  afterEach(() => {
    ConfigManager._reset();
  });

  it('creates provider for LLM_PROVIDER=arcane with anthropic underlying', async () => {
    process.env.LLM_PROVIDER = 'arcane';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    delete process.env.ARCANE_LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;

    const config = ConfigManager.getInstance();
    const provider = await ArcaneAgentProvider.create(config);

    expect(provider.getProviderName()).toBe('anthropic');
    expect(provider.supportsThinking()).toBe(true);
  });

  it('creates provider for LLM_PROVIDER=arcane with openai underlying', async () => {
    process.env.LLM_PROVIDER = 'arcane';
    process.env.ARCANE_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test-key';

    const config = ConfigManager.getInstance();
    const provider = await ArcaneAgentProvider.create(config);

    expect(provider.getProviderName()).toBe('openai');
    expect(provider.supportsThinking()).toBe(false);
  });

  it('defaults underlying provider to anthropic', async () => {
    process.env.LLM_PROVIDER = 'arcane';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    delete process.env.ARCANE_LLM_PROVIDER;

    const config = ConfigManager.getInstance();
    const provider = await ArcaneAgentProvider.create(config);

    expect(provider.getProviderName()).toBe('anthropic');
  });
});

describe('ConfigManager provider detection', () => {
  beforeEach(() => {
    ConfigManager._reset();
  });

  afterEach(() => {
    ConfigManager._reset();
  });

  it('defaults to anthropic when LLM_PROVIDER not set', () => {
    delete process.env.LLM_PROVIDER;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    const config = ConfigManager.getInstance();
    expect(config.getProvider()).toBe('anthropic');
  });

  it('recognizes arcane as valid provider', () => {
    process.env.LLM_PROVIDER = 'arcane';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    const config = ConfigManager.getInstance();
    expect(config.getProvider()).toBe('arcane');
  });

  it('throws ApiKeyMissingError when anthropic key missing for arcane', () => {
    process.env.LLM_PROVIDER = 'arcane';
    delete process.env.ANTHROPIC_API_KEY;

    const config = ConfigManager.getInstance();
    expect(() => config.validate()).toThrow(ApiKeyMissingError);
  });
});
