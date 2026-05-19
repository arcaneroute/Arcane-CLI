/*
 * arcane-route :: src/filesystem/IgnoreParser.ts
 * Parses .arcaneignore with gitignore-compatible syntax
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigManager } from '../core/ConfigManager.ts';

const ARCANEIGNORE_FILE = '.arcaneignore';

/**
 * Parses .arcaneignore and provides pattern matching.
 * Supports: exact names, *.ext wildcards, prefix patterns, directory suffixes.
 */
export class IgnoreParser {
  private patterns: string[];

  constructor(readonly config: ConfigManager) {
    this.patterns = [...config.getIgnorePatterns()];
  }

  /** Load and merge patterns from the .arcaneignore file. */
  public load(rootDir: string): void {
    const ignorePath = resolve(rootDir, ARCANEIGNORE_FILE);
    if (!existsSync(ignorePath)) return;

    try {
      const content = readFileSync(ignorePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;
        this.patterns.push(trimmed);
      }
    } catch {
      // Silently skip unreadable ignore files
    }
  }

  /** Returns all active patterns. */
  public getPatterns(): readonly string[] {
    return this.patterns;
  }

  /**
   * Returns true if the given name or relative path should be ignored.
   */
  public shouldIgnore(name: string, relativePath: string): boolean {
    for (const pattern of this.patterns) {
      if (this.matches(name, relativePath, pattern)) return true;
    }
    return false;
  }

  private matches(name: string, relativePath: string, pattern: string): boolean {
    // Directory pattern: node_modules/ — match by name
    if (pattern.endsWith('/')) {
      return name === pattern.slice(0, -1);
    }

    // Glob: *.ext
    if (pattern.startsWith('*.')) {
      return name.endsWith(pattern.slice(1));
    }

    // Exact name match
    if (name === pattern) return true;

    // Relative path prefix match: e.g. "src/generated"
    if (relativePath.startsWith(pattern)) return true;

    return false;
  }
}
