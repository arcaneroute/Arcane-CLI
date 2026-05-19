/*
 * arcane-route :: src/core/EventBus.ts
 * Typed pub/sub event bus for decoupled service communication
 */

import { EventEmitter } from 'node:events';
import type { ArcaneEvent } from '../types/index.ts';

/**
 * Strongly-typed payload map for every ArcaneEvent.
 * Keys are event names; values are the payload shape emitted with that event.
 */
export interface ArcaneEventPayloads {
  'swd:verified': { path: string; hash: string };
  'swd:mismatch': { path: string; expected: string; actual: string };
  'swd:correction_needed': { attempt: number; maxAttempts: number; failures: string[] };
  'swd:yield_to_human': { failures: string[] };
  'memory:entry_added': { entryCount: number };
  'memory:compressed': { before: number; after: number; ratio: number };
  'budget:warning': { tokensPercent: number; turnsPercent: number };
  'budget:exceeded': { reason: string };
  'chat:turn_complete': { turn: number; tokensUsed: number };
  /** Plugin custom events with namespace plugin:{pluginId}:{action} */
  [key: `plugin:${string}`]: unknown;
}

/**
 * Singleton, strongly-typed EventBus for decoupled service communication.
 * Extends Node's EventEmitter with compile-time ArcaneEvent type safety.
 * Services must emit and subscribe via this class — never couple directly.
 */
export class EventBus extends EventEmitter {
  private static _instance: EventBus | null = null;

  private constructor() {
    super();
    // Increase max listeners to avoid warnings from multiple command subscribers
    this.setMaxListeners(20);
  }

  /**
   * Returns the singleton EventBus instance, creating it on first call.
   * All modules should obtain the bus via this method.
   */
  public static getInstance(): EventBus {
    EventBus._instance ??= new EventBus();
    return EventBus._instance;
  }

  /** @internal Reset singleton — for unit testing only. Do NOT call in production code. */
  public static _reset(): void {
    EventBus._instance = null;
  }

  /** Emit a typed arcane event with its associated payload. */
  public override emit<E extends ArcaneEvent>(event: E, payload?: ArcaneEventPayloads[E]): boolean {
    return super.emit(event, payload);
  }

  /** Subscribe to a typed arcane event. */
  public override on<E extends ArcaneEvent>(
    event: E,
    listener: (payload: ArcaneEventPayloads[E]) => void,
  ): this {
    return super.on(event, listener);
  }

  /** Subscribe once to a typed arcane event. */
  public override once<E extends ArcaneEvent>(
    event: E,
    listener: (payload: ArcaneEventPayloads[E]) => void,
  ): this {
    return super.once(event, listener);
  }

  /** Remove a listener from a typed arcane event. */
  public override off<E extends ArcaneEvent>(
    event: E,
    listener: (payload: ArcaneEventPayloads[E]) => void,
  ): this {
    return super.off(event, listener);
  }

  /**
   * Remove all listeners from every event channel.
   * Call during graceful shutdown (ArcaneApp.shutdown) to prevent memory leaks.
   */
  public removeAllArcaneListeners(): void {
    this.removeAllListeners();
  }
}
