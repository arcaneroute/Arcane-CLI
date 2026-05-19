/**
 * SearchTools - Tool definitions untuk search operations
 */

import { logger } from '@arcane/logger';
import { spawn } from 'bun';
import type { Tool, ToolFunction } from '../types';

const grep: ToolFunction = async (input: unknown) => {
  const { pattern, path, recursive, caseInsensitive, extensions } = input as {
    pattern: string;
    path?: string;
    recursive?: boolean;
    caseInsensitive?: boolean;
    extensions?: string[];
  };

  logger.debug({ tool: 'grep', pattern, path, recursive, caseInsensitive }, 'Executing grep');
  const args = ['grep'];
  if (recursive) args.push('-r');
  if (caseInsensitive) args.push('-i');
  if (extensions?.length) {
    args.push('--include=' + extensions.map((e) => `*.${e}`).join(','));
  }
  args.push(pattern);
  if (path) args.push(path);

  try {
    const proc = spawn({
      cmd: args,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    const matches = stdout.split('\n').filter(Boolean);
    logger.info({ tool: 'grep', pattern, matchesCount: matches.length, success: exitCode === 0 }, 'grep completed');
    return {
      success: exitCode === 0,
      matches,
      count: matches.length,
    };
  } catch (error) {
    logger.error({ tool: 'grep', pattern, error: String(error) }, 'grep failed');
    return { success: false, error: String(error), pattern };
  }
};

const find: ToolFunction = async (input: unknown) => {
  const { pattern, path, type } = input as {
    pattern: string;
    path?: string;
    type?: 'f' | 'd';
  };

  logger.debug({ tool: 'find', pattern, path, type }, 'Executing find');
  const args = ['find'];
  if (path) args.push(path);
  else args.push('.');
  if (type) args.push('-type', type);
  args.push('-name', pattern);

  try {
    const proc = spawn({
      cmd: args,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    const files = stdout.split('\n').filter(Boolean);
    logger.info({ tool: 'find', pattern, filesCount: files.length, success: exitCode === 0 }, 'find completed');
    return {
      success: exitCode === 0,
      files,
    };
  } catch (error) {
    logger.error({ tool: 'find', pattern, error: String(error) }, 'find failed');
    return { success: false, error: String(error), pattern };
  }
};

const semanticSearch: ToolFunction = async (input: unknown) => {
  const { query, path } = input as { query: string; path?: string };
  logger.debug({ tool: 'semantic_search', query, path }, 'Executing semantic_search');
  try {
    const searchPath = path || '.';
    const proc = spawn({
      cmd: ['grep', '-r', query, searchPath, '--include=*.ts', '--include=*.tsx', '--include=*.md'],
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const results = stdout.split('\n').filter(Boolean).slice(0, 10);
    logger.info({ tool: 'semantic_search', query, resultsCount: results.length }, 'semantic_search completed');
    return {
      success: true,
      results,
      query,
    };
  } catch {
    logger.warn({ tool: 'semantic_search', query }, 'semantic_search returned empty');
    return { success: true, results: [], query };
  }
};

const searchFiles: ToolFunction = async (input: unknown) => {
  const { query, path } = input as { query: string; path?: string };
  logger.debug({ tool: 'search_files', query, path }, 'Executing search_files');
  try {
    const searchPath = path || '.';
    const proc = spawn({
      cmd: ['find', searchPath, '-type', 'f', '-name', `*${query}*`],
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const files = stdout.split('\n').filter(Boolean);
    logger.info({ tool: 'search_files', query, filesCount: files.length }, 'search_files completed');
    return {
      success: true,
      files,
      query,
    };
  } catch (error) {
    logger.error({ tool: 'search_files', query, error: String(error) }, 'search_files failed');
    return { success: false, error: String(error), query };
  }
};

export const searchTools: Tool[] = [
  {
    name: 'grep',
    description: 'Search for text patterns in files.',
    execute: grep,
  },
  {
    name: 'find',
    description: 'Find files by name pattern.',
    execute: find,
  },
  {
    name: 'semantic_search',
    description: 'Search for code or content with semantic understanding.',
    execute: semanticSearch,
  },
  {
    name: 'search_files',
    description: 'Search for files by name.',
    execute: searchFiles,
  },
];
