/**
 * FileTools - Tool definitions untuk filesystem operations
 */

import { logger } from '@arcane/logger';
import { Glob } from 'bun';
import type { Tool, ToolFunction } from '../types';

const readFile: ToolFunction = async (input: unknown) => {
  const { path, start, end } = input as { path: string; start?: number; end?: number };
  logger.debug({ tool: 'read_file', path, start, end }, 'Executing read_file');
  try {
    const content = await Bun.file(path).text();
    if (start !== undefined && end !== undefined) {
      const lines = content.split('\n');
      logger.info({ tool: 'read_file', path, linesRead: end - start }, 'read_file partial success');
      return { success: true, content: lines.slice(start, end).join('\n'), path };
    }
    logger.info({ tool: 'read_file', path, bytesRead: content.length }, 'read_file success');
    return { success: true, content, path };
  } catch (error) {
    logger.error({ tool: 'read_file', path, error: String(error) }, 'read_file failed');
    return { success: false, error: String(error), path };
  }
};

const writeFile: ToolFunction = async (input: unknown) => {
  const { path, content } = input as { path: string; content: string };
  logger.debug({ tool: 'write_file', path, contentLength: content.length }, 'Executing write_file');
  try {
    await Bun.write(path, content);
    logger.info({ tool: 'write_file', path, bytesWritten: content.length }, 'write_file success');
    return { success: true, path };
  } catch (error) {
    logger.error({ tool: 'write_file', path, error: String(error) }, 'write_file failed');
    return { success: false, error: String(error), path };
  }
};

const editFile: ToolFunction = async (input: unknown) => {
  const { path, oldString, newString } = input as {
    path: string;
    oldString: string;
    newString: string;
  };
  logger.debug({ tool: 'edit_file', path, oldStringLength: oldString.length, newStringLength: newString.length }, 'Executing edit_file');
  try {
    const content = await Bun.file(path).text();
    if (!content.includes(oldString)) {
      logger.warn({ tool: 'edit_file', path }, 'edit_file: old string not found');
      return { success: false, error: 'Old string not found', path };
    }
    const newContent = content.replace(oldString, newString);
    await Bun.write(path, newContent);
    logger.info({ tool: 'edit_file', path }, 'edit_file success');
    return { success: true, path };
  } catch (error) {
    logger.error({ tool: 'edit_file', path, error: String(error) }, 'edit_file failed');
    return { success: false, error: String(error), path };
  }
};

const globFiles: ToolFunction = async (input: unknown) => {
  const { pattern, cwd } = input as { pattern: string; cwd?: string };
  logger.debug({ tool: 'glob', pattern, cwd }, 'Executing glob');
  try {
    const glob = new Glob(pattern);
    const files: string[] = [];
    for await (const file of glob.scan({ cwd: cwd || process.cwd() })) {
      files.push(file);
    }
    logger.info({ tool: 'glob', pattern, filesFound: files.length }, 'glob success');
    return { success: true, files };
  } catch (error) {
    logger.error({ tool: 'glob', pattern, error: String(error) }, 'glob failed');
    return { success: false, error: String(error) };
  }
};

const listDir: ToolFunction = async (input: unknown) => {
  const { path } = input as { path: string };
  logger.debug({ tool: 'ls', path }, 'Executing ls');
  try {
    const entries = await new Promise<string[]>((resolve, reject) => {
      import('fs').then(({ readdir }) => {
        readdir(path, (err, files) => {
          if (err) reject(err);
          else resolve(files.map(f => String(f)));
        });
      });
    });
    logger.info({ tool: 'ls', path, entriesCount: entries.length }, 'ls success');
    return { success: true, entries, path };
  } catch (error) {
    logger.error({ tool: 'ls', path, error: String(error) }, 'ls failed');
    return { success: false, error: String(error), path };
  }
};

const makeDir: ToolFunction = async (input: unknown) => {
  const { path, recursive } = input as { path: string; recursive?: boolean };
  logger.debug({ tool: 'mkdir', path, recursive }, 'Executing mkdir');
  try {
    await new Promise<void>((resolve, reject) => {
      import('fs').then(({ mkdir }) => {
        mkdir(path, { recursive: recursive ?? false }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    logger.info({ tool: 'mkdir', path }, 'mkdir success');
    return { success: true, path };
  } catch (error) {
    logger.error({ tool: 'mkdir', path, error: String(error) }, 'mkdir failed');
    return { success: false, error: String(error), path };
  }
};

const removeFile: ToolFunction = async (input: unknown) => {
  const { path } = input as { path: string };
  logger.debug({ tool: 'rm', path }, 'Executing rm');
  try {
    await new Promise<void>((resolve, reject) => {
      import('fs').then(({ rm }) => {
        rm(path, { force: true }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    logger.info({ tool: 'rm', path }, 'rm success');
    return { success: true, path };
  } catch (error) {
    logger.error({ tool: 'rm', path, error: String(error) }, 'rm failed');
    return { success: false, error: String(error), path };
  }
};

const fileExists: ToolFunction = async (input: unknown) => {
  const { path } = input as { path: string };
  const file = Bun.file(path);
  const exists = await file.exists();
  logger.debug({ tool: 'file_exists', path, exists }, 'file_exists result');
  return { success: true, exists, path };
};

export const fileTools: Tool[] = [
  {
    name: 'read_file',
    description: 'Read contents of a file. Supports partial reading with start/end line numbers.',
    execute: readFile,
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates new file or overwrites existing.',
    execute: writeFile,
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing oldString with newString.',
    execute: editFile,
  },
  {
    name: 'glob',
    description: 'Find files matching a glob pattern.',
    execute: globFiles,
  },
  {
    name: 'ls',
    description: 'List directory contents.',
    execute: listDir,
  },
  {
    name: 'mkdir',
    description: 'Create a directory.',
    execute: makeDir,
  },
  {
    name: 'rm',
    description: 'Remove a file or directory.',
    execute: removeFile,
  },
  {
    name: 'file_exists',
    description: 'Check if a file exists.',
    execute: fileExists,
  },
];
