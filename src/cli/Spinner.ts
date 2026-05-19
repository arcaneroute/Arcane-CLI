/*
 * arcane-route :: src/cli/Spinner.ts
 * Animated loading indicator using braille frames
 */

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
/** Milliseconds between each spinner frame update. */
const FRAME_INTERVAL_MS = 80;

/** Terminal spinner with start/update/stop lifecycle. */
export class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIdx = 0;
  private currentMessage = '';
  private isRunning = false;

  /** Start spinning with an initial message. */
  public start(message: string): void {
    if (this.isRunning) this.stop();
    this.currentMessage = message;
    this.frameIdx = 0;
    this.isRunning = true;

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    // Render first frame immediately
    this.render();

    this.interval = setInterval(() => {
      this.frameIdx++;
      this.render();
    }, FRAME_INTERVAL_MS);
  }

  /** Update the spinner message without restarting. */
  public update(message: string): void {
    this.currentMessage = message;
    this.render();
  }

  /** Stop the spinner, optionally printing a final message. */
  public stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    // Clear current line and restore cursor
    process.stdout.write('\r\x1b[K');
    process.stdout.write('\x1b[?25h');

    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  /** Whether the spinner is currently active. */
  public get active(): boolean {
    return this.isRunning;
  }

  /**
   * Render the current frame to stdout using a carriage return to overwrite
   * the previous line. Hides cursor during animation.
   */
  private render(): void {
    const frame = FRAMES[this.frameIdx % FRAMES.length] ?? '⠋';
    process.stdout.write(`\r\x1b[K\x1b[96m${frame}\x1b[0m \x1b[2m${this.currentMessage}\x1b[0m`);
  }
}
