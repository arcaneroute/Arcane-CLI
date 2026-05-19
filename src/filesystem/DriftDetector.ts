/*
 * arcane-route :: src/filesystem/DriftDetector.ts
 * Compares current filesystem against ARCANE_MEMORY.md entries
 */

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { MemoryManager } from '../memory/MemoryManager.ts';
import type { DriftReport } from '../types/index.ts';
import { FilesystemSnapshot } from './FilesystemSnapshot.ts';
import type { IgnoreParser } from './IgnoreParser.ts';

/**
 * Scans the filesystem and compares against ARCANE_MEMORY.md entries.
 * Returns a DriftReport with 4 status categories.
 */
export class DriftDetector {
  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly ignoreParser: IgnoreParser,
    private readonly rootDir: string,
  ) {}

  /**
   * Run a full drift scan against ARCANE_MEMORY.md.
   * - **verified**: paths referenced in memory that still exist on disk.
   * - **drifted**: paths that changed after their last memory entry
   *   (currently not computed — full hash comparison requires stored hashes).
   * - **missing**: paths in memory that no longer exist on disk.
   * - **untracked**: paths on disk that have no memory entry.
   */
  public async scan(): Promise<DriftReport> {
    const entries = await this.memoryManager.getEntries();

    // Extract all file paths mentioned in memory entries
    const memoryPaths = new Set<string>();
    for (const entry of entries) {
      for (const action of entry.actions) {
        memoryPaths.add(action.path);
      }
    }

    // Take a fresh snapshot of the filesystem
    const snapshot = await FilesystemSnapshot.capture(this.rootDir, this.ignoreParser);

    // Walk the live filesystem
    const livePaths = new Set(snapshot.toJSON() ? Object.keys(snapshot.toJSON()) : []);

    const verified: string[] = [];
    const drifted: string[] = [];
    const missing: string[] = [];
    const untracked: string[] = [];

    // Check each path mentioned in memory
    for (const memPath of memoryPaths) {
      if (livePaths.has(memPath)) {
        // File exists — check if it was modified after last memory entry
        // For simplicity: if it's in the snapshot, it's verified
        // (full hash comparison would require storing hashes in memory entries)
        verified.push(memPath);
      } else {
        missing.push(memPath);
      }
    }

    // Find files on disk not mentioned in memory
    for (const livePath of livePaths) {
      if (!memoryPaths.has(livePath)) {
        untracked.push(livePath);
      }
    }

    return { verified, drifted, missing, untracked };
  }

  /**
   * Walk a directory recursively, collecting relative file paths.
   * Respects the IgnoreParser patterns (same patterns used by SWDEngine).
   * @internal Retained for potential future use; scan() currently delegates
   *           file enumeration to FilesystemSnapshot.capture().
   */
  private walkDir(dir: string, results: string[] = []): string[] {
    let entries: import('node:fs').Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const absPath = join(dir, entry.name);
      const relPath = relative(this.rootDir, absPath);

      if (this.ignoreParser.shouldIgnore(entry.name, relPath)) continue;

      if (entry.isDirectory()) {
        this.walkDir(absPath, results);
      } else if (entry.isFile()) {
        results.push(relPath);
      }
    }

    return results;
  }
}
