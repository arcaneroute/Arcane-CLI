/**
 * HumanInteractionManager - HITL approval flow management
 * Agent bertanya & minta approval sebelum eksekusi
 */

import { logger } from '@arcane/logger';
import type {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalHandler,
  HITLConfig,
  StreamEvent,
} from '../types';

export class HumanInteractionManager {
  private approvalQueue: Map<string, ApprovalRequest> = new Map();
  private approvalHandler: ApprovalHandler;
  private enabled: boolean;
  private autoApprove: boolean;
  private timeout?: number;
  private promptFormatter?: (req: ApprovalRequest) => string;
  private streamEmitter?: (event: StreamEvent) => void;

  constructor(config: HITLConfig) {
    this.enabled = config.enabled ?? false;
    this.autoApprove = config.autoApprove ?? false;
    this.timeout = config.timeout;
    this.promptFormatter = config.promptFormatter;
    this.approvalHandler =
      config.approvalHandler ?? this.defaultApprovalHandler.bind(this);
    logger.debug({ enabled: this.enabled, autoApprove: this.autoApprove, timeout: this.timeout }, 'HumanInteractionManager initialized');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setStreamEmitter(emitter: (event: StreamEvent) => void): void {
    this.streamEmitter = emitter;
    logger.debug('Stream emitter set for HITL');
  }

  async requestApproval(
    agent: string,
    action: string,
    description: string,
    context: Record<string, unknown>
  ): Promise<ApprovalResponse> {
    logger.info({ agent, action }, 'Approval requested');

    if (!this.enabled) {
      logger.debug('HITL disabled, auto-approving');
      return {
        requestId: 'disabled',
        decision: 'approve',
      };
    }

    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      agent,
      action,
      description,
      context,
      createdAt: Date.now(),
    };

    this.approvalQueue.set(request.id, request);
    logger.debug({ requestId: request.id, queueSize: this.approvalQueue.size }, 'Request added to queue');

    this.emitStreamEvent({
      type: 'approval_request',
      agent,
      request,
      message: this.formatPrompt(request),
    });

    let response: ApprovalResponse;

    if (this.autoApprove) {
      logger.debug({ requestId: request.id }, 'Auto-approving (autoApprove=true)');
      response = {
        requestId: request.id,
        decision: 'approve',
      };
    } else if (this.timeout) {
      response = await this.waitForResponseWithTimeout(request);
    } else {
      response = await this.approvalHandler(request);
    }

    this.approvalQueue.delete(request.id);
    logger.info({ requestId: request.id, decision: response.decision }, 'Approval response received');

    this.emitStreamEvent({
      type: 'approval_response',
      agent,
      requestId: request.id,
      decision: response.decision,
    });

    return response;
  }

  private async waitForResponseWithTimeout(
    request: ApprovalRequest
  ): Promise<ApprovalResponse> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.approvalQueue.delete(request.id);
        resolve({
          requestId: request.id,
          decision: 'reject',
          feedback: 'Timeout',
        });
      }, this.timeout);

      this.approvalHandler(request).then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
    });
  }

  private async defaultApprovalHandler(
    request: ApprovalRequest
  ): Promise<ApprovalResponse> {
    return new Promise((resolve) => {
      (globalThis as any).__arcane_approval_resolver = (
        requestId: string,
        decision: 'approve' | 'reject',
        feedback?: string
      ) => {
        if (requestId === request.id) {
          resolve({ requestId, decision, feedback });
        }
      };

      setTimeout(() => {
        if (this.approvalQueue.has(request.id)) {
          resolve({
            requestId: request.id,
            decision: 'reject',
            feedback: 'Default timeout',
          });
        }
      }, 30000);
    });
  }

  private formatPrompt(request: ApprovalRequest): string {
    if (this.promptFormatter) {
      return this.promptFormatter(request);
    }

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Agent: ${request.agent}
📋 Action: ${request.action}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${request.description}

Context:
\`\`\`json
${JSON.stringify(request.context, null, 2)}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Approval required. Type:
  • "y" or "approve" to proceed
  • "n" or "reject" to cancel
  • "m <description>" to modify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler;
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalQueue.values());
  }

  private emitStreamEvent(event: StreamEvent): void {
    if (this.streamEmitter) {
      this.streamEmitter(event);
    }
  }
}
