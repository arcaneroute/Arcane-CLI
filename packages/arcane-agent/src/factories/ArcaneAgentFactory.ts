/**
 * ArcaneAgentFactory - Main factory class
 */

import { logger } from '@arcane/logger';
import type { AgentInstance, Tool, HITLConfig, StreamEvent, AgentState, ApprovalRequest, ApprovalResponse, ApprovalHandler, EventHandler } from '../types';
import { AgentRegistry } from '../core/AgentRegistry';
import { ChannelBus } from '../core/ChannelBus';
import { AgentSupervisor } from '../core/AgentSupervisor';
import { EventStream } from '../streaming/EventStream';
import { FileAgent } from '../agents/FileAgent';
import { CodeAgent } from '../agents/CodeAgent';
import { ReviewAgent } from '../agents/ReviewAgent';
import { ChatAgent } from '../agents/ChatAgent';

export interface ArcaneAgentFactoryConfig {
  pluginsDir?: string[];
  tools?: Tool[];
  hitl?: HITLConfig;
  promptsDir?: string;
}

export class ArcaneAgentFactory {
  private config: ArcaneAgentFactoryConfig;

  constructor(config: ArcaneAgentFactoryConfig = {}) {
    this.config = {
      pluginsDir: [],
      tools: [],
      hitl: { enabled: false },
      promptsDir: './src/prompts',
      ...config,
    };
  }

  create(): AgentInstance {
    const registry = new AgentRegistry();
    const channels = new ChannelBus();
    const eventStream = new EventStream();

    registry.register(FileAgent);
    registry.register(CodeAgent);
    registry.register(ReviewAgent);
    registry.register(ChatAgent);

    const supervisor = new AgentSupervisor({
      registry,
      channels,
      hitl: this.config.hitl,
      promptsDir: this.config.promptsDir,
    });

    let currentState: AgentState | null = null;

    supervisor.setStreamEmitter((event: StreamEvent) => {
      eventStream.emit(event);
    });

    const agent: AgentInstance = {
      async run(input: string) {
        eventStream.emit({
          type: 'start',
          agent: 'FactoryAgent',
          task: input,
        } as StreamEvent);

        const result = await supervisor.orchestrate(input);
        currentState = result.state;

        eventStream.emit({
          type: 'complete',
          agent: 'FactoryAgent',
          result: result.output,
        } as StreamEvent);

        return result;
      },

      async *stream(input: string): AsyncGenerator<StreamEvent> {
        eventStream.emit({
          type: 'start',
          agent: 'FactoryAgent',
          task: input,
        } as StreamEvent);

        yield {
          type: 'start',
          agent: 'FactoryAgent',
          task: input,
        } as StreamEvent;

        const result = await supervisor.orchestrate(input);

        yield {
          type: 'complete',
          agent: 'FactoryAgent',
          result: result.output,
        } as StreamEvent;
      },

      getState(): AgentState {
        return currentState!;
      },

      async checkpoint(): Promise<string> {
        return '';
      },

      async restore(): Promise<void> {
      },

      subscribe(channel: string, handler: EventHandler): void {
        channels.subscribe(channel, handler);
      },

      unsubscribe(channel: string, handler: EventHandler): void {
        channels.unsubscribe(channel, handler);
      },

      async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
        return supervisor.getHitlManager().requestApproval(
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
        supervisor.setLLMClient(client as any);
      },
    };

    return agent;
  }
}
