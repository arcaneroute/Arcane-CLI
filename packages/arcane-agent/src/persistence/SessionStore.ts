/**
 * SessionStore - Session history persistence
 */

import { logger } from '@arcane/logger';
import type { Session, Message, AgentState } from '../types';
import { mkdir, readdir, readFile, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';

export interface SessionStoreConfig {
  storagePath: string;
}

export class SessionStore {
  private storagePath: string;

  constructor(config: SessionStoreConfig) {
    this.storagePath = config.storagePath;
    logger.debug({ storagePath: this.storagePath }, 'SessionStore initialized');
  }

  async save(session: Session): Promise<void> {
    logger.debug({ sessionId: session.id, agentId: session.agentId }, 'Saving session');
    const dir = `${this.storagePath}/sessions`;
    await this.ensureDir(dir);

    const filePath = `${dir}/${session.id}.json`;
    const content = JSON.stringify(session, null, 2);
    await writeFile(filePath, content);
    logger.debug({ sessionId: session.id }, 'Session saved');
  }

  async load(id: string): Promise<Session | null> {
    const filePath = `${this.storagePath}/sessions/${id}.json`;
    logger.debug({ sessionId: id }, 'Loading session');

    try {
      const content = await readFile(filePath, 'utf-8');
      const session = JSON.parse(content);
      logger.debug({ sessionId: id }, 'Session loaded');
      return session;
    } catch {
      logger.warn({ sessionId: id }, 'Session not found');
      return null;
    }
  }

  async list(agentId: string): Promise<Session[]> {
    const dir = `${this.storagePath}/sessions`;
    logger.debug({ agentId }, 'Listing sessions');

    try {
      if (!existsSync(dir)) {
        logger.debug('No sessions directory found');
        return [];
      }
      const files = await readdir(dir);
      const sessions: Session[] = [];

      for (const file of files) {
        if (String(file).endsWith('.json')) {
          try {
            const session = await this.load(String(file).replace('.json', '').split('/').pop()!);
            if (session && session.agentId === agentId) {
              sessions.push(session);
            }
          } catch {
          }
        }
      }

      const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      logger.debug({ agentId, count: sorted.length }, 'Sessions listed');
      return sorted;
    } catch (error) {
      logger.error({ agentId, error: String(error) }, 'Failed to list sessions');
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    const filePath = `${this.storagePath}/sessions/${id}.json`;
    logger.info({ sessionId: id }, 'Deleting session');
    try {
      await rm(filePath, { force: true });
      logger.info({ sessionId: id }, 'Session deleted');
    } catch (error) {
      logger.error({ sessionId: id, error: String(error) }, 'Failed to delete session');
    }
  }

  async createSession(
    agentId: string,
    initialMessages: Message[] = []
  ): Promise<Session> {
    logger.info({ agentId, messagesCount: initialMessages.length }, 'Creating new session');
    const session: Session = {
      id: crypto.randomUUID(),
      agentId,
      messages: initialMessages,
      state: {
        task: '',
        context: {},
        messages: initialMessages,
        currentAgent: '',
        channels: {},
        results: {},
        errors: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.save(session);
    logger.info({ sessionId: session.id, agentId }, 'Session created');
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | null> {
    const session = await this.load(id);
    if (!session) {
      logger.warn({ sessionId: id }, 'Session not found for update');
      return null;
    }

    logger.debug({ sessionId: id }, 'Updating session');
    const updated: Session = {
      ...session,
      ...updates,
      id: session.id,
      updatedAt: Date.now(),
    };

    await this.save(updated);
    logger.info({ sessionId: id }, 'Session updated');
    return updated;
  }

  private async ensureDir(path: string): Promise<void> {
    try {
      await mkdir(path, { recursive: true });
    } catch (error) {
      logger.error({ path, error: String(error) }, 'Failed to create sessions directory');
    }
  }
}
