/**
 * GitTools - Tool definitions untuk Git operations
 */

import { logger } from '@arcane/logger';
import { spawn } from 'bun';
import type { Tool, ToolFunction } from '../types';

const runGit = async (
  args: string[],
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> => {
  logger.debug({ tool: 'git', args, cwd }, 'Executing git command');
  try {
    const proc = spawn({
      cmd: ['git', ...args],
      cwd: cwd || process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    logger.debug({ tool: 'git', args, exitCode }, 'Git command completed');
    return {
      success: exitCode === 0,
      stdout,
      stderr,
      exitCode,
    };
  } catch (error) {
    logger.error({ tool: 'git', args, error: String(error) }, 'Git command failed');
    return {
      success: false,
      stdout: '',
      stderr: String(error),
      exitCode: 1,
    };
  }
};

const gitStatus: ToolFunction = async (input?: unknown) => {
  const cwd = (input as { cwd?: string })?.cwd;
  logger.debug({ tool: 'git_status', cwd }, 'Executing git_status');
  const result = await runGit(['status', '--porcelain'], cwd);
  logger.info({ tool: 'git_status', success: result.success }, 'git_status completed');
  return result;
};

const gitDiff: ToolFunction = async (input?: unknown) => {
  const { cwd, file } = (input as { cwd?: string; file?: string }) || {};
  logger.debug({ tool: 'git_diff', cwd, file }, 'Executing git_diff');
  const args = file ? ['diff', file] : ['diff', '--stat'];
  const result = await runGit(args, cwd);
  logger.info({ tool: 'git_diff', success: result.success }, 'git_diff completed');
  return result;
};

const gitLog: ToolFunction = async (input?: unknown) => {
  const { cwd, count = 10, format } = (input as { cwd?: string; count?: number; format?: string }) || {};
  logger.debug({ tool: 'git_log', cwd, count, format }, 'Executing git_log');
  const args = format
    ? ['log', `-${count}`, `--format=${format}`]
    : ['log', `-${count}`, '--oneline'];
  const result = await runGit(args, cwd);
  logger.info({ tool: 'git_log', success: result.success, commitsCount: result.stdout.split('\n').length }, 'git_log completed');
  return result;
};

const gitAdd: ToolFunction = async (input: unknown) => {
  const { path = '.', cwd } = input as { path?: string; cwd?: string };
  logger.debug({ tool: 'git_add', path, cwd }, 'Executing git_add');
  const result = await runGit(['add', path], cwd);
  logger.info({ tool: 'git_add', success: result.success }, 'git_add completed');
  return result;
};

const gitCommit: ToolFunction = async (input: unknown) => {
  const { message, cwd } = input as { message: string; cwd?: string };
  logger.debug({ tool: 'git_commit', message: message.slice(0, 50), cwd }, 'Executing git_commit');
  const result = await runGit(['commit', '-m', message], cwd);
  logger.info({ tool: 'git_commit', success: result.success }, 'git_commit completed');
  return result;
};

const gitPush: ToolFunction = async (input?: unknown) => {
  const { cwd, remote, branch } = (input as { cwd?: string; remote?: string; branch?: string }) || {};
  logger.debug({ tool: 'git_push', cwd, remote, branch }, 'Executing git_push');
  const args = ['push'];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  const result = await runGit(args, cwd);
  logger.info({ tool: 'git_push', success: result.success }, 'git_push completed');
  return result;
};

const gitPull: ToolFunction = async (input?: unknown) => {
  const { cwd, remote, branch } = (input as { cwd?: string; remote?: string; branch?: string }) || {};
  logger.debug({ tool: 'git_pull', cwd, remote, branch }, 'Executing git_pull');
  const args = ['pull'];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  const result = await runGit(args, cwd);
  logger.info({ tool: 'git_pull', success: result.success }, 'git_pull completed');
  return result;
};

const gitBranch: ToolFunction = async (input?: unknown) => {
  const { cwd, list, create, shouldDelete, name } = (input as {
    cwd?: string;
    list?: boolean;
    create?: boolean;
    shouldDelete?: boolean;
    name?: string;
  }) || {};

  logger.debug({ tool: 'git_branch', cwd, list, create, shouldDelete, name }, 'Executing git_branch');
  let result;
  if (list) result = await runGit(['branch', '-a'], cwd);
  else if (create && name) result = await runGit(['checkout', '-b', name], cwd);
  else if (shouldDelete && name) result = await runGit(['branch', '-d', name], cwd);
  else result = await runGit(['branch'], cwd);
  logger.info({ tool: 'git_branch', success: result.success }, 'git_branch completed');
  return result;
};

const gitCheckout: ToolFunction = async (input: unknown) => {
  const { path, cwd, createBranch } = input as {
    path: string;
    cwd?: string;
    createBranch?: boolean;
  };
  logger.debug({ tool: 'git_checkout', path, cwd, createBranch }, 'Executing git_checkout');
  const args = createBranch ? ['checkout', '-b', path] : ['checkout', path];
  const result = await runGit(args, cwd);
  logger.info({ tool: 'git_checkout', success: result.success }, 'git_checkout completed');
  return result;
};

export const gitTools: Tool[] = [
  {
    name: 'git_status',
    description: 'Get git repository status.',
    execute: gitStatus,
  },
  {
    name: 'git_diff',
    description: 'Get git diff output.',
    execute: gitDiff,
  },
  {
    name: 'git_log',
    description: 'Get recent git commits.',
    execute: gitLog,
  },
  {
    name: 'git_add',
    description: 'Stage files for commit.',
    execute: gitAdd,
  },
  {
    name: 'git_commit',
    description: 'Commit staged changes.',
    execute: gitCommit,
  },
  {
    name: 'git_push',
    description: 'Push commits to remote.',
    execute: gitPush,
  },
  {
    name: 'git_pull',
    description: 'Pull commits from remote.',
    execute: gitPull,
  },
  {
    name: 'git_branch',
    description: 'List, create, or delete branches.',
    execute: gitBranch,
  },
  {
    name: 'git_checkout',
    description: 'Switch branches or restore files.',
    execute: gitCheckout,
  },
];
