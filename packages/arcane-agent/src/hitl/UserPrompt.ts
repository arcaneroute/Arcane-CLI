/**
 * UserPrompt - Format prompts untuk user consumption
 */

import { logger } from '@arcane/logger';
import type { ApprovalRequest } from '../types';

export interface UserPromptOptions {
  showContext?: boolean;
  showTimestamp?: boolean;
  colorize?: boolean;
}

export class UserPrompt {
  format(
    request: ApprovalRequest,
    options: UserPromptOptions = {}
  ): string {
    logger.debug({ agent: request.agent, action: request.action, requestId: request.id }, 'Formatting user prompt');
    const { showContext = true, showTimestamp = true, colorize = false } = options;

    const lines: string[] = [];
    const divider = colorize ? '\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m' : '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    lines.push(divider);
    lines.push(`${colorize ? '\x1b[36m' : ''}🤖 Agent: ${request.agent}${colorize ? '\x1b[0m' : ''}`);
    lines.push(`${colorize ? '\x1b[33m' : ''}📋 Action: ${request.action}${colorize ? '\x1b[0m' : ''}`);
    lines.push(divider);
    lines.push('');
    lines.push(request.description);
    lines.push('');

    if (showContext && Object.keys(request.context).length > 0) {
      lines.push(divider);
      lines.push('Context:');
      lines.push('```json');
      lines.push(JSON.stringify(request.context, null, 2));
      lines.push('```');
      lines.push(divider);
      lines.push('');
    }

    if (showTimestamp) {
      const date = new Date(request.createdAt).toLocaleString();
      lines.push(`📅 ${date}`);
      lines.push('');
    }

    lines.push(divider);
    lines.push('Your decision:');
    lines.push('  • "y" / "approve" - proceed with action');
    lines.push('  • "n" / "reject" - cancel action');
    lines.push('  • "m <description>" - modify and proceed');
    lines.push(divider);

    const formatted = lines.join('\n');
    logger.debug({ length: formatted.length }, 'User prompt formatted');
    return formatted;
  }

  formatMinimal(request: ApprovalRequest): string {
    const minimal = `[${request.agent}] ${request.action}: ${request.description.slice(0, 100)}`;
    logger.debug({ minimal }, 'Formatted minimal prompt');
    return minimal;
  }
}
