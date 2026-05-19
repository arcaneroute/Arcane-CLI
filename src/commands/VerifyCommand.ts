/*
 * arcane-route :: src/commands/VerifyCommand.ts
 * Drift scanner: filesystem ↔ ARCANE_MEMORY.md comparison
 */

import type { Renderer } from '../cli/Renderer.ts';
import type { ConfigManager } from '../core/ConfigManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { DriftDetector } from '../filesystem/DriftDetector.ts';
import type { VerifyOptions } from '../types/index.ts';
import { BaseCommand } from './BaseCommand.ts';

/**
 * VerifyCommand — scans filesystem vs ARCANE_MEMORY.md.
 * Outputs: ✅ VERIFIED, ⚠️ DRIFTED, ❌ MISSING, ➕ UNTRACKED
 */
export class VerifyCommand extends BaseCommand {
  constructor(
    config: ConfigManager,
    renderer: Renderer,
    eventBus: EventBus,
    private readonly driftDetector: DriftDetector,
  ) {
    super(config, renderer, eventBus);
  }

  public override async execute(options: Record<string, unknown>): Promise<void> {
    const verifyOptions = options as unknown as VerifyOptions;
    const { json, dryRun } = verifyOptions;

    if (!json) {
      this.renderer.heading('SWD Verify — Codebase × Memory Sync');
      if (dryRun) {
        this.renderer.log(`  ${this.renderer.dryRunBadge()}  No memory writes will occur.\n`);
      }
    }

    try {
      const report = await this.driftDetector.scan();

      if (json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      this.renderer.printDriftReport(report);

      const hasDrift = report.drifted.length > 0 || report.missing.length > 0;
      if (hasDrift) {
        this.renderer.log('');
        this.renderer.warn('Drift detected. Run \x1b[96marcane chat\x1b[93m to reconcile.');
      } else {
        this.renderer.log('');
        this.renderer.success('Zero drift. Memory and codebase are in sync.');
      }
    } catch (err: unknown) {
      this.handleError(err);
      process.exit(1);
    }
  }
}
