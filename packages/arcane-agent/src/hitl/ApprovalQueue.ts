/**
 * ApprovalQueue - Pending approval queue untuk HITL
 */

import { logger } from '@arcane/logger';
import type { ApprovalRequest, ApprovalResponse } from '../types';

export class ApprovalQueue {
  private queue: ApprovalRequest[] = [];
  private resolvers: Map<string, (r: ApprovalResponse) => void> = new Map();

  async enqueue(request: ApprovalRequest): Promise<ApprovalResponse> {
    logger.debug({ requestId: request.id, agent: request.agent, queueSize: this.queue.length }, 'Approval request enqueued');
    this.queue.push(request);

    return new Promise((resolve) => {
      this.resolvers.set(request.id, resolve);
    });
  }

  respond(response: ApprovalResponse): void {
    const resolver = this.resolvers.get(response.requestId);
    if (resolver) {
      logger.debug({ requestId: response.requestId, decision: response.decision }, 'Approval response sent');
      resolver(response);
      this.resolvers.delete(response.requestId);
      this.queue = this.queue.filter((r) => r.id !== response.requestId);
    } else {
      logger.warn({ requestId: response.requestId }, 'No pending request found for response');
    }
  }

  getPending(): ApprovalRequest[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  hasPending(requestId: string): boolean {
    return this.queue.some((r) => r.id === requestId);
  }

  clear(): void {
    const clearedCount = this.queue.length;
    for (const resolver of this.resolvers.values()) {
      resolver({
        requestId: '',
        decision: 'reject',
        feedback: 'Queue cleared',
      });
    }
    this.queue = [];
    this.resolvers.clear();
    logger.info({ clearedCount }, 'Approval queue cleared');
  }
}
