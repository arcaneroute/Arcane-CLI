/*
 * arcane-route :: src/memory/MemoryEntry.ts
 * Value Object: immutable data model for a memory entry
 */

import type { EffortLevel, FileAction, LLMProvider } from '../types/index.ts';

/**
 * Immutable value object representing one memory entry in ARCANE_MEMORY.md.
 * Each session turn that produces verified file actions creates one entry.
 */
export class MemoryEntry {
  public readonly timestamp: string;
  public readonly sessionId: string;
  public readonly effort: EffortLevel;
  public readonly provider: LLMProvider;
  public readonly actions: readonly FileAction[];
  public readonly summary: string;
  public readonly tokensUsed: number;

  constructor(data: {
    timestamp?: string;
    sessionId: string;
    effort: EffortLevel;
    provider: LLMProvider;
    actions: readonly FileAction[];
    summary: string;
    tokensUsed: number;
  }) {
    this.timestamp = data.timestamp ?? new Date().toISOString();
    this.sessionId = data.sessionId;
    this.effort = data.effort;
    this.provider = data.provider;
    this.actions = data.actions;
    this.summary = data.summary;
    this.tokensUsed = data.tokensUsed;
  }

  /** Serialize to the ARCANE_MEMORY.md markdown format. */
  public toMarkdown(): string {
    const actionLines = this.actions.map((a) => `- [${a.type}] \`${a.path}\``).join('\n');

    return [
      `## Session: ${this.timestamp}`,
      `**Effort:** ${this.effort} | **Provider:** ${this.provider} | **Tokens:** ${this.tokensUsed.toLocaleString()}`,
      '',
      actionLines || '- (no file actions)',
      '',
      `### Summary`,
      this.summary,
      '',
      '---',
      '',
    ].join('\n');
  }

  /** Build a MemoryEntry from a previously serialized markdown block. */
  public static fromMarkdown(block: string): MemoryEntry | null {
    try {
      const timestampMatch = block.match(/^## Session: (.+)$/m);
      const effortMatch = block.match(/\*\*Effort:\*\* (\w+)/);
      const providerMatch = block.match(/\*\*Provider:\*\* (\w+)/);
      const tokensMatch = block.match(/\*\*Tokens:\*\* ([\d,]+)/);
      const summaryMatch = block.match(/### Summary\n([\s\S]+?)(?:\n---|\s*$)/);
      const actionMatches = [...block.matchAll(/- \[(\w+)\] `(.+?)`/g)];

      if (!timestampMatch?.[1] || !effortMatch?.[1]) return null;

      const effort = effortMatch[1].toLowerCase() as EffortLevel;
      const provider = (providerMatch?.[1]?.toLowerCase() ?? 'anthropic') as LLMProvider;

      const actions: FileAction[] = actionMatches.map((m) => ({
        type: (m[1] ?? 'MODIFY') as FileAction['type'],
        path: m[2] ?? '',
        rawBlock: '',
      }));

      return new MemoryEntry({
        timestamp: timestampMatch[1],
        sessionId: 'restored',
        effort,
        provider,
        actions,
        summary: summaryMatch?.[1]?.trim() ?? '',
        tokensUsed: parseInt((tokensMatch?.[1] ?? '0').replace(/,/g, ''), 10),
      });
    } catch {
      return null;
    }
  }
}
