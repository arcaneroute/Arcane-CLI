/*
 * arcane-route :: src/memory/MemoryCompressor.ts
 * Compresses old memory entries via low-effort LLM call
 */

import type { ILLMClient } from '../ai/ILLMClient.ts';
import type { EffortLevel } from '../types/index.ts';
import type { MemoryManager } from './MemoryManager.ts';

const DREAM_SYSTEM_PROMPT =
  'You are a memory compression engine. Output only the requested summary, nothing else. No preamble, no commentary.';

/**
 * Compresses old ARCANE_MEMORY.md entries using a low-effort LLM call.
 * Used by DreamCommand.
 */
export class MemoryCompressor {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly memoryManager: MemoryManager,
  ) {}

  /**
   * Compress all but the most recent `keepRecent` entries into an LLM-generated
   * summary block and persist it to ARCANE_MEMORY.md.
   *
   * @returns
   *   - `summary`         — the compressed markdown text
   *   - `compressedCount` — number of entries that were compressed away
   *   - `ratio`           — file-size reduction as a percentage (0–100)
   *   - `tokensUsed`      — total tokens consumed by the compression LLM call
   *
   * @throws {Error} if there are no entries to compress, or all entries are recent.
   */
  public async compress(keepRecent: number = 20): Promise<{
    summary: string;
    compressedCount: number;
    ratio: number;
    tokensUsed: number;
  }> {
    const entries = await this.memoryManager.getEntries();
    const total = entries.length;

    if (total === 0) {
      throw new Error('No memory entries to compress.');
    }

    const toCompress = entries.slice(0, Math.max(0, total - keepRecent));

    if (toCompress.length === 0) {
      throw new Error('Nothing to compress — all entries are recent.');
    }

    const entriesText = toCompress
      .map((e) => {
        const actionSummary = e.actions.map((a) => `${a.type}: ${a.path}`).join(', ');
        return `[${e.timestamp}] ${actionSummary} — ${e.summary}`;
      })
      .join('\n');

    const prompt =
      `You are the memory compression engine for arcane-route.\n\n` +
      `Below are ${toCompress.length} session log entries.\n` +
      `Compress them into a concise summary that preserves:\n` +
      `1. Key architectural decisions made\n` +
      `2. Files created, modified, or deleted\n` +
      `3. Any errors or corrections that occurred\n` +
      `4. The overall trajectory/intent of the session(s)\n\n` +
      `Output a clear, scannable markdown summary (bullet points preferred).\n` +
      `Do NOT include timestamps for individual items.\n\n` +
      `---\n\n` +
      entriesText;

    const beforeSize = (await this.memoryManager.getStatus()).fileSizeBytes;

    const response = await this.llmClient.sendLowEffortMessage({
      messages: [{ role: 'user', content: prompt }],
      effort: 'low' as EffortLevel,
      systemPrompt: DREAM_SYSTEM_PROMPT,
    });

    const summary = response.text.trim();

    // Write compressed memory
    await this.memoryManager.replaceOldEntries(summary, keepRecent);

    const afterSize = (await this.memoryManager.getStatus()).fileSizeBytes;
    const ratio = beforeSize > 0 ? Math.round((1 - afterSize / beforeSize) * 100) : 0;

    return {
      summary,
      compressedCount: toCompress.length,
      ratio,
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
    };
  }
}
