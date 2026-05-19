/**
 * Integration tests for Arcane Agent
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createAgent } from '../../src/factories/createAgent';
import { createCodeReviewAgent } from '../../src/factories/agents/codeReviewAgent';
import { createTaskAutomationAgent } from '../../src/factories/agents/taskAutomationAgent';
import { createChatAgent } from '../../src/factories/agents/chatAgent';
import { AgentRegistry } from '../../src/core/AgentRegistry';
import { ChannelBus } from '../../src/core/ChannelBus';
import { FileAgent } from '../../src/agents/FileAgent';
import { CodeAgent } from '../../src/agents/CodeAgent';
import { ReviewAgent } from '../../src/agents/ReviewAgent';
import { ChatAgent } from '../../src/agents/ChatAgent';

describe('ArcaneAgent Integration', () => {
  test('createAgent creates an agent instance', () => {
    const agent = createAgent({ type: 'chat', name: 'TestAgent' });
    expect(agent).toBeDefined();
    expect(typeof agent.run).toBe('function');
    expect(typeof agent.stream).toBe('function');
  });

  test('createCodeReviewAgent creates code review agent', () => {
    const agent = createCodeReviewAgent({ name: 'PRReviewer' });
    expect(agent).toBeDefined();
  });

  test('createTaskAutomationAgent creates task automation agent', () => {
    const agent = createTaskAutomationAgent({ name: 'Automator' });
    expect(agent).toBeDefined();
  });

  test('createChatAgent creates chat agent', () => {
    const agent = createChatAgent({ name: 'ChatBot' });
    expect(agent).toBeDefined();
  });
});

describe('AgentRegistry Integration', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  test('can register and retrieve agents', () => {
    registry.register(FileAgent);
    registry.register(CodeAgent);
    registry.register(ReviewAgent);
    registry.register(ChatAgent);

    expect(registry.has('FileAgent')).toBe(true);
    expect(registry.has('CodeAgent')).toBe(true);
    expect(registry.has('ReviewAgent')).toBe(true);
    expect(registry.has('ChatAgent')).toBe(true);
  });

  test('getAvailableAgents returns all registered agents', () => {
    registry.register(FileAgent);
    registry.register(CodeAgent);
    registry.register(ReviewAgent);
    registry.register(ChatAgent);

    const agents = registry.getAvailableAgents();
    expect(agents).toContain('FileAgent');
    expect(agents).toContain('CodeAgent');
    expect(agents).toContain('ReviewAgent');
    expect(agents).toContain('ChatAgent');
  });

  test('getAgentTools returns tools from all agents', () => {
    registry.register(FileAgent);
    registry.register(CodeAgent);
    registry.register(ReviewAgent);
    registry.register(ChatAgent);

    const tools = registry.getAgentTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'read_file')).toBe(true);
    expect(tools.some((t) => t.name === 'git_status')).toBe(true);
  });
});

describe('ChannelBus Integration', () => {
  let bus: ChannelBus;

  beforeEach(() => {
    bus = new ChannelBus();
  });

  test('can subscribe and publish events', () => {
    const received: unknown[] = [];
    bus.subscribe('test', (event) => received.push(event));

    bus.publish('test', { type: 'test', agent: 'Test', payload: {}, timestamp: Date.now() });

    expect(received).toHaveLength(1);
  });

  test('can unsubscribe from events', () => {
    const received: unknown[] = [];
    const handler = (event: unknown) => received.push(event);

    bus.subscribe('test', handler);
    bus.publish('test', { type: 'test', agent: 'Test', payload: {}, timestamp: Date.now() });

    bus.unsubscribe('test', handler);
    bus.publish('test', { type: 'test2', agent: 'Test', payload: {}, timestamp: Date.now() });

    expect(received).toHaveLength(1);
  });

  test('getChannelNames returns all channels', () => {
    bus.subscribe('channel1', () => {});
    bus.subscribe('channel2', () => {});

    const names = bus.getChannelNames();
    expect(names).toContain('channel1');
    expect(names).toContain('channel2');
  });
});

describe('Agent Execution', () => {
  test('agent instance is created correctly', () => {
    const agent = createAgent({ type: 'chat', name: 'TestAgent' });
    expect(agent).toBeDefined();
    expect(typeof agent.run).toBe('function');
    expect(typeof agent.getState).toBe('function');
  });

  test('agent can stream events', async () => {
    const agent = createAgent({ type: 'chat', name: 'TestAgent' });
    const stream = agent.stream('Hello');

    expect(stream).toBeDefined();
    expect(typeof stream.next).toBe('function');
  });
});
