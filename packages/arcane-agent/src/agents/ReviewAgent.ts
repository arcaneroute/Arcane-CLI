/**
 * ReviewAgent - Domain agent untuk code review dan PR analysis
 * Handle: git_status, git_diff, git_log, code quality checks
 */

import { logger } from '@arcane/logger';
import type { AgentDefinition, AgentState } from '../types';

export const ReviewAgent: AgentDefinition = {
  name: 'ReviewAgent',
  description: 'Handles code review, PR analysis, and quality checks',
  events: ['review.started', 'review.completed', 'review.issues_found'],
  tools: [
    {
      name: 'git_status',
      description: 'Get git repository status',
      execute: async (input?: unknown) => {
        try {
          const { execSync } = await import('child_process');
          const result = execSync('git status --porcelain', { encoding: 'utf-8' });
          return { success: true, status: result || 'Clean working directory' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: 'git_diff',
      description: 'Get git diff output',
      execute: async (input?: unknown) => {
        try {
          const { execSync } = await import('child_process');
          const result = execSync('git diff --stat', { encoding: 'utf-8' });
          return { success: true, diff: result };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: 'git_log',
      description: 'Get recent git commits',
      execute: async (input?: unknown) => {
        const { count = 10 } = (input as { count?: number }) || {};
        try {
          const { execSync } = await import('child_process');
          const result = execSync(`git log --oneline -n ${count}`, { encoding: 'utf-8' });
          return { success: true, commits: result.split('\n').filter(Boolean) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: 'check_code_quality',
      description: 'Run code quality checks',
      execute: async (input: unknown) => {
        const { path } = input as { path: string };
        try {
          return {
            success: true,
            checks: {
              path,
              hasTests: false,
              hasDocumentation: false,
              lintScore: 0,
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
    logger.debug({ task: state.task }, 'ReviewAgent processing task');

    if (task.includes('pr ') || task.includes('pull request')) {
      state.results['action'] = 'review_pr';
      logger.debug({ action: 'review_pr' }, 'ReviewAgent routing to review_pr');
    } else if (task.includes('diff') || task.includes('changes')) {
      state.results['action'] = 'git_diff';
      logger.debug({ action: 'git_diff' }, 'ReviewAgent routing to git_diff');
    } else if (task.includes('status') || task.includes('state')) {
      state.results['action'] = 'git_status';
      logger.debug({ action: 'git_status' }, 'ReviewAgent routing to git_status');
    } else if (task.includes('log') || task.includes('history') || task.includes('commits')) {
      state.results['action'] = 'git_log';
      logger.debug({ action: 'git_log' }, 'ReviewAgent routing to git_log');
    } else if (task.includes('quality') || task.includes('check')) {
      state.results['action'] = 'check_code_quality';
      logger.debug({ action: 'check_code_quality' }, 'ReviewAgent routing to check_code_quality');
    } else {
      state.results['action'] = 'git_status';
      logger.debug({ action: 'git_status' }, 'ReviewAgent routing to git_status (default)');
    }

    state.currentAgent = 'ReviewAgent';
    logger.info({ agent: 'ReviewAgent', action: state.results['action'] }, 'ReviewAgent completed');
    return state;
  },
};
