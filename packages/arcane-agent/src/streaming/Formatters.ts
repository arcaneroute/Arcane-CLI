/**
 * Formatters - Event formatters untuk output
 */

import { logger } from '@arcane/logger';
import type { StreamEvent } from '../types';

export interface FormatterOptions {
  colorize?: boolean;
  showTimestamp?: boolean;
  compact?: boolean;
}

export class ConsoleFormatter {
  private options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      colorize: options.colorize ?? true,
      showTimestamp: options.showTimestamp ?? false,
      compact: options.compact ?? false,
    };
  }

  format(event: StreamEvent): string {
    switch (event.type) {
      case 'start':
        return this.formatStart(event);
      case 'thought':
        return this.formatThought(event);
      case 'tool_call':
        return this.formatToolCall(event);
      case 'tool_result':
        return this.formatToolResult(event);
      case 'agent_handoff':
        return this.formatAgentHandoff(event);
      case 'channel_publish':
        return this.formatChannelPublish(event);
      case 'error':
        return this.formatError(event);
      case 'checkpoint':
        return this.formatCheckpoint(event);
      case 'complete':
        return this.formatComplete(event);
      case 'progress':
        return this.formatProgress(event);
      case 'approval_request':
        return this.formatApprovalRequest(event);
      case 'approval_response':
        return this.formatApprovalResponse(event);
      case 'waiting_input':
        return this.formatWaitingInput(event);
      default:
        return this.formatUnknown(event);
    }
  }

  private color(text: string, code: string): string {
    return this.options.colorize ? `${code}${text}\x1b[0m` : text;
  }

  private dim(text: string): string {
    return this.color(text, '\x1b[2m');
  }

  private cyan(text: string): string {
    return this.color(text, '\x1b[36m');
  }

  private yellow(text: string): string {
    return this.color(text, '\x1b[33m');
  }

  private green(text: string): string {
    return this.color(text, '\x1b[32m');
  }

  private red(text: string): string {
    return this.color(text, '\x1b[31m');
  }

  private magenta(text: string): string {
    return this.color(text, '\x1b[35m');
  }

  private formatStart(event: StreamEvent & { type: 'start' }): string {
    return this.cyan(`[${event.agent}] Starting task: ${event.task}`);
  }

  private formatThought(event: StreamEvent & { type: 'thought' }): string {
    return this.dim(`[${event.agent}] 💭 ${event.content}`);
  }

  private formatToolCall(event: StreamEvent & { type: 'tool_call' }): string {
    return this.yellow(`[${event.agent}] 🔧 ${event.tool}`);
  }

  private formatToolResult(
    event: StreamEvent & { type: 'tool_result' }
  ): string {
    const output =
      typeof event.output === 'string'
        ? event.output.slice(0, 100)
        : JSON.stringify(event.output).slice(0, 100);
    return this.green(`[${event.agent}] ✅ ${event.tool}: ${output}`);
  }

  private formatAgentHandoff(
    event: StreamEvent & { type: 'agent_handoff' }
  ): string {
    return this.magenta(`[${event.from}] → [${event.to}]: ${event.reason}`);
  }

  private formatChannelPublish(
    event: StreamEvent & { type: 'channel_publish' }
  ): string {
    return this.dim(`[${event.agent}] 📢 ${event.channel}`);
  }

  private formatError(event: StreamEvent & { type: 'error' }): string {
    const recoverable = event.recoverable ? ' (recoverable)' : '';
    return this.red(`[${event.agent}] ❌ ${event.error}${recoverable}`);
  }

  private formatCheckpoint(
    event: StreamEvent & { type: 'checkpoint' }
  ): string {
    return this.dim(`[${event.agent}] 💾 Checkpoint: ${event.path}`);
  }

  private formatComplete(event: StreamEvent & { type: 'complete' }): string {
    const result =
      typeof event.result === 'string'
        ? event.result
        : JSON.stringify(event.result).slice(0, 100);
    return this.green(`🎉 Complete: ${result}`);
  }

  private formatProgress(event: StreamEvent & { type: 'progress' }): string {
    const bar = '█'.repeat(Math.floor(event.progress * 20));
    const empty = '░'.repeat(20 - Math.floor(event.progress * 20));
    return `[${event.agent}] ${bar}${empty} ${Math.floor(event.progress * 100)}% ${event.message}`;
  }

  private formatApprovalRequest(
    event: StreamEvent & { type: 'approval_request' }
  ): string {
    return `${this.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${this.yellow('🤖 Agent:')} ${event.agent}
${this.yellow('📋 Action:')} ${event.request.action}
${this.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${event.message}
${this.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`;
  }

  private formatApprovalResponse(
    event: StreamEvent & { type: 'approval_response' }
  ): string {
    const decision =
      event.decision === 'approve'
        ? this.green('APPROVED')
        : event.decision === 'modify'
        ? this.yellow('MODIFIED')
        : this.red('REJECTED');
    return `[${event.agent}] Approval: ${decision}`;
  }

  private formatWaitingInput(
    event: StreamEvent & { type: 'waiting_input' }
  ): string {
    return this.cyan(`[${event.agent}] ⏳ Waiting: ${event.reason}`);
  }

  private formatUnknown(event: StreamEvent): string {
    return JSON.stringify(event);
  }
}

export class JsonFormatter {
  format(event: StreamEvent): string {
    return JSON.stringify(event);
  }

  parse(input: string): StreamEvent | null {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
}
