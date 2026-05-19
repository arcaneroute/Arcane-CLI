/**
 * DecisionHandler - Handle user decisions untuk HITL approvals
 */

import { logger } from '@arcane/logger';
import type { ApprovalRequest, ApprovalResponse, ApprovalDecision } from '../types';

export class DecisionHandler {
  parseInput(input: string): {
    decision: ApprovalDecision;
    feedback?: string;
    modifiedParams?: Record<string, unknown>;
  } {
    const trimmed = input.trim().toLowerCase();
    logger.debug({ input: input.slice(0, 50) }, 'Parsing decision input');

    if (trimmed === 'y' || trimmed === 'yes' || trimmed === 'approve') {
      logger.debug({ decision: 'approve' }, 'Decision: approve');
      return { decision: 'approve' };
    }

    if (trimmed === 'n' || trimmed === 'no' || trimmed === 'reject') {
      logger.debug({ decision: 'reject' }, 'Decision: reject');
      return { decision: 'reject' };
    }

    if (trimmed.startsWith('m ') || trimmed.startsWith('modify ')) {
      const description = input.slice(input.indexOf(' ') + 1).trim();
      logger.debug({ decision: 'modify', description: description.slice(0, 50) }, 'Decision: modify');
      return {
        decision: 'modify',
        feedback: description,
        modifiedParams: this.parseModification(description),
      };
    }

    logger.debug({ decision: 'reject', reason: 'Invalid input' }, 'Decision: reject (invalid input)');
    return { decision: 'reject', feedback: 'Invalid input' };
  }

  private parseModification(description: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(description);
      if (typeof parsed === 'object' && parsed !== null) {
        logger.debug('Modification parsed as JSON');
        return parsed;
      }
    } catch {
    }

    logger.debug({ description: description.slice(0, 50) }, 'Modification parsed as description');
    return { description };
  }

  async handleDecision(
    request: ApprovalRequest,
    input: string
  ): Promise<ApprovalResponse> {
    logger.info({ requestId: request.id, agent: request.agent }, 'Handling decision');
    const parsed = this.parseInput(input);

    return {
      requestId: request.id,
      decision: parsed.decision,
      feedback: parsed.feedback,
      modifiedParams: parsed.modifiedParams,
    };
  }
}
