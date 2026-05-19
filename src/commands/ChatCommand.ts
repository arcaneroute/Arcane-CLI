/*
 * arcane-route :: src/commands/ChatCommand.ts
 * Interactive REPL with SWD verification and correction loop
 */

import * as readline from 'node:readline';
import type { ConversationManager } from '../ai/ConversationManager.ts';
import type { ILLMClient } from '../ai/ILLMClient.ts';
import type { BudgetLimiter } from '../budget/BudgetLimiter.ts';
import type { Renderer } from '../cli/Renderer.ts';
import { Spinner } from '../cli/Spinner.ts';
import type { ConfigManager } from '../core/ConfigManager.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { SWDEngine } from '../filesystem/SWDEngine.ts';
import { MemoryEntry } from '../memory/MemoryEntry.ts';
import type { MemoryManager } from '../memory/MemoryManager.ts';
import { PluginRegistry } from '../plugins/PluginRegistry.ts';
import type { ChatOptions, VerificationResult } from '../types/index.ts';
import { BaseCommand } from './BaseCommand.ts';

const PROMPT_SYMBOL = '\x1b[35m\x1b[1marcane ❯ \x1b[0m';

/**
 * ChatCommand — interactive REPL with full SWD verification loop.
 * Handles: streaming responses, SWD verify, correction turns, slash commands.
 */
export class ChatCommand extends BaseCommand {
  private readonly spinner: Spinner;
  private sessionId: string;

  constructor(
    config: ConfigManager,
    renderer: Renderer,
    eventBus: EventBus,
    private readonly client: ILLMClient,
    private readonly swdEngine: SWDEngine,
    private readonly memoryManager: MemoryManager,
    private readonly budgetLimiter: BudgetLimiter,
    private readonly conversationManager: ConversationManager,
  ) {
    super(config, renderer, eventBus);
    this.spinner = new Spinner();
    this.sessionId = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
  }

