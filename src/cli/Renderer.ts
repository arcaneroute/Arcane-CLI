/*
 * arcane-route :: src/cli/Renderer.ts
 * Rich terminal output formatter — colors, badges, layout
 */

import type {
  BudgetSummary,
  DriftReport,
  EffortLevel,
  LLMProvider,
  VerificationResult,
} from '../types/index.ts';

// ANSI Color Palette
// Brand colors from ANTIGRAVITY.md spec
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Brand colors (closest ANSI to hex targets)
  violet: '\x1b[35m', // #7C3AED — brand headers
  emerald: '\x1b[92m', // #10B981 — verified / success
  amber: '\x1b[93m', // #F59E0B — warnings / corrections
  red: '\x1b[91m', // #EF4444 — errors / failures
  gray: '\x1b[90m', // #6B7280 — metadata / secondary

  // Supplementary
  cyan: '\x1b[96m',
  white: '\x1b[97m',
  blue: '\x1b[94m',
  magenta: '\x1b[95m',

  // Backgrounds
  bgViolet: '\x1b[45m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
} as const;

/** Renders the arcane-route startup banner and all terminal output. */
export class Renderer {
  /** Print the full startup banner with provider info. */
  public printBanner(opts: {
    version: string;
    provider: LLMProvider;
    model: string;
    effort: EffortLevel;
  }): void {
    const { version, provider, model, effort } = opts;
    const providerTag = provider.toUpperCase();
    const effortTag = effort.toUpperCase();

    console.log('');
    console.log(
      `${c.violet}${c.bold}┌─────────────────────────────────────────────────────┐${c.reset}`,
    );
    console.log(
      `${c.violet}${c.bold}│  🔮 ARCANE ROUTE  ${c.reset}${c.gray}v${version}${c.violet}${c.bold}                            │${c.reset}`,
    );
    console.log(
      `${c.violet}│  ${c.reset}Provider: ${c.cyan}${c.bold}${providerTag}${c.reset} · Model: ${c.cyan}${model}${c.reset}${' '.repeat(Math.max(0, 20 - providerTag.length - model.length))}${c.violet}│${c.reset}`,
    );
    console.log(
      `${c.violet}│  ${c.reset}Effort: ${c.amber}${effortTag}${c.reset} · SWD: ${c.emerald}ACTIVE${c.reset}${' '.repeat(Math.max(0, 31 - effortTag.length))}${c.violet}│${c.reset}`,
    );
    console.log(
      `${c.violet}${c.bold}└─────────────────────────────────────────────────────┘${c.reset}`,
    );
    console.log('');
  }

  /** Print a section heading. */
  public heading(text: string): void {
    console.log(`\n${c.bold}${c.cyan}▸ ${text}${c.reset}`);
    console.log(this.hr());
  }

  /** Print a horizontal rule. */
  public hr(char = '─', len = 60): string {
    return `${c.dim}${char.repeat(len)}${c.reset}`;
  }

  // Status Helpers

  /** Print a success message with a green checkmark. */
  public success(text: string): void {
    console.log(`${c.emerald}✔${c.reset} ${text}`);
  }

  /** Print a warning message with an amber triangle. */
  public warn(text: string): void {
    console.log(`${c.amber}⚠${c.reset} ${text}`);
  }

  /** Print an error message with a red cross. */
  public error(text: string): void {
    console.log(`${c.red}✖${c.reset} ${text}`);
  }

  /** Print an informational message with a blue info icon. */
  public info(text: string): void {
    console.log(`${c.blue}ℹ${c.reset} ${text}`);
  }

  /** Print a plain message with no prefix icon. */
  public log(text: string): void {
    console.log(text);
  }

  // SWD Result Printing

  /** Print SWD snapshot status. */
  public printSnapshotStatus(label: string, fileCount: number): void {
    console.log(
      `${c.gray}[SWD]${c.reset} ${label} captured (${c.cyan}${fileCount}${c.reset} files)`,
    );
  }

