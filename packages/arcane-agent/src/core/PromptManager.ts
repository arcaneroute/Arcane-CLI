/**
 * PromptManager - Centralized prompt loading dan rendering
 * Prompts disimpan sebagai .md files untuk easy editing
 */

import { logger } from '@arcane/logger';

export interface PromptConfig {
  promptsDir: string;
  defaultLocale?: string;
  cachePrompts?: boolean;
}

export class PromptManager {
  private prompts: Map<string, string> = new Map();
  private config: Required<PromptConfig>;

  constructor(config: PromptConfig) {
    this.config = {
      cachePrompts: true,
      defaultLocale: 'en',
      ...config,
    };
    logger.debug({ promptsDir: this.config.promptsDir, cachePrompts: this.config.cachePrompts }, 'PromptManager initialized');
  }

  async load(promptName: string): Promise<string> {
    if (this.config.cachePrompts && this.prompts.has(promptName)) {
      logger.debug({ promptName, cached: true }, 'Loading prompt from cache');
      return this.prompts.get(promptName)!;
    }

    const filePath = this.resolvePath(promptName);
    let content: string;

    try {
      content = await Bun.file(filePath).text();
      logger.debug({ promptName, filePath, cached: false }, 'Prompt loaded from file');
    } catch {
      logger.error({ promptName, filePath }, 'Prompt file not found');
      throw new Error(`Prompt file not found: ${filePath}`);
    }

    if (this.config.cachePrompts) {
      this.prompts.set(promptName, content);
      logger.debug({ promptName, cacheSize: this.prompts.size }, 'Prompt cached');
    }

    return content;
  }

  async render(
    promptName: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    logger.debug({ promptName, variablesCount: Object.keys(variables).length }, 'Rendering prompt');
    let content = await this.load(promptName);

    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    logger.debug({ promptName, renderedLength: content.length }, 'Prompt rendered');
    return content;
  }

  private resolvePath(promptName: string): string {
    const fileName = `${promptName}.md`;
    return `${this.config.promptsDir}/${fileName}`;
  }

  async reload(promptName: string): Promise<void> {
    logger.info({ promptName }, 'Reloading prompt');
    this.prompts.delete(promptName);
    await this.load(promptName);
  }

  async reloadAll(): Promise<void> {
    const size = this.prompts.size;
    this.prompts.clear();
    logger.info({ clearedCount: size }, 'All prompts cleared from cache');
  }

  getCacheSize(): number {
    return this.prompts.size;
  }

  clearCache(): void {
    const size = this.prompts.size;
    this.prompts.clear();
    logger.debug({ clearedCount: size }, 'Prompt cache cleared');
  }
}
