/*
 * arcane-route :: src/filesystem/FilesystemSnapshot.ts
 * Pre/post SHA-256 snapshot engine using Bun native APIs
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { FilesystemPermissionError } from '../types/errors.ts';
import type { SnapshotDiff } from '../types/index.ts';
import type { IgnoreParser } from './IgnoreParser.ts';

export interface FileHashMap {
  [path: string]: string; // relative path → sha256 hex
}

/**
 * Captures a SHA-256 hash map of all files in a directory tree.
 * Uses Bun.file() + Bun.CryptoHasher for native performance.
 */
export class FilesystemSnapshot {
  private readonly hashes: Map<string, string> = new Map();
  public readonly capturedAt: Date;

  private constructor(hashes: Map<string, string>, capturedAt: Date) {
    this.hashes = hashes;
    this.capturedAt = capturedAt;
  }

  /**
   * Walk `rootDir` recursively and hash every non-ignored file using SHA-256.
   * Relies on Bun.file() and Bun.CryptoHasher for native performance.
   * Files that cannot be read (permissions, etc.) are silently skipped.
   * Returns a new FilesystemSnapshot.
   */
  public static async capture(
    rootDir: string,
    ignoreParser: IgnoreParser,
  ): Promise<FilesystemSnapshot> {
    const hashes = new Map<string, string>();
    const files = FilesystemSnapshot.walk(rootDir, rootDir, ignoreParser);

    for (const absPath of files) {
      const relPath = relative(rootDir, absPath);
      try {
        const file = Bun.file(absPath);
        const buffer = await file.arrayBuffer();
        const hasher = new Bun.CryptoHasher('sha256');
        hasher.update(buffer);
        hashes.set(relPath, hasher.digest('hex'));
      } catch {
        // Skip files we can't read (permissions, etc.)
      }
    }

    return new FilesystemSnapshot(hashes, new Date());
  }

  /**
   * Compute the diff between this snapshot (before) and another (after).
   */
  public diff(after: FilesystemSnapshot): SnapshotDiff {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];

    // Check all files in "after"
    for (const [path, afterHash] of after.hashes) {
      const beforeHash = this.hashes.get(path);
      if (beforeHash === undefined) {
        added.push(path);
      } else if (beforeHash !== afterHash) {
        modified.push(path);
      } else {
        unchanged.push(path);
      }
    }

    // Files in "before" but not in "after" → deleted
    for (const path of this.hashes.keys()) {
      if (!after.hashes.has(path)) {
        deleted.push(path);
      }
    }

    return { added, modified, deleted, unchanged };
  }

  /** Check if a relative path exists in this snapshot. */
  public hasFile(path: string): boolean {
    return this.hashes.has(path);
  }

  /** Get the SHA-256 hash of a file, or undefined if not in snapshot. */
  public getHash(path: string): string | undefined {
    return this.hashes.get(path);
  }

  /**
   * Total number of files in this snapshot.
   * Used by SWDEngine to display pre/post file counts in the terminal.
   */
  public get fileCount(): number {
    return this.hashes.size;
  }

  /**
   * Export the snapshot as a plain object (relative path → sha256 hex).
   * Used by DriftDetector to enumerate all live file paths.
   */
  public toJSON(): FileHashMap {
    return Object.fromEntries(this.hashes);
  }

  // Directory Walker

  /**
   * Recursively walk a directory tree, respecting ignore patterns.
   * Stops recursion at depth 12 to prevent runaway traversal on deep trees.
   * @throws {FilesystemPermissionError} if a directory cannot be listed.
   */
  private static walk(
    rootDir: string,
    currentDir: string,
    ignoreParser: IgnoreParser,
    depth = 0,
  ): string[] {
    if (depth > 12) return []; // Safety limit

    const results: string[] = [];

    let entries: import('node:fs').Dirent<string>[];
    try {
      entries = readdirSync(currentDir, { withFileTypes: true, encoding: 'utf-8' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('EACCES') || msg.includes('EPERM')) {
        throw new FilesystemPermissionError(currentDir, 'read');
      }
      return [];
    }

    for (const entry of entries) {
      const absPath = join(currentDir, entry.name);
      const relPath = relative(rootDir, absPath);

      if (ignoreParser.shouldIgnore(entry.name, relPath)) continue;

      if (entry.isDirectory()) {
        results.push(...FilesystemSnapshot.walk(rootDir, absPath, ignoreParser, depth + 1));
      } else if (entry.isFile()) {
        try {
          statSync(absPath); // Verify accessible
          results.push(absPath);
        } catch {
          // Skip inaccessible files
        }
      }
    }

    return results;
  }
}
