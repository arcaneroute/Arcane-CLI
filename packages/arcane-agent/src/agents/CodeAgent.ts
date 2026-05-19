/**
 * CodeAgent - Domain agent untuk code analysis dan manipulation
 * Handle: grep, find, semantic_search, code refactoring
 */

import { logger } from '@arcane/logger';
import type { AgentDefinition, AgentState } from '../types';

export const CodeAgent: AgentDefinition = {
  name: 'CodeAgent',
  description: 'Handles code analysis, manipulation, and refactoring',
  events: ['code.analyzed', 'code.refactored', 'code.explained'],
  tools: [
    {
      name: 'grep',
      description: 'Search for patterns in code',
      execute: async (input: unknown) => {
        const { pattern, path } = input as { pattern: string; path?: string };
        try {
          const { execSync } = await import('child_process');
          const cmd = path
            ? `grep -r "${pattern}" ${path}`
            : `grep -r "${pattern}" .`;
          const result = execSync(cmd, { encoding: 'utf-8' });
          return { success: true, matches: result.split('\n').filter(Boolean) };
        } catch (error) {
          return { success: false, error: String(error), pattern };
        }
      },
    },
    {
      name: 'find_files',
      description: 'Find files by name pattern',
      execute: async (input: unknown) => {
        const { pattern, path } = input as { pattern: string; path?: string };
        try {
          const { execSync } = await import('child_process');
          const cmd = path
            ? `find ${path} -name "${pattern}"`
            : `find . -name "${pattern}"`;
          const result = execSync(cmd, { encoding: 'utf-8' });
          return {
            success: true,
            files: result.split('\n').filter(Boolean),
          };
        } catch (error) {
          return { success: false, error: String(error), pattern };
        }
      },
    },
    {
      name: 'analyze_code',
      description: 'Analyze code structure and quality',
      execute: async (input: unknown) => {
        const { path } = input as { path: string };
        try {
          const content = await Bun.file(path).text();
          const lines = content.split('\n');
          return {
            success: true,
            analysis: {
              path,
              lines: lines.length,
              characters: content.length,
              hasTypescript: path.endsWith('.ts') || path.endsWith('.tsx'),
              hasJsx: path.endsWith('.jsx') || path.endsWith('.tsx'),
            },
          };
        } catch (error) {
          return { success: false, error: String(error), path };
        }
      },
    },
  ],
  node: async (state: AgentState): Promise<AgentState> => {
    const task = state.task.toLowerCase();
    logger.debug({ task: state.task }, 'CodeAgent processing task');

    if (task.includes('search') || task.includes('grep') || task.includes('find')) {
      state.results['action'] = 'grep';
      logger.debug({ action: 'grep' }, 'CodeAgent routing to grep');
    } else if (task.includes('analyze') || task.includes('review') || task.includes('understand')) {
      state.results['action'] = 'analyze_code';
      logger.debug({ action: 'analyze_code' }, 'CodeAgent routing to analyze_code');
    } else if (task.includes('refactor') || task.includes('change') || task.includes('modify')) {
      state.results['action'] = 'refactor';
      logger.debug({ action: 'refactor' }, 'CodeAgent routing to refactor');
    } else {
      state.results['action'] = 'analyze_code';
      logger.debug({ action: 'analyze_code' }, 'CodeAgent routing to analyze_code (default)');
    }

    state.currentAgent = 'CodeAgent';
    logger.info({ agent: 'CodeAgent', action: state.results['action'] }, 'CodeAgent completed');
    return state;
  },
};