  public override async execute(options: Record<string, unknown>): Promise<void> {
    const chatOptions = options as unknown as ChatOptions;
    const { effort, dryRun, verbose: _verbose } = chatOptions;

    const provider = this.config.getProvider();
    const model =
      provider === 'anthropic' ? this.config.getAnthropicModel() : this.config.getOpenAIModel();

    // Print banner
    this.renderer.printBanner({
      version: '1.0.0',
      provider,
      model,
      effort,
    });

    if (dryRun) {
      this.renderer.log(`  ${this.renderer.dryRunBadge()}  No filesystem writes will occur.\n`);
    }

    if (!this.client.supportsThinking()) {
      this.renderer.info(
        `Extended thinking not available for ${provider} provider. Using temperature-based effort.`,
      );
    }

    // Load memory context
    const memContext = await this.memoryManager.getMemoryContext();
    if (memContext) {
      this.conversationManager.injectMemoryContext(memContext);
    }

    // Print memory status
    const memStatus = await this.memoryManager.getStatus();
    this.renderer.printMemoryStatus(memStatus.entryCount, memStatus.fileSizeBytes / 1024);

    this.renderer.log(this.renderer.hr());

    // Start REPL
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: PROMPT_SYMBOL,
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      // Handle slash commands
      if (input.startsWith('/')) {
        const handled = await this.handleSlashCommand(input, rl);
        if (handled) {
          rl.prompt();
          return;
        }
      }

      // Budget check
      if (this.budgetLimiter.isExceeded()) {
        this.renderer.error('Budget exhausted. Use /budget to see details or start a new session.');
        rl.prompt();
        return;
      }

      rl.pause();
      await this.runTurn(input, chatOptions);
      this.renderer.log(this.renderer.hr());
      rl.resume();
      rl.prompt();
    });

    rl.on('close', async () => {
      this.renderer.log('\n\x1b[90mSession ended. Memory saved to ARCANE_MEMORY.md.\x1b[0m\n');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.renderer.log('\n\x1b[90mInterrupted. Session saved.\x1b[0m');
      rl.close();
    });
  }

  // Single turn lifecycle

  /**
   * Execute a single REPL turn: pre-snapshot → LLM stream → post-snapshot
   * → SWD verification → budget update → memory logging.
   * Catches all errors and logs them without crashing the REPL loop.
   */
  private async runTurn(userInput: string, options: ChatOptions): Promise<void> {
    const { effort, dryRun } = options;

    try {
      this.budgetLimiter.assertNotExceeded();

      // Only capture SWD snapshot if input might involve file operations
      const needsSwd = !dryRun && this.mightHaveFileOperations(userInput);

      if (needsSwd) {
        await this.swdEngine.preCapture();
        this.renderer.printSnapshotStatus('Pre-snapshot', this.swdEngine.getPreSnapshotFileCount());
      }

      // Add user message to history
      this.conversationManager.addUserMessage(userInput);

      // Call LLM with streaming
      this.spinner.start(this.client.supportsThinking() ? 'Thinking...' : 'Processing...');

      let streamStarted = false;

      const response = await this.client.sendMessage({
        messages: [...this.conversationManager.getHistory()],
        effort,
        systemPrompt: this.config.getSystemPrompt(),
        onThinkingDelta: (delta) => {
          const approxTokens = Math.ceil(delta.length / 4);
          this.spinner.update(`Thinking... \x1b[93m~${approxTokens} tokens\x1b[0m`);
        },
        onTextDelta: (delta) => {
          if (!streamStarted) {
            this.spinner.stop(`\x1b[92m✔\x1b[0m \x1b[90mReasoning complete\x1b[0m\n`);
            streamStarted = true;
          }
          process.stdout.write(delta);
        },
      });

      if (!streamStarted) this.spinner.stop();
      process.stdout.write('\n');

      this.conversationManager.addAssistantMessage(response.text);
      this.budgetLimiter.recordTurn(response.usage);

      // Post-snapshot and SWD verification (only if we did pre-snapshot)
      if (needsSwd) {
        await this.swdEngine.postCapture();
        this.renderer.printSnapshotStatus(
          'Post-snapshot',
          this.swdEngine.getPostSnapshotFileCount(),
        );
        await this.handleSWDVerification(response.text, userInput, options);
      }

      // Budget + cost display
      this.renderer.log(`\n${this.budgetLimiter.formatBar(this.renderer)}`);
      this.renderer.log(this.budgetLimiter.getCostTracker().formatUsageLine());

      const budgetStatus = this.budgetLimiter.checkBudget();
      if (!budgetStatus.ok) {
        this.renderer.warn(`\n${budgetStatus.reason ?? 'Budget limit reached.'}`);
      } else if (budgetStatus.warning) {
        this.renderer.warn(
          `Budget ${Math.round(Math.max(budgetStatus.tokensPercent, budgetStatus.turnsPercent))}% consumed`,
        );
      }

      // Memory warning
      const status = await this.memoryManager.getStatus();
      if (status.needsDream) {
        this.renderer.warn(
          '💤 Memory approaching capacity. Run \x1b[96marcane dream\x1b[93m to compress.',
        );
      }
    } catch (err: unknown) {
      this.spinner.stop();
      this.handleError(err);
      // Pop the user message we added if the turn failed
      this.conversationManager.clear();
    }
  }

  /**
   * Check if user input might involve file operations.
   * Used to skip SWD snapshot for pure chat turns.
   */
  private mightHaveFileOperations(input: string): boolean {
    const lower = input.toLowerCase();
    const fileKeywords = [
      'edit',
      'create',
      'delete',
      'modify',
      'update',
      'remove',
      'add',
      'write',
      'read',
      'show',
      'file',
      'path',
      'directory',
      'folder',
      'src/',
      'lib/',
      'test/',
      'config',
      'package',
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      '.md',
      '.yaml',
      '.yml',
      '.toml',
    ];
    return fileKeywords.some((keyword) => lower.includes(keyword));
  }

  // SWD Verification

  /**
   * Parse claimed actions from the model response and verify them via SWDEngine.
   * If no FILE_ACTION blocks are found, logs a plain chat memory entry and returns.
   * On verification failure, starts the correction loop.
   */
  private async handleSWDVerification(
    responseText: string,
    userInput: string,
    options: ChatOptions,
  ): Promise<void> {
    const claimed = this.swdEngine.parseClaimedActions(responseText);

    if (claimed.length === 0) {
      // No file actions claimed — log as chat turn
      await this.logMemoryEntry(userInput, responseText, [], options);
      return;
    }

    this.spinner.start('Verifying file actions...');
    const result = this.swdEngine.verify(claimed);
    this.spinner.stop();

    this.renderer.printVerificationResult(result);

    if (!result.allVerified) {
      const correctionSuccess = await this.runCorrectionLoop(result, options);
      if (!correctionSuccess) {
        this.renderer.log(this.renderer.yieldBadge());
        this.eventBus.emit('swd:yield_to_human', {
          failures: result.failed.map((a) => a.path),
        });
      }
    }

    await this.logMemoryEntry(userInput, responseText, claimed, options);
  }

  // Correction Loop

  /**
   * Attempt up to `maxRetries` correction turns after SWD failure.
   * Returns `true` if any correction turn passes verification, `false` otherwise.
   */
  private async runCorrectionLoop(
    lastResult: VerificationResult,
    options: ChatOptions,
  ): Promise<boolean> {
    const maxRetries = this.config.getMaxCorrectionRetries();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (this.budgetLimiter.isExceeded()) {
        this.renderer.warn('Correction aborted — budget exhausted.');
        return false;
      }

      this.renderer.log(`\n${this.renderer.correctionBadge(attempt, maxRetries)}`);

      const failureSummary = lastResult.failed
        .map((a) => `- [FAILED] ${a.type} ${a.path}`)
        .join('\n');

      this.spinner.start(`Correction attempt ${attempt}/${maxRetries}...`);

      try {
        const response = await this.client.sendCorrectionTurn({
          messages: [...this.conversationManager.getHistory()],
          effort: options.effort,
          failureSummary,
          attemptsRemaining: maxRetries - attempt,
        });

        this.spinner.stop();
        process.stdout.write(`${response.text}\n`);

        this.conversationManager.addAssistantMessage(response.text);
        this.budgetLimiter.recordTurn(response.usage);

        // Re-verify
        await this.swdEngine.preCapture();
        await this.swdEngine.postCapture();

        this.spinner.start('Re-verifying...');
        const correctedResult = this.swdEngine.verify(
          this.swdEngine.parseClaimedActions(response.text),
        );
        this.spinner.stop();

        this.renderer.printVerificationResult(correctedResult);

        if (correctedResult.allVerified) {
          this.renderer.success('Correction successful ✓');
          return true;
        }

        lastResult = correctedResult;
        this.eventBus.emit('swd:correction_needed', {
          attempt,
          maxAttempts: maxRetries,
          failures: correctedResult.failed.map((a) => a.path),
        });
      } catch (err: unknown) {
        this.spinner.stop();
        this.handleError(err);
        return false;
      }
    }

    return false;
  }

  // Slash Commands

  /**
   * Dispatch built-in slash commands (/exit, /memory, /clear, /budget, /verify, /help).
   * Returns `true` if the input was handled as a slash command, `false` if unknown.
   */
  private async handleSlashCommand(input: string, rl: readline.Interface): Promise<boolean> {
    const cmd = input.toLowerCase().trim();

    switch (cmd) {
      case '/exit':
      case '/q':
        rl.close();
        return true;

      case '/memory': {
        const status = await this.memoryManager.getStatus();
        this.renderer.printMemoryStatus(status.entryCount, status.fileSizeBytes / 1024);
        if (status.hasCompressedBlock) {
          this.renderer.info('Memory contains a compressed block.');
        }
        if (status.needsDream) {
          this.renderer.warn('Run \x1b[96marcane dream\x1b[93m to compress memory.');
        }
        return true;
      }

      case '/clear':
        this.conversationManager.clear();
        this.renderer.success('Conversation history cleared. Memory (ARCANE_MEMORY.md) preserved.');
        return true;

      case '/budget': {
        const summary = this.budgetLimiter.getSummary();
        this.renderer.printBudgetLine(summary);
        return true;
      }

      case '/verify': {
        const preCount = this.swdEngine.getPreSnapshotFileCount();
        this.renderer.info(`Running inline drift check (${preCount} files tracked)...`);
        return true;
      }

      case '/help':
        this.printHelp();
        return true;

      default: {
        // Check plugin commands
        const pluginCommand = this.findPluginCommand(input);
        if (pluginCommand) {
          await pluginCommand.handler(input.split(' ').slice(1));
          return true;
        }
        this.renderer.warn(`Unknown slash command: ${input}`);
        this.renderer.info('Type /help to see available commands.');
        return true;
      }
    }
  }

  /**
   * Find a command handler from enabled plugins.
   */
  private findPluginCommand(
    input: string,
  ): { pluginId: string; handler: (args: string[]) => Promise<void> } | undefined {
    const registry = PluginRegistry.getInstance();
    return registry.findCommand(input.toLowerCase().trim());
  }

  private printHelp(): void {
    this.renderer.log(`
\x1b[1mSlash Commands:\x1b[0m
  \x1b[96m/exit\x1b[0m    — End session cleanly
  \x1b[96m/memory\x1b[0m  — Show ARCANE_MEMORY.md status
  \x1b[96m/clear\x1b[0m   — Clear conversation history (memory persists)
  \x1b[96m/budget\x1b[0m  — Show token & turn budget
  \x1b[96m/verify\x1b[0m  — Run inline drift detection
  \x1b[96m/help\x1b[0m    — Show this help
`);
  }

  // Memory Logging

  /**
   * Append a MemoryEntry to ARCANE_MEMORY.md for this turn.
   * Skipped entirely in dry-run mode.
   * Failures are non-fatal: the REPL session continues with a warning.
   */
  private async logMemoryEntry(
    userInput: string,
    _responseText: string,
    actions: ReturnType<SWDEngine['parseClaimedActions']>,
    options: ChatOptions,
  ): Promise<void> {
    if (options.dryRun) return;

    const summary =
      actions.length > 0
        ? `${actions.map((a) => `${a.type} ${a.path}`).join('; ')}`
        : `chat: ${userInput.slice(0, 80)}`;

    const entry = new MemoryEntry({
      sessionId: this.sessionId,
      effort: options.effort,
      provider: this.config.getProvider(),
      actions,
      summary,
      tokensUsed: this.budgetLimiter.getSummary().totalTokens,
    });

    try {
      await this.memoryManager.addEntry(entry);
      this.eventBus.emit('memory:entry_added', {
        entryCount: await this.memoryManager.countEntries(),
      });
    } catch {
      // Non-fatal — warn but don't crash the session
      this.renderer.warn('Failed to write memory entry.');
    }
  }
}
