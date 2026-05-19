/**
 * MemoryStore - Long-term memory context persistence
 */

import { logger } from '@arcane/logger';
import type { Message } from '../types';
import { mkdir, readFile, writeFile } from 'fs/promises';

export interface MemoryEntry {
  id: string;
  content: string;
  context: string;
  timestamp: number;
  tags: string[];
}

export interface MemoryStoreConfig {
  storagePath: string;
  maxEntries?: number;
}

export class MemoryStore {
  private storagePath: string;
  private maxEntries: number;
  private memoryFile: string;

  constructor(config: MemoryStoreConfig) {
    this.storagePath = config.storagePath;
    this.maxEntries = config.maxEntries || 1000;
    this.memoryFile = `${this.storagePath}/memory.json`;
    logger.debug({ storagePath: this.storagePath, maxEntries: this.maxEntries }, 'MemoryStore initialized');
  }

  async add(content: string, context: string, tags: string[] = []): Promise<MemoryEntry> {
    logger.debug({ contentLength: content.length, context, tags }, 'Adding memory entry');
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      context,
      timestamp: Date.now(),
      tags,
    };

    const memories = await this.getAll();
    memories.unshift(entry);

    if (memories.length > this.maxEntries) {
      memories.pop();
    }

    await this.saveAll(memories);
    logger.info({ entryId: entry.id, totalEntries: memories.length }, 'Memory entry added');
    return entry;
  }

  async getAll(): Promise<MemoryEntry[]> {
    try {
      const content = await readFile(this.memoryFile, 'utf-8');
      const memories = JSON.parse(content);
      logger.debug({ count: memories.length }, 'Memory entries loaded');
      return memories;
    } catch {
      logger.debug('No memory file found, returning empty array');
      return [];
    }
  }

  async search(query: string): Promise<MemoryEntry[]> {
    logger.debug({ query }, 'Searching memory');
    const memories = await this.getAll();
    const queryLower = query.toLowerCase();

    const results = memories.filter(
      (m) =>
        m.content.toLowerCase().includes(queryLower) ||
        m.context.toLowerCase().includes(queryLower) ||
        m.tags.some((t) => t.toLowerCase().includes(queryLower))
    );
    logger.debug({ query, resultsCount: results.length }, 'Memory search completed');
    return results;
  }

  async getRecent(limit: number = 10): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    return memories.slice(0, limit);
  }

  async getByTag(tag: string): Promise<MemoryEntry[]> {
    const memories = await this.getAll();
    return memories.filter((m) => m.tags.includes(tag));
  }

  async delete(id: string): Promise<boolean> {
    const memories = await this.getAll();
    const index = memories.findIndex((m) => m.id === id);

    if (index === -1) {
      logger.warn({ id }, 'Memory entry not found for deletion');
      return false;
    }

    memories.splice(index, 1);
    await this.saveAll(memories);
    logger.info({ id, remainingEntries: memories.length }, 'Memory entry deleted');
    return true;
  }

  async clear(): Promise<void> {
    logger.info('Clearing all memory entries');
    await this.saveAll([]);
  }

  async getContextString(limit: number = 5): Promise<string> {
    const recent = await this.getRecent(limit);
    if (recent.length === 0) return '';

    const context = recent
      .map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.content}`)
      .join('\n');
    logger.debug({ limit, entries: recent.length, contextLength: context.length }, 'Memory context string generated');
    return context;
  }

  private async saveAll(memories: MemoryEntry[]): Promise<void> {
    await this.ensureDir(this.storagePath);
    const content = JSON.stringify(memories, null, 2);
    await writeFile(this.memoryFile, content);
    logger.debug({ entries: memories.length }, 'Memory saved to disk');
  }

  private async ensureDir(path: string): Promise<void> {
    try {
      await mkdir(path, { recursive: true });
    } catch (error) {
      logger.error({ path, error: String(error) }, 'Failed to create memory directory');
    }
  }
}
