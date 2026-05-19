#!/usr/bin/env bun
/*
 * arcane-route :: src/cli/CLIRouter.ts
 * CLI entry point — Commander.js command registration
 */

import { Command } from 'commander';
import { ArcaneApp } from '../core/ArcaneApp';
import { PluginManager } from '../plugins/PluginManager.ts';

const DEFAULT_MAX_TOKENS = '100000';
const DEFAULT_MAX_TURNS = '50';

const program = new Command();

program
  .name('arcane')
  .description(
    'Zero-drift AI coding. Every claim verified. Every file real.\n' +
      'Provider: set LLM_PROVIDER=anthropic|openai in .env',
  )
  .version('1.0.0');

// arcane chat
program
  .command('chat')
  .description('Start an interactive coding session with SWD verification')
  .option('-e, --effort <level>', 'Thinking effort: high (default), medium, low', 'high')
  .option(
    '--max-tokens <n>',
    `Max tokens per session (default: ${parseInt(DEFAULT_MAX_TOKENS, 10).toLocaleString()})`,
    DEFAULT_MAX_TOKENS,
  )
  .option(
    '--max-turns <n>',
    `Max turns per session (default: ${DEFAULT_MAX_TURNS})`,
    DEFAULT_MAX_TURNS,
  )
  .option('--dry-run', 'Preview all file operations without executing them')
  .option('--verbose', 'Show detailed SWD traces and hashes')
  .action(
    async (options: {
      effort?: string;
      maxTokens?: string;
      maxTurns?: string;
      dryRun?: boolean;
      verbose?: boolean;
    }) => {
      const app = new ArcaneApp();
      try {
        await app.runChat(options);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
        process.exit(1);
      } finally {
        await app.shutdown();
      }
    },
  );

// arcane verify
program
  .command('verify')
  .description('Scan codebase vs ARCANE_MEMORY.md for drift detection')
  .option('--fix', 'Attempt auto-reconciliation of drifted files')
  .option('--json', 'Output results as machine-readable JSON')
  .option('--dry-run', 'Preview without writing to memory')
  .action(async (options: { fix?: boolean; json?: boolean; dryRun?: boolean }) => {
    const app = new ArcaneApp();
    try {
      await app.runVerify(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
      process.exit(1);
    } finally {
      await app.shutdown();
    }
  });

// arcane dream
program
  .command('dream')
  .description('Compress ARCANE_MEMORY.md using AI summarization')
  .option('-f, --force', 'Force compression even with few entries', false)
  .option('--dry-run', 'Preview compression without writing')
  .action(async (options: { force?: boolean; dryRun?: boolean }) => {
    const app = new ArcaneApp();
    try {
      await app.runDream(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
      process.exit(1);
    } finally {
      await app.shutdown();
    }
  });

// arcane plugin
const pluginManager = new PluginManager();

program
  .command('plugin')
  .description('Manage plugins')
  .addCommand(
    new Command('install')
      .description('Install a plugin')
      .argument('<source>', 'Plugin source (npm package, local path, or github:user/repo)')
      .action(async (source: string) => {
        try {
          await pluginManager.install(source);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('uninstall')
      .description('Uninstall a plugin')
      .argument('<id>', 'Plugin ID (e.g., arcane-plugin-git-summary)')
      .action(async (id: string) => {
        try {
          await pluginManager.uninstall(id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('list').description('List all installed plugins').action(() => {
      const plugins = pluginManager.list();
      if (plugins.length === 0) {
        console.log('No plugins installed.');
        return;
      }
      console.log(`\x1b[1mInstalled Plugins (${plugins.length}):\x1b[0m`);
      for (const plugin of plugins) {
        const status = plugin.enabled ? '\x1b[32menabled\x1b[0m' : '\x1b[33mdisabled\x1b[0m';
        console.log(`  \x1b[36m${plugin.id}\x1b[0m @${plugin.version} [${status}]`);
        console.log(`    Source: ${plugin.source}`);
        console.log(`    Installed: ${new Date(plugin.installedAt).toLocaleDateString()}`);
      }
    }),
  )
  .addCommand(
    new Command('enable')
      .description('Enable a disabled plugin')
      .argument('<id>', 'Plugin ID')
      .action(async (id: string) => {
        try {
          pluginManager.enable(id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('disable')
      .description('Disable a plugin without uninstalling')
      .argument('<id>', 'Plugin ID')
      .action(async (id: string) => {
        try {
          pluginManager.disable(id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`\x1b[91m✖ ${msg}\x1b[0m`);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('info')
      .description('Show detailed info about a plugin')
      .argument('<id>', 'Plugin ID')
      .action((id: string) => {
        const plugin = pluginManager.info(id);
        if (!plugin) {
          console.error(`\x1b[91m✖ Plugin not found: ${id}\x1b[0m`);
          process.exit(1);
        }
        console.log(`\x1b[1m${plugin.id}\x1b[0m`);
        console.log(`  Version: ${plugin.version}`);
        console.log(
          `  Status: ${plugin.enabled ? '\x1b[32menabled\x1b[0m' : '\x1b[33mdisabled\x1b[0m'}`,
        );
        console.log(`  Source: ${plugin.source}`);
        console.log(`  Path: ${plugin.path}`);
        console.log(`  Installed: ${new Date(plugin.installedAt).toLocaleString()}`);
      }),
  );

// Default: show help
if (process.argv.length <= 2) {
  printBannerAndHelp();
} else {
  program.parse(process.argv);
}

function printBannerAndHelp(): void {
  console.log('');
  console.log('\x1b[35m\x1b[1m┌─────────────────────────────────────────────────────┐\x1b[0m');
  console.log(
    '\x1b[35m\x1b[1m│  🔮 ARCANE ROUTE  \x1b[0m\x1b[90mv1.0.0\x1b[35m\x1b[1m                            │\x1b[0m',
  );
  console.log(
    '\x1b[35m│  \x1b[0mZero-drift AI coding. Every claim verified.         \x1b[35m│\x1b[0m',
  );
  console.log(
    '\x1b[35m│  \x1b[0mSet \x1b[96mLLM_PROVIDER\x1b[0m=anthropic|openai in .env           \x1b[35m│\x1b[0m',
  );
  console.log('\x1b[35m\x1b[1m└─────────────────────────────────────────────────────┘\x1b[0m');
  console.log('');
  program.help();
}
