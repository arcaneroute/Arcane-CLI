import { test, expect, describe } from 'bun:test';
import { ChannelBus } from './ChannelBus';
import type { AgentEvent } from '../types';

describe('ChannelBus', () => {
  test('subscribe and publish', () => {
    const bus = new ChannelBus();
    const received: AgentEvent[] = [];

    bus.subscribe('test-channel', (event) => {
      received.push(event);
    });

    bus.publish('test-channel', {
      type: 'test',
      agent: 'TestAgent',
      payload: { data: 'hello' },
      timestamp: Date.now(),
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('test');
    expect(received[0].agent).toBe('TestAgent');
  });

  test('unsubscribe stops receiving events', () => {
    const bus = new ChannelBus();
    const received: AgentEvent[] = [];

    const handler = (event: AgentEvent) => {
      received.push(event);
    };

    bus.subscribe('test-channel', handler);
    bus.publish('test-channel', {
      type: 'test',
      agent: 'TestAgent',
      payload: {},
      timestamp: Date.now(),
    });

    bus.unsubscribe('test-channel', handler);
    bus.publish('test-channel', {
      type: 'test2',
      agent: 'TestAgent',
      payload: {},
      timestamp: Date.now(),
    });

    expect(received).toHaveLength(1);
  });

  test('multiple handlers on same channel', () => {
    const bus = new ChannelBus();
    const received1: AgentEvent[] = [];
    const received2: AgentEvent[] = [];

    bus.subscribe('test-channel', (e) => { received1.push(e); });
    bus.subscribe('test-channel', (e) => { received2.push(e); });

    bus.publish('test-channel', {
      type: 'test',
      agent: 'TestAgent',
      payload: {},
      timestamp: Date.now(),
    });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  test('async iterator', async () => {
    const bus = new ChannelBus();

    const iterator = bus.createAsyncIterator('async-channel');

    bus.publish('async-channel', {
      type: 'event1',
      agent: 'Agent1',
      payload: {},
      timestamp: Date.now(),
    });

    const result = await iterator.next();
    expect(result.done).toBe(false);
    expect(result.value.type).toBe('event1');

    await iterator.return(undefined);
  });

  test('getChannelNames', () => {
    const bus = new ChannelBus();
    bus.subscribe('channel1', () => {});
    bus.subscribe('channel2', () => {});

    const names = bus.getChannelNames();
    expect(names).toContain('channel1');
    expect(names).toContain('channel2');
  });

  test('hasChannel', () => {
    const bus = new ChannelBus();
    bus.subscribe('exists', () => {});

    expect(bus.hasChannel('exists')).toBe(true);
    expect(bus.hasChannel('not-exists')).toBe(false);
  });

  test('getSubscriberCount', () => {
    const bus = new ChannelBus();
    bus.subscribe('channel', () => {});
    bus.subscribe('channel', () => {});

    expect(bus.getSubscriberCount('channel')).toBe(2);
    expect(bus.getSubscriberCount('nonexistent')).toBe(0);
  });

  test('event history', () => {
    const bus = new ChannelBus(3);

    for (let i = 0; i < 5; i++) {
      bus.publish('history-channel', {
        type: `event${i}`,
        agent: 'TestAgent',
        payload: {},
        timestamp: Date.now(),
      });
    }

    const history = bus.getHistory('history-channel');
    expect(history).toHaveLength(3);
    expect(history[0].type).toBe('event2');
    expect(history[2].type).toBe('event4');
  });
});
