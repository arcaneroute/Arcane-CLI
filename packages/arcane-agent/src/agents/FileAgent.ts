/**
 * FileAgent - Domain agent untuk filesystem operations
 * Handle: read, write, edit, glob, ls, mkdir, rm files
 */

import { logger } from '@arcane/logger';
import { Glob } from 'bun';
import { readdir } from 'fs/promises';
import type { AgentDefinition, AgentState } from '../types';

export const FileAgent: AgentDefinition = {
  name: 'FileAgent',
  description: 'Handles filesystem operations: read, write, edit, glob, ls, mkdir, rm',
  events: ['file.read', 'file.written', 'file.edited', 'file.deleted'],
  tools: [
    {
      name: 'read_file',
      description: 'Read contents of a file',
      execute: async (input: unknown) => {
        const { path } = input as { path: string };
        try {
          const content = await Bun.file(path).text();
          return { success: true, content, path };
        } catch (error) {
          return { success: false, error: String(error), path };
        }
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      execute: async (input: unknown) => {
        const { path, content } = input as { path: string; content: string };
        try {
          await Bun.write(path, content);
          return { success: true, path };
        } catch (error) {
          return { success: false, error: String(error), path };
        }
      },
    },
    {
      name: 'glob',
      description: 'Find files matching a pattern',
      execute: async (input: unknown) => {
        const { pattern, cwd } = input as { pattern: string; cwd?: string };
        try {
          const glob = new Glob(pattern);
          const files: string[] = [];
          for await (const file of glob.scan({ cwd: cwd || process.cwd() })) {
            files.push(file);
          }
          return { success: true, files };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: 'ls',
      description: 'List directory contents',
      execute: async (input: unknown) => {
        const { path } = input as { path: string };
        try {
          const entries = await readdir(path);
          return { success: true, entries: entries.map(String), path };
        } catch (error) {
          return { success: false, error: String(error), path };
        }
      },
    },
  ],
  node: async (state: AgentState): Promise<AgentState> => {
    const task = state.task.toLowerCase();
    logger.debug({ task: state.task }, 'FileAgent processing task');

    if (task.includes('read') || task.includes('show') || task.includes('view')) {
      state.results['action'] = 'read_file';
      logger.debug({ action: 'read_file' }, 'FileAgent routing to read_file');
    } else if (task.includes('write') || task.includes('create') || task.includes('save')) {
      state.results['action'] = 'write_file';
      logger.debug({ action: 'write_file' }, 'FileAgent routing to write_file');
    } else if (task.includes('glob') || task.includes('find') || task.includes('search')) {
      state.results['action'] = 'glob';
      logger.debug({ action: 'glob' }, 'FileAgent routing to glob');
    } else if (task.includes('list') || task.includes('ls')) {
      state.results['action'] = 'ls';
      logger.debug({ action: 'ls' }, 'FileAgent routing to ls');
    } else if (task.includes('delete') || task.includes('remove')) {
      state.results['action'] = 'rm';
      logger.debug({ action: 'rm' }, 'FileAgent routing to rm');
    } else {
      state.results['action'] = 'read_file';
      logger.debug({ action: 'read_file' }, 'FileAgent routing to read_file (default)');
    }

    state.currentAgent = 'FileAgent';
    logger.info({ agent: 'FileAgent', action: state.results['action'] }, 'FileAgent completed');
    return state;
  },
};
