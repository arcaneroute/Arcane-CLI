// ─────────────────────────────────────────────────────────────
//  arcane-route :: test/unit/SWDEngine.test.ts
//  Unit tests for SWD parsing and verification
// ─────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'bun:test';
import { ConfigManager } from '../../src/core/ConfigManager.ts';
import { EventBus } from '../../src/core/EventBus.ts';
import { IgnoreParser } from '../../src/filesystem/IgnoreParser.ts';
import { SWDEngine } from '../../src/filesystem/SWDEngine.ts';

describe('SWDEngine.parseClaimedActions()', () => {
  let engine: SWDEngine;

  beforeEach(() => {
    EventBus._reset();
    ConfigManager._reset();
    const config = ConfigManager.getInstance();
    const ignoreParser = new IgnoreParser(config);
    engine = new SWDEngine(process.cwd(), ignoreParser, EventBus.getInstance());
  });

  it('parses a single CREATE block', () => {
    const response = `
I'll create the file now.

[FILE_ACTION]
type: CREATE
path: src/utils/helper.ts
[/FILE_ACTION]

Done!
`;
    const actions = engine.parseClaimedActions(response);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.type).toBe('CREATE');
    expect(actions[0]?.path).toBe('src/utils/helper.ts');
  });

  it('parses multiple FILE_ACTION blocks', () => {
    const response = `
[FILE_ACTION]
type: CREATE
path: src/index.ts
[/FILE_ACTION]

[FILE_ACTION]
type: MODIFY
path: package.json
[/FILE_ACTION]

[FILE_ACTION]
type: DELETE
path: src/old.ts
[/FILE_ACTION]
`;
    const actions = engine.parseClaimedActions(response);
    expect(actions).toHaveLength(3);
    expect(actions[0]?.type).toBe('CREATE');
    expect(actions[1]?.type).toBe('MODIFY');
    expect(actions[2]?.type).toBe('DELETE');
  });

  it('returns empty array when no FILE_ACTION blocks found', () => {
    const response = 'Here is my analysis. No files were changed.';
    const actions = engine.parseClaimedActions(response);
    expect(actions).toHaveLength(0);
  });

  it('ignores malformed blocks without a valid type', () => {
    const response = `
[FILE_ACTION]
type: INVALID_TYPE
path: src/test.ts
[/FILE_ACTION]
`;
    const actions = engine.parseClaimedActions(response);
    expect(actions).toHaveLength(0);
  });

  it('handles READ actions', () => {
    const response = `
[FILE_ACTION]
type: READ
path: src/config.ts
[/FILE_ACTION]
`;
    const actions = engine.parseClaimedActions(response);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.type).toBe('READ');
  });
});
