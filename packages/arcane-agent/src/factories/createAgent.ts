/**
 * Factory - Main factory function untuk create agents
 */

import { logger } from '@arcane/logger';
import type {
  AgentConfig,
  AgentInstance,
  AgentResult,
  StreamEvent,
  AgentState,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalHandler,
  EventHandler,
} from '../types';
import { AgentRegistry } from '../core/AgentRegistry';
import { ChannelBus } from '../core/ChannelBus';
import { AgentSupervisor } from '../core/AgentSupervisor';
import { EventStream } from '../streaming/EventStream';
import { FileAgent } from '../agents/FileAgent';
import { CodeAgent } from '../agents/CodeAgent';
import { ReviewAgent } from '../agents/ReviewAgent';
import { ChatAgent } from '../agents/ChatAgent';

export function createAgent(config: AgentConfig): AgentInstance {
  logger.debug({ name: config.name, hitl: config.hitl }, 'Creating new agent');
  const registry = new AgentRegistry();
  const channels = new ChannelBus();
  const eventStream = new EventStream();

  registry.register(FileAgent);
  registry.register(CodeAgent);
  registry.register(ReviewAgent);
  registry.register(ChatAgent);
  logger.info({ name: config.name, agentsCount: 4 }, 'Core agents registered');

  const supervisor = new AgentSupervisor({
    registry,
    channels,
    hitl: config.hitl,
    promptsDir: config.promptsDir ?? './src/prompts',
  });

  let currentState: AgentState | null = null;

  supervisor.setStreamEmitter((event: StreamEvent) => {
    eventStream.emit(event);
  });

  const agent: AgentInstance = {
    async run(input: string): Promise<AgentResult> {
      logger.debug({ name: config.name, input: input.slice(0, 100) }, 'Agent run started');
      eventStream.emit({
        type: 'start',
        agent: config.name || 'Agent',
        task: input,
      } as StreamEvent);

      const result = await supervisor.orchestrate(input);

      if (result.success) {
        logger.info({ name: config.name }, 'Agent run completed successfully');
        eventStream.emit({
          type: 'complete',
          agent: config.name || 'Agent',
          result: result.output,
        } as StreamEvent);
      } else {
        logger.warn({ name: config.name }, 'Agent run completed with errors');
      }

      currentState = result.state;
      return result;
    },

    async *stream(input: string): AsyncGenerator<StreamEvent> {
      logger.debug({ name: config.name, input: input.slice(0, 100) }, 'Agent stream started');
      eventStream.emit({
        type: 'start',
        agent: config.name || 'Agent',
        task: input,
      } as StreamEvent);

      const result = await supervisor.orchestrate(input);

      yield {
        type: 'complete',
        agent: config.name || 'Agent',
        result: result.output,
      } as StreamEvent;
    },

    getState(): AgentState {
      return currentState!;
    },

    async checkpoint(): Promise<string> {
      logger.debug({ name: config.name }, 'Checkpoint requested');
      return '';
    },

    async restore(_path: string): Promise<void> {
      logger.debug({ name: config.name, path: _path }, 'Restore requested');
    },

    subscribe(channel: string, handler: EventHandler): void {
      channels.subscribe(channel, handler);
    },

    unsubscribe(channel: string, handler: EventHandler): void {
      channels.unsubscribe(channel, handler);
    },

    async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
      logger.debug({ agent: request.agent, action: request.action }, 'Approval requested');
      const hitl = supervisor.getHitlManager();
      return hitl.requestApproval(
        request.agent,
        request.action,
        request.description,
        request.context
      );
    },

    getPendingApprovals(): ApprovalRequest[] {
      return supervisor.getHitlManager().getPendingApprovals();
    },

    setApprovalHandler(handler: ApprovalHandler): void {
      supervisor.getHitlManager().setApprovalHandler(handler);
    },

    setLLMClient(client: unknown): void {
      logger.debug({ name: config.name }, 'LLM client set');
      supervisor.setLLMClient(client as any);
    },
  };

  logger.info({ name: config.name }, 'Agent created successfully');
  return agent;
}
