import type { ArcaneEventMap } from './types';

type EventCallback<K extends keyof ArcaneEventMap> = (
  data: ArcaneEventMap[K]
) => void;

export class ArcaneEventBus {
  private listeners = new Map<keyof ArcaneEventMap, Set<EventCallback<any>>>();

  on<K extends keyof ArcaneEventMap>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof ArcaneEventMap>(event: K, callback: EventCallback<K>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof ArcaneEventMap>(event: K, data: ArcaneEventMap[K]): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  once<K extends keyof ArcaneEventMap>(event: K, callback: EventCallback<K>): void {
    const wrapper: EventCallback<K> = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
}

export const arcaneEventBus = new ArcaneEventBus();