# Arcane Route

**Zero-drift AI coding. Every claim verified. Every file real.**

Arcane Route is a CLI-based AI coding assistant that enforces **Strict Write Discipline (SWD)** — a verification protocol that cross-checks every file operation the AI claims to have made against the real filesystem using SHA-256 hashes. No hallucinated files. No phantom edits. Every action is verified and logged.

## Features

- **SWD Verification** — Pre/post filesystem snapshots with SHA-256 diffing to verify every AI file operation
- **Multi-Provider** — Supports Anthropic (Claude) and OpenAI (GPT-4o) via a unified interface
- **Extended Thinking** — Adaptive thinking support for Anthropic models with configurable effort levels
- **Memory System** — Persistent `ARCANE_MEMORY.md` logs every session with full action history
- **Dream Compression** — AI-powered memory compression when entries exceed threshold
- **Drift Detection** — Scan codebase vs memory for out-of-sync files
- **Budget Control** — Token and turn limits with real-time cost tracking
- **Correction Loop** — Auto-retry on verification failure (up to 2 attempts before yielding to human)
- **TUI Mode** — Optional terminal UI via OpenTUI for an enhanced interactive experience
- **Plugin System** — Extend functionality with community or custom plugins

## Requirements

- [Bun](https://bun.sh) >= 1.1.0
- Anthropic API key or OpenAI API key

## Installation

```bash
# Clone the repository
git clone https://github.com/arcaneroute/arcaneroute.git
cd arcaneroute

# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env
```

## Configuration

Edit the `.env` file with your API credentials:

```env
# Choose provider: anthropic or openai
LLM_PROVIDER=anthropic

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=          # optional, for custom proxies
ANTHROPIC_MODEL=claude-opus-4-6

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Optional: Enable TUI mode (experimental)
TUI_ENABLED=false
```

## Usage

### Interactive Chat

Start an interactive coding session with SWD verification:

```bash
bun run start chat
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --effort <level>` | Thinking effort: `high`, `medium`, `low` | `high` |
| `--max-tokens <n>` | Max tokens per session | `100,000` |
| `--max-turns <n>` | Max turns per session | `50` |
| `--dry-run` | Preview file operations without executing | - |
| `--verbose` | Show detailed SWD traces and hashes | - |

**Slash Commands (inside chat):**

| Command | Description |
|---------|-------------|
| `/exit` or `/q` | End session |
| `/memory` | Show ARCANE_MEMORY.md status |
| `/clear` | Clear conversation history (memory persists) |
| `/budget` | Show token & turn budget |
| `/verify` | Run inline drift detection |
| `/help` | Show available commands |

### TUI Mode

Enable the experimental terminal UI for an enhanced interactive experience:

```bash
TUI_ENABLED=true bun run start chat
```

The TUI provides:
- Tabbed interface (Chat, Memory, SWD)
- Real-time streaming response display
- Budget visualization
- Console panel (Ctrl+B to toggle)

### Verify

Scan codebase vs `ARCANE_MEMORY.md` for drift:

```bash
bun run start verify
```

**Options:**

| Flag | Description |
|------|-------------|
| `--fix` | Attempt auto-reconciliation of drifted files |
| `--json` | Output results as machine-readable JSON |
| `--dry-run` | Preview without writing to memory |

### Dream

Compress old memory entries using AI summarization:

```bash
bun run start dream
```

**Options:**

| Flag | Description |
|------|-------------|
| `-f, --force` | Force compression even with few entries |
| `--dry-run` | Preview compression without writing |

### Plugin Management

Install plugins to extend Arcane Route's functionality:

```bash
# Install a plugin
bun run start plugin install arcane-plugin-foo

# List installed plugins
bun run start plugin list

# Enable/disable a plugin
bun run start plugin enable arcane-plugin-foo
bun run start plugin disable arcane-plugin-foo

# Uninstall a plugin
bun run start plugin uninstall arcane-plugin-foo
```

## Development

```bash
# Run with hot reload
bun run dev

# Type checking
bun run typecheck

# Run tests
bun test

# Lint
bun run lint

# Format
bun run format

# Lint + format check
bun run check

# Lint + format fix
bun run check:fix
```

## How SWD Works

1. **Pre-capture** — SHA-256 snapshot of all project files before the AI responds
2. **AI Response** — The AI wraps every file operation in `[FILE_ACTION]` blocks
3. **Post-capture** — SHA-256 snapshot after the AI has written files
4. **Verify** — Each claimed action is matched against the actual filesystem diff
5. **Correction** — On mismatch, the AI gets up to 2 retry attempts
6. **Yield** — If corrections fail, control returns to the human

```
[FILE_ACTION]
type: CREATE | MODIFY | DELETE
path: relative/path/to/file
[/FILE_ACTION]
```

## Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **Language** — TypeScript (strict mode)
- **AI SDKs** — `@anthropic-ai/sdk`, `openai`
- **CLI** — `commander`
- **Styling** — `chalk`
- **Linting** — [Biome](https://biomejs.dev)
- **TUI** — [OpenTUI](https://opentui.dev)
