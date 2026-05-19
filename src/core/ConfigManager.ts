/*
 * arcane-route :: src/core/ConfigManager.ts
 * Singleton config — reads env vars, validates, provides constants
 */

import { ApiKeyMissingError, ConfigInvalidError, UnknownProviderError } from '../types/errors.ts';
import type { BudgetConfig, LLMProvider, ProviderPricing } from '../types/index.ts';

// SWD System Prompt
const SWD_SYSTEM_PROMPT = `\
You are Arcane, a precise and disciplined AI coding assistant operating under the Strict Write Discipline (SWD) protocol.

CORE RULE: Every file operation you perform MUST be wrapped in a FILE_ACTION block.

FORMAT:
[FILE_ACTION]
type: CREATE | MODIFY | DELETE
path: relative/path/to/file
[/FILE_ACTION]

RULES:
1. Never claim to have written a file without a FILE_ACTION block.
2. Never hallucinate filesystem state. Only report what you actually did.
3. If you cannot complete a file operation, say so explicitly.
4. All paths must be relative to the working directory.
5. One FILE_ACTION block per file operation.

DISCIPLINE: Your claims will be verified against the real filesystem using SHA-256 hashes. Discrepancies will trigger a Correction Turn. You have 2 correction attempts before yielding to the human.
`;

// Anthropic Pricing (Claude Opus 4, USD per token)
// Update these values if you switch models in ANTHROPIC_MODEL.
const ANTHROPIC_PRICING: ProviderPricing = {
  costPerInputToken: 15 / 1_000_000, // $15.00 / 1M input tokens
  costPerOutputToken: 75 / 1_000_000, // $75.00 / 1M output tokens
};

// OpenAI Pricing (GPT-4o, USD per token)
const OPENAI_PRICING: ProviderPricing = {
  costPerInputToken: 5 / 1_000_000, // $5.00 / 1M input tokens
  costPerOutputToken: 15 / 1_000_000, // $15.00 / 1M output tokens
};

// Default Budget
const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxTokens: 100_000,
  maxTurns: 50,
  warnAtPercent: 80,
};

// Default Ignore Patterns
const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  'node_modules',
  'dist',
  '.git',
  '*.log',
  'bun.lock',
  'bun.lockb',
  'ARCANE_MEMORY.md',
  'coverage',
  '.env',
  'ref',
];

/** Singleton configuration manager. Reads from process.env on first access. */
export class ConfigManager {
  private static _instance: ConfigManager | null = null;

  private constructor() {}

  /** Returns the singleton instance, creating it if needed. */
  public static getInstance(): ConfigManager {
    ConfigManager._instance ??= new ConfigManager();
    return ConfigManager._instance;
  }

  /** @internal Reset singleton — for unit testing only. Do NOT call in production code. */
  public static _reset(): void {
    ConfigManager._instance = null;
  }

  /**
   * Raw env var getter. Returns `defaultValue` (or empty string) when the
   * variable is unset. Prefer the typed getters below over calling this directly.
   */
  public get(key: string, defaultValue?: string): string {
    return process.env[key] ?? defaultValue ?? '';
  }

  // Provider

  /** Returns the active LLM provider. Defaults to 'anthropic' if not set. */
  public getProvider(): LLMProvider {
    const raw = this.get('LLM_PROVIDER', 'anthropic').toLowerCase().trim();
    if (raw === 'anthropic' || raw === 'openai' || raw === 'arcane') return raw;
    throw new UnknownProviderError(raw);
  }

  // Anthropic Config

  /** Validates and returns the Anthropic API key. Throws if missing. */
  public getAnthropicApiKey(): string {
    const key = this.get('ANTHROPIC_API_KEY').trim();
    if (!key) throw new ApiKeyMissingError('anthropic');
    return key;
  }

  /** Returns the Anthropic base URL (for custom proxies). */
  public getAnthropicBaseUrl(): string | undefined {
    const url = this.get('ANTHROPIC_BASE_URL').trim();
    return url || undefined;
  }

  /** Returns the Anthropic model name. */
  public getAnthropicModel(): string {
    return this.get('ANTHROPIC_MODEL', 'claude-opus-4-6').trim();
  }

  /**
   * Returns the low-effort Anthropic model used for dream compression.
   * Hardcoded to `claude-haiku-3-5` — not user-configurable.
   */
  public getAnthropicLowEffortModel(): string {
    return 'claude-haiku-3-5';
  }

  // OpenAI Config

  /** Validates and returns the OpenAI API key. Throws if missing. */
  public getOpenAIApiKey(): string {
    const key = this.get('OPENAI_API_KEY').trim();
    if (!key) throw new ApiKeyMissingError('openai');
    return key;
  }

  /** Returns the OpenAI base URL (for Groq, Together, local LLMs, etc.). */
  public getOpenAIBaseUrl(): string {
    return this.get('OPENAI_BASE_URL').trim() || 'https://api.openai.com/v1';
  }

  /** Returns the OpenAI model name. */
  public getOpenAIModel(): string {
    return this.get('OPENAI_MODEL', 'gpt-4o').trim();
  }

  // Shared Config

  /** Returns the SWD system prompt injected into every session. */
  public getSystemPrompt(): string {
    return SWD_SYSTEM_PROMPT;
  }

  /** Returns the default budget configuration. */
  public getDefaultBudgetConfig(): BudgetConfig {
    return DEFAULT_BUDGET_CONFIG;
  }

  /** Returns the pricing for the current provider. */
  public getProviderPricing(): ProviderPricing {
    const provider = this.getProvider();
    if (provider === 'anthropic') return ANTHROPIC_PRICING;
    if (provider === 'openai') return OPENAI_PRICING;
    return ANTHROPIC_PRICING; // arcane uses anthropic under the hood
  }

  /** Returns the list of default ignore patterns for SWD scans. */
  public getIgnorePatterns(): readonly string[] {
    return DEFAULT_IGNORE_PATTERNS;
  }

  /**
   * Returns the maximum number of SWD correction attempts before
   * the engine yields to the human operator.
   */
  public getMaxCorrectionRetries(): number {
    return 2;
  }

  /** Returns the memory entry threshold that triggers dream compression. */
  public getMemoryDreamThreshold(): number {
    return 100;
  }

  /** Returns the path to ARCANE_MEMORY.md relative to cwd. */
  public getMemoryFilePath(): string {
    return 'ARCANE_MEMORY.md';
  }

  /**
   * Validate all required env vars for the current provider.
   * Called by commands before making API requests.
   * @throws {ApiKeyMissingError} if the relevant API key is absent.
   * @throws {UnknownProviderError} if LLM_PROVIDER is invalid.
   */
  public validate(): void {
    const provider = this.getProvider();
    if (provider === 'anthropic' || provider === 'arcane') {
      this.getAnthropicApiKey();
    } else {
      this.getOpenAIApiKey();
    }
  }

  /**
   * Returns the underlying LLM provider that arcane-agent uses internally.
   * For 'arcane' provider, returns 'anthropic' by default.
   */
  public getArcaneUnderlyingProvider(): 'anthropic' | 'openai' {
    const provider = this.get('ARCANE_LLM_PROVIDER', 'anthropic').toLowerCase().trim();
    if (provider === 'openai') return 'openai';
    return 'anthropic';
  }

  /**
   * Returns the model name for the underlying LLM.
   */
  public getArcaneModel(): string {
    const underlying = this.getArcaneUnderlyingProvider();
    return underlying === 'anthropic' ? this.getAnthropicModel() : this.getOpenAIModel();
  }
}
