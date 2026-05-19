/*
 * arcane-route :: src/filesystem/SWDEngine.ts
 * Strict Write Discipline — core verifier
 * Parses FILE_ACTION blocks and verifies against real filesystem
 */

import type { EventBus } from '../core/EventBus.ts';
import type {
  FileAction,
  FileActionType,
  SnapshotDiff,
  VerificationResult,
} from '../types/index.ts';
import { FilesystemSnapshot } from './FilesystemSnapshot.ts';
import type { IgnoreParser } from './IgnoreParser.ts';

// Regex to parse [FILE_ACTION] blocks from model output
const FILE_ACTION_REGEX =
  /\[FILE_ACTION\]\s*\n\s*type:\s*(CREATE|MODIFY|DELETE|READ)\s*\n\s*path:\s*(.+?)\s*\n\s*\[\/FILE_ACTION\]/gi;

/**
 * SWD Engine — the core of arcane-route.
 * Lifecycle: preCapture → (AI responds) → postCapture → verify
 */
export class SWDEngine {
  private preSnapshot: FilesystemSnapshot | null = null;
  private postSnapshot: FilesystemSnapshot | null = null;

  constructor(
    private readonly rootDir: string,
    private readonly ignoreParser: IgnoreParser,
    private readonly eventBus: EventBus,
  ) {}

  /** Capture the filesystem state BEFORE the AI responds. */
  public async preCapture(): Promise<void> {
    this.preSnapshot = await FilesystemSnapshot.capture(this.rootDir, this.ignoreParser);
  }

  /** Capture the filesystem state AFTER the AI has written files. */
  public async postCapture(): Promise<void> {
    this.postSnapshot = await FilesystemSnapshot.capture(this.rootDir, this.ignoreParser);
  }

  /** Returns the number of files in the pre-capture snapshot. Zero if not yet captured. */
  public getPreSnapshotFileCount(): number {
    return this.preSnapshot?.fileCount ?? 0;
  }

  /** Returns the number of files in the post-capture snapshot. Zero if not yet captured. */
  public getPostSnapshotFileCount(): number {
    return this.postSnapshot?.fileCount ?? 0;
  }

  /**
   * Parse all [FILE_ACTION] blocks from the model's raw response text.
   */
  public parseClaimedActions(modelResponse: string): FileAction[] {
    const actions: FileAction[] = [];

    // Reset regex state
    FILE_ACTION_REGEX.lastIndex = 0;

    let match = FILE_ACTION_REGEX.exec(modelResponse);
    while (match !== null) {
      const rawType = match[1]?.toUpperCase() ?? '';
      const path = match[2]?.trim() ?? '';
      const rawBlock = match[0];

      if (this.isValidActionType(rawType) && path) {
        actions.push({
          type: rawType as FileActionType,
          path,
          rawBlock,
        });
      }

      match = FILE_ACTION_REGEX.exec(modelResponse);
    }

    return actions;
  }

  /**
   * Verify the AI's claimed file actions against the actual filesystem diff.
   * - Emits `swd:verified` for each successfully matched action.
   * - Emits `swd:mismatch` for each claim that doesn't match the real diff.
   * - Emits `swd:correction_needed` if any action failed verification.
   * READ actions are always considered verified (they don't mutate the filesystem).
   *
   * @throws {Error} if preCapture() or postCapture() has not been called first.
   */
  public verify(claimedActions: FileAction[]): VerificationResult {
    if (!this.preSnapshot || !this.postSnapshot) {
      throw new Error('SWDEngine: must call preCapture() and postCapture() before verify()');
    }

    const diff = this.preSnapshot.diff(this.postSnapshot);
    const verified: FileAction[] = [];
    const failed: FileAction[] = [];
    const unmatched: FileAction[] = [];

    for (const action of claimedActions) {
      const matched = this.matchClaimToDiff(action, diff);

      if (matched) {
        verified.push(action);
        const hash = this.postSnapshot.getHash(action.path) ?? '';
        this.eventBus.emit('swd:verified', { path: action.path, hash });
      } else if (action.type === 'READ') {
        // READ actions are always "verified" — they don't change filesystem
        verified.push(action);
      } else {
        failed.push(action);
        this.eventBus.emit('swd:mismatch', {
          path: action.path,
          expected: action.type,
          actual: this.describeActualState(action, diff),
        });
      }
    }

    // Find diff entries not claimed by any action (untracked writes)
    const allChangedPaths = [...diff.added, ...diff.modified, ...diff.deleted];
    for (const changedPath of allChangedPaths) {
      const wasClaimed = claimedActions.some((a) => a.path === changedPath);
      if (!wasClaimed) {
        unmatched.push({ type: 'MODIFY', path: changedPath, rawBlock: '' });
      }
    }

    const allVerified = failed.length === 0;

    if (!allVerified) {
      this.eventBus.emit('swd:correction_needed', {
        attempt: 1,
        maxAttempts: 2,
        failures: failed.map((a) => a.path),
      });
    }

    return { allVerified, verified, failed, unmatched };
  }

  // Helpers

  /**
   * Returns true if the claimed action matches the actual filesystem diff.
   * MODIFY is lenient: also matches diff.added (file created instead of patched).
   * READ always returns true — it makes no filesystem change.
   */
  private matchClaimToDiff(action: FileAction, diff: SnapshotDiff): boolean {
    switch (action.type) {
      case 'CREATE':
        return diff.added.includes(action.path);
      case 'MODIFY':
        return diff.modified.includes(action.path) || diff.added.includes(action.path);
      case 'DELETE':
        return diff.deleted.includes(action.path);
      case 'READ':
        return true; // READs don't modify filesystem
    }
  }

  /**
   * Returns a human-readable description of what actually happened to a file,
   * used to populate `swd:mismatch` event payloads.
   */
  private describeActualState(action: FileAction, diff: SnapshotDiff): string {
    if (diff.added.includes(action.path)) return 'ADDED';
    if (diff.modified.includes(action.path)) return 'MODIFIED';
    if (diff.deleted.includes(action.path)) return 'DELETED';
    if (diff.unchanged.includes(action.path)) return 'UNCHANGED';
    return 'NOT_FOUND';
  }

  /** TypeScript type guard: validates that a raw string is a known FileActionType. */
  private isValidActionType(type: string): type is FileActionType {
    return ['CREATE', 'MODIFY', 'DELETE', 'READ'].includes(type);
  }
}