  /** Print the result of SWD verification for each action. */
  public printVerificationResult(result: VerificationResult): void {
    for (const action of result.verified) {
      console.log(
        `  ${c.emerald}✅ ${action.type.padEnd(6)}${c.reset}  ${c.dim}${action.path}${c.reset}  ${c.emerald}verified${c.reset}`,
      );
    }
    for (const action of result.failed) {
      console.log(
        `  ${c.red}❌ ${action.type.padEnd(6)}${c.reset}  ${c.dim}${action.path}${c.reset}  ${c.red}FAILED${c.reset}`,
      );
    }
    for (const action of result.unmatched) {
      console.log(
        `  ${c.amber}⚠️  ${action.type.padEnd(6)}${c.reset}  ${c.dim}${action.path}${c.reset}  ${c.amber}UNMATCHED${c.reset}`,
      );
    }
  }

  // Budget Display

  /** Print compact budget status line. */
  public printBudgetLine(summary: BudgetSummary): void {
    const cost = summary.estimatedCostUSD.toFixed(4);
    const turnsRemaining = summary.maxTurns - summary.turns;
    console.log(
      `${c.gray}[BUDGET]${c.reset} ${c.cyan}${summary.totalTokens.toLocaleString()}${c.reset} tokens used · ` +
        `${c.cyan}$${cost}${c.reset} · ` +
        `${c.cyan}${turnsRemaining}${c.reset} turns remaining (${summary.turns}/${summary.maxTurns})`,
    );
  }

  /**
   * Render a visual ASCII progress bar.
   * Color transitions: green → amber at 80%, amber → red at 90%.
   */
  public progressBar(percent: number, width = 20): string {
    const clamped = Math.max(0, Math.min(100, percent));
    const filled = Math.round((clamped / 100) * width);
    const empty = width - filled;
    const color = clamped >= 90 ? c.red : clamped >= 80 ? c.amber : c.emerald;
    return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${c.reset}`;
  }

  // Memory Display

  /** Print memory status line. */
  public printMemoryStatus(entryCount: number, sizeKb: number): void {
    console.log(
      `${c.gray}[MEMORY]${c.reset} ${c.cyan}${entryCount}${c.reset} entries · ${c.cyan}${sizeKb.toFixed(1)}${c.reset}kb`,
    );
  }

  // Verify Command Display

  /** Print a drift report summary. */
  public printDriftReport(report: DriftReport): void {
    for (const f of report.verified) {
      console.log(`  ${c.emerald}✅ VERIFIED   ${c.reset}${c.dim}${f}${c.reset}`);
    }
    for (const f of report.drifted) {
      console.log(`  ${c.amber}⚠️  DRIFTED    ${c.reset}${c.dim}${f}${c.reset}`);
    }
    for (const f of report.missing) {
      console.log(`  ${c.red}❌ MISSING    ${c.reset}${c.dim}${f}${c.reset}`);
    }
    for (const f of report.untracked) {
      console.log(`  ${c.cyan}➕ UNTRACKED  ${c.reset}${c.dim}${f}${c.reset}`);
    }

    console.log('');
    console.log(
      `${c.bold}Summary:${c.reset} ` +
        `${c.emerald}${report.verified.length} verified${c.reset} · ` +
        `${c.amber}${report.drifted.length} drifted${c.reset} · ` +
        `${c.red}${report.missing.length} missing${c.reset} · ` +
        `${c.cyan}${report.untracked.length} untracked${c.reset}`,
    );
  }

  // Badges

  /** Returns a colored DRY-RUN badge string for terminal output. */
  public dryRunBadge(): string {
    return `${c.bgYellow}\x1b[30m${c.bold} DRY-RUN ${c.reset}`;
  }

  /** Returns a colored correction attempt badge (e.g. "⟲ Correction Turn 1/2"). */
  public correctionBadge(attempt: number, max: number): string {
    return `${c.amber}⟲ Correction Turn ${attempt}/${max}${c.reset}`;
  }

  /** Returns the "yielding to human" badge shown when max corrections are exhausted. */
  public yieldBadge(): string {
    return `${c.red}${c.bold}⛔ Yielding to human — max corrections reached${c.reset}`;
  }
}
