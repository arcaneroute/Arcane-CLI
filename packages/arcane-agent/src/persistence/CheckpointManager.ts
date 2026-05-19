/**
 * CheckpointManager - Graph state checkpointing untuk resume capability
 */

import { logger } from '@arcane/logger';
import type { Checkpoint, AgentState } from '../types';
import { mkdir, readdir, readFile, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';

export interface CheckpointManagerConfig {
  storagePath: string;
  format?: 'json';
}

export class CheckpointManager {
  private storagePath: string;
  private format: 'json';

  constructor(config: CheckpointManagerConfig) {
    this.storagePath = config.storagePath;
    this.format = config.format || 'json';
    logger.debug({ storagePath: this.storagePath, format: this.format }, 'CheckpointManager initialized');
  }

  async save(checkpoint: Checkpoint): Promise<string> {
    logger.debug({ checkpointId: checkpoint.id, agentId: checkpoint.agentId }, 'Saving checkpoint');
    const dir = `${this.storagePath}/${checkpoint.agentId}/checkpoints`;
    await this.ensureDir(dir);

    const fileName = `${checkpoint.timestamp}.${this.format}`;
    const filePath = `${dir}/${fileName}`;

    const content = JSON.stringify(checkpoint, null, 2);
    await writeFile(filePath, content);
    logger.info({ checkpointId: checkpoint.id, agentId: checkpoint.agentId, path: filePath }, 'Checkpoint saved');

    return filePath;
  }

  async load(path: string): Promise<Checkpoint> {
    logger.debug({ path }, 'Loading checkpoint');
    const content = await readFile(path, 'utf-8');
    const checkpoint = JSON.parse(content);
    logger.debug({ checkpointId: checkpoint.id }, 'Checkpoint loaded');
    return checkpoint;
  }

  async list(agentId: string): Promise<Checkpoint[]> {
    const dir = `${this.storagePath}/${agentId}/checkpoints`;
    logger.debug({ agentId }, 'Listing checkpoints');

    try {
      if (!existsSync(dir)) {
        logger.debug({ agentId }, 'No checkpoints directory found');
        return [];
      }
      const files = await readdir(dir);
      const checkpoints: Checkpoint[] = [];

      for (const file of files) {
        if (String(file).endsWith(`.${this.format}`)) {
          try {
            const checkpoint = await this.load(`${dir}/${String(file)}`);
            checkpoints.push(checkpoint);
          } catch (error) {
            logger.warn({ file, error: String(error) }, 'Failed to load checkpoint');
          }
        }
      }

      const sorted = checkpoints.sort((a, b) => b.timestamp - a.timestamp);
      logger.debug({ agentId, count: sorted.length }, 'Checkpoints listed');
      return sorted;
    } catch (error) {
      logger.error({ agentId, error: String(error) }, 'Failed to list checkpoints');
      return [];
    }
  }

  async getLatest(agentId: string): Promise<Checkpoint | null> {
    const checkpoints = await this.list(agentId);
    const latest = checkpoints[0] || null;
    logger.debug({ agentId, hasLatest: latest !== null }, 'Getting latest checkpoint');
    return latest;
  }

  async createCheckpoint(
    agentId: string,
    state: AgentState,
    graphSnapshot?: unknown
  ): Promise<string> {
    logger.info({ agentId, stateKeys: Object.keys(state).length }, 'Creating checkpoint');
    const checkpoint: Checkpoint = {
      id: crypto.randomUUID(),
      agentId,
      timestamp: Date.now(),
      state,
      graphSnapshot,
    };

    return this.save(checkpoint);
  }

  async delete(path: string): Promise<void> {
    logger.debug({ path }, 'Deleting checkpoint');
    await rm(path, { force: true });
    logger.info({ path }, 'Checkpoint deleted');
  }

  async deleteAll(agentId: string): Promise<void> {
    const dir = `${this.storagePath}/${agentId}/checkpoints`;
    logger.info({ agentId }, 'Deleting all checkpoints for agent');
    try {
      await rm(dir, { force: true, recursive: true });
      logger.info({ agentId }, 'All checkpoints deleted');
    } catch (error) {
      logger.error({ agentId, error: String(error) }, 'Failed to delete checkpoints');
    }
  }

  private async ensureDir(path: string): Promise<void> {
    try {
      await mkdir(path, { recursive: true });
    } catch (error) {
      logger.error({ path, error: String(error) }, 'Failed to create directory');
    }
  }
}
