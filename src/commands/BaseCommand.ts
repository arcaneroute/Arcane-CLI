/*
 * arcane-route :: src/commands/BaseCommand.ts
 * Abstract base class for all commands (Template Method pattern)
 */

import * as readline from 'node:readline';
import type { Renderer } from '../cli/Renderer.ts';
import type { ConfigManager } from '../core/ConfigManager.ts';
import type { EventBus } from '../core/EventBus.ts';

/**
 * Abstract base class for all arcane commands.
 * Provides shared infrastructure: error handling and user confirmation prompts.
 */
export abstract class BaseCommand {
  constructor(
    protected readonly config: ConfigManager,
    protected readonly renderer: Renderer,
    protected readonly eventBus: EventBus,
  ) {}

  /**
   * Execute the command with the given parsed options.
   * Must be implemented by each concrete command subclass.
   */
  public abstract execute(options: Record<string, unknown>): Promise<void>;

  /**
   * Log an error using the Renderer without exiting the process.
   * Prints the error message and, if the error carries an ArcaneErrorCode,
   * also prints the code for easier debugging.
   */
  protected handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.renderer.error(message);

    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      this.renderer.log(`\x1b[90m  Error code: ${error.code}\x1b[0m`);
    }
  }

  /**
   * Prompt the user for Y/n confirmation in a blocking readline interface.
   * Accepts: empty string, `y`, or `yes` (case-insensitive) as affirmative.
   * Returns `true` if the user confirms, `false` otherwise.
   */
  protected confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(`${message} \x1b[90m[Y/n]\x1b[0m `, (answer) => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
      });
    });
  }
}
