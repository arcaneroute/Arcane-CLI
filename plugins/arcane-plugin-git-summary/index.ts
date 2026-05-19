/*
 * arcane-plugin-git-summary
 * Generates intelligent git commit summaries using AI after each session
 */

import { definePlugin, PERMISSIONS, createLogger } from '@arcane-route/plugin-sdk';
import type { ArcanePlugin, PluginContext } from '@arcane-route/plugin-sdk';

const logger = createLogger('git-summary');

const plugin: ArcanePlugin = {
  async onLoad(ctx: PluginContext): Promise<void> {
    logger.info('Git Summary plugin loaded');

    // Register slash commands
    ctx.commands.register('/git', async (args) => {
      const format = ctx.config.get<string>('format') ?? 'conventional';
      const summary = await generateGitSummary(ctx, format);
      ctx.ui.print('\n📝 Suggested commit message:\n');
      ctx.ui.printSuccess(summary);
    });

    ctx.commands.register('/gitcommit', async (args) => {
      const format = ctx.config.get<string>('format') ?? 'conventional';
      const summary = await generateGitSummary(ctx, format);
      const autoCommit = args.includes('--commit');

      ctx.ui.print('\n📝 Git commit command:\n');
      if (autoCommit) {
        ctx.ui.printSuccess(`git commit -m "${summary.replace(/"/g, '\\"')}"`);
      } else {
        ctx.ui.print(`git commit -m "${summary.replace(/"/g, '\\"')}"`);
        ctx.ui.printWarning('(use --commit flag to execute)');
      }
    });

    // Auto-generate summary if enabled
    const autoGenerate = ctx.config.get<boolean>('autoGenerate') ?? false;
    if (autoGenerate) {
      ctx.events.on('chat:turn_complete', (payload) => {
        const p = payload as { turn: number; tokensUsed: number };
        logger.info(`Turn ${p.turn} complete, ${p.tokensUsed} tokens used`);
      });
    }
  },

  async onUnload(ctx: PluginContext): Promise<void> {
    logger.info('Git Summary plugin unloaded');
  },
};

async function generateGitSummary(ctx: PluginContext, format: string): Promise<string> {
  // Get git diff to understand what changed
  const diffResult = await ctx.shell?.exec('git diff --staged --stat');
  const filesChanged = diffResult?.stdout?.trim() || 'No staged changes';

  // Get last commit message for context
  const lastCommitResult = await ctx.shell?.exec('git log -1 --oneline');
  const lastCommit = lastCommitResult?.stdout?.trim() || 'No previous commits';

  // Build context for LLM
  const context = `
Files changed:
${filesChanged}

Last commit:
${lastCommit}

Format requested: ${format}
`;

  // Use LLM to generate summary
  if (ctx.llm) {
    try {
      const response = await ctx.llm.sendMessage({
        prompt: `Based on the following git changes, generate a commit message.
Format: ${format}

${context}

Generate only the commit message, no explanation.`,
        systemPrompt: 'You are a git commit message expert. Generate concise, meaningful commit messages.',
        effort: 'low',
      });

      return response.text.trim();
    } catch (err) {
      logger.error('Failed to generate summary via LLM', err instanceof Error ? err : undefined);
    }
  }

  // Fallback: simple format
  switch (format) {
    case 'conventional':
      return 'feat: update files';
    case 'detailed':
      return `Update files

Changes:
${filesChanged}`;
    default:
      return `Update: ${filesChanged.split('\n')[0] || 'project files'}`;
  }
}

export default plugin;