/*
 * arcane-route :: src/commands/DreamCommand.ts
 * Memory compression command — compresses old entries via LLM
 */

import type { Renderer } from '../cli/Renderer.ts';
import { Spinner } from '../cli/Spinner.ts';
import type { ConfigManager } from '../core/ConfigManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { MemoryCompressor } from '../memory/MemoryCompressor.ts';
import type { MemoryManager } from '../memory/MemoryManager.ts';
import type { DreamOptions } from '../types/index.ts';
import { BaseCommand } from './BaseCommand.ts';

/** Minimum entry count required to allow dream compression without --force. */
const MIN_ENTRIES_FOR_DREAM = 10;
/** Number of recent entries to preserve after compression. */
const KEEP_RECENT = 20;

/**
 * DreamCommand — compresses old ARCANE_MEMORY.md entries via a low-effort LLM call.
 * Auto-triggering is recommended when `MemoryManager.needsDream` is true
 * (i.e., entries ≥ 100). Can be forced with --force regardless of count.
 */
export class DreamCommand extends BaseCommand {
  private readonly spinner: Spinner;

  constructor(
    config: ConfigManager,
    renderer: Renderer,
    eventBus: EventBus,
    private readonly memoryManager: MemoryManager,
    private readonly compressor: MemoryCompressor,
  ) {
    super(config, renderer, eventBus);
    this.spinner = new Spinner();
  }

  public override async execute(options: Record<string, unknown>): Promise<void> {
    const dreamOptions = options as unknown as DreamOptions;
    const { force, dryRun } = dreamOptions;

    this.renderer.heading('💤 Summarization Dream');

    if (dryRun) {
      this.renderer.log(`  ${this.renderer.dryRunBadge()}  Memory writes will be previewed.\n`);
    }

    try {
      await this.memoryManager.load();
      const count = await this.memoryManager.countEntries();

      this.renderer.log(`\x1b[90m  Current entries: \x1b[96m${count}\x1b[0m`);

      if (count < MIN_ENTRIES_FOR_DREAM && !force) {
        this.renderer.info(
          `Not enough entries to dream (${count} < ${MIN_ENTRIES_FOR_DREAM}). Use --force to override.`,
        );
        return;
      }

      const toCompressCount = Math.max(0, count - KEEP_RECENT);

      if (toCompressCount === 0 && !force) {
        this.renderer.info('Nothing to compress — all entries are recent.');
        return;
      }

      this.renderer.log(
        `\x1b[90m  Compressing: \x1b[93m${toCompressCount}\x1b[90m entries → summary\x1b[0m`,
      );
      this.renderer.log(
        `\x1b[90m  Keeping:     \x1b[92m${Math.min(count, KEEP_RECENT)}\x1b[90m recent entries\x1b[0m\n`,
      );

      if (dryRun) {
        this.renderer.log(
          `\x1b[90m  [DRY-RUN] Would compress ${toCompressCount} entries and keep ${KEEP_RECENT} recent.\x1b[0m`,
        );
        return;
      }

      this.spinner.start('Dreaming... compressing agentic memory...');

      const result = await this.compressor.compress(KEEP_RECENT);

      this.spinner.stop();

      this.renderer.log(`\n\x1b[1mDream Summary:\x1b[0m\n`);
      this.renderer.log(`\x1b[90m${result.summary}\x1b[0m`);
      this.renderer.log(`\n${this.renderer.hr()}`);

      this.renderer.success(`Compressed ${result.compressedCount} entries → summary block`);
      this.renderer.log(`\x1b[90m  Compression: \x1b[92m${result.ratio}%\x1b[90m reduction\x1b[0m`);
      this.renderer.log(
        `\x1b[90m  Tokens used: \x1b[96m${result.tokensUsed.toLocaleString()}\x1b[0m`,
      );

      this.eventBus.emit('memory:compressed', {
        before: result.compressedCount,
        after: KEEP_RECENT,
        ratio: result.ratio,
      });
    } catch (err: unknown) {
      this.spinner.stop();
      this.handleError(err);
      process.exit(1);
    }
  }
}
