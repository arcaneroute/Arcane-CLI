import { test, expect, describe } from 'bun:test';
import { AgentRegistry } from './AgentRegistry';
import type { AgentDefinition } from '../types';

describe('AgentRegistry', () => {
  const createMockAgent = (name: string, events?: string[]): AgentDefinition => ({
    name,
    description: `Mock agent: ${name}`,
    tools: [],
    node: async (state) => state,
    events,
  });

  test('register and get agent', () => {
    const registry = new AgentRegistry();
    const agent = createMockAgent('TestAgent');

    registry.register(agent);
    expect(registry.get('TestAgent')).toBe(agent);
  });

  test('unregister agent', () => {
    const registry = new AgentRegistry();
    const agent = createMockAgent('TestAgent');

    registry.register(agent);
    registry.unregister('TestAgent');
    expect(registry.get('TestAgent')).toBeUndefined();
  });

  test('getAvailableAgents', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('Agent1'));
    registry.register(createMockAgent('Agent2'));

    const agents = registry.getAvailableAgents();
    expect(agents).toContain('Agent1');
    expect(agents).toContain('Agent2');
  });

  test('getAgentTools', () => {
    const registry = new AgentRegistry();
    registry.register({
      name: 'ToolAgent',
      description: 'Test',
      tools: [
        { name: 'tool1', description: 't1', execute: async () => {} },
        { name: 'tool2', description: 't2', execute: async () => {} },
      ],
      node: async (state) => state,
    });

    const tools = registry.getAgentTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain('tool1');
    expect(tools.map((t) => t.name)).toContain('tool2');
  });

  test('has method', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('Exists'));

    expect(registry.has('Exists')).toBe(true);
    expect(registry.has('NotExists')).toBe(false);
  });

  test('getAll method', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('Agent1'));
    registry.register(createMockAgent('Agent2'));

    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  test('getByEvent method', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('Agent1', ['event1', 'event2']));
    registry.register(createMockAgent('Agent2', ['event2']));
    registry.register(createMockAgent('Agent3', ['event3']));

    const agents = registry.getByEvent('event2');
    expect(agents).toHaveLength(2);
    expect(agents.map((a) => a.name)).toContain('Agent1');
    expect(agents.map((a) => a.name)).toContain('Agent2');
  });

  test('clear method', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('Agent1'));
    registry.register(createMockAgent('Agent2'));

    registry.clear();
    expect(registry.size()).toBe(0);
  });

  test('size method', () => {
    const registry = new AgentRegistry();
    expect(registry.size()).toBe(0);

    registry.register(createMockAgent('Agent1'));
    expect(registry.size()).toBe(1);

    registry.register(createMockAgent('Agent2'));
    expect(registry.size()).toBe(2);
  });

  test('overwrite warning on duplicate registration', () => {
    const registry = new AgentRegistry();
    registry.register(createMockAgent('TestAgent'));
    registry.register(createMockAgent('TestAgent'));

    expect(registry.size()).toBe(1);
  });
});
