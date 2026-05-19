# @arcane-route/plugin-sdk

Official SDK for building plugins for Arcane Route.

## Installation

```bash
bun add -d @arcane-route/plugin-sdk
# or
npm install -D @arcane-route/plugin-sdk
```

## Quick Start

### 1. Create your plugin project

```bash
mkdir arcane-plugin-my-feature
cd arcane-plugin-my-feature
bun init
```

### 2. Create `plugin.manifest.json`

```json
{
  "id": "arcane-plugin-my-feature",
  "name": "My Feature",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "author": "Your Name <you@example.com>",
  "arcaneVersion": ">=1.0.0",
  "entrypoint": "index.ts",
  "hooks": ["chat:turn_complete"],
  "permissions": ["fs:read"]
}
```

### 3. Implement your plugin in `index.ts`

```typescript
import { definePlugin, PERMISSIONS } from '@arcane-route/plugin-sdk';

const plugin = definePlugin({
  async onLoad(ctx) {
    ctx.logger.info('My plugin loaded!');

    ctx.events.on('chat:turn_complete', (payload) => {
      ctx.logger.info(`Turn ${payload.turn} completed with ${payload.tokensUsed} tokens`);
    });

    ctx.commands.register('/mycommand', async (args) => {
      ctx.ui.printSuccess('Hello from my plugin!');
    });
  },

  async onUnload(ctx) {
    ctx.logger.info('My plugin unloaded');
  },
});

export default plugin;
```

### 4. Test locally

```bash
arcane plugin install ./arcane-plugin-my-feature
arcane chat
```

## API Reference

### Core Types

#### `ArcanePlugin`

The main plugin interface. Your plugin must export a default object conforming to this.

```typescript
interface ArcanePlugin {
  onLoad(ctx: PluginContext): Promise<void>;
  onUnload(ctx: PluginContext): Promise<void>;
}
```

#### `PluginContext`

The sandboxed API surface available to plugins.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Plugin ID from manifest |
| `arcaneVersion` | `string` | Running Arcane Route version |
| `logger` | `PluginLogger` | Isolated logger with prefix |
| `events` | `PluginEventBus` | Subscribe to Arcane events |
| `commands` | `PluginCommandRegistry` | Register slash commands |
| `config` | `PluginConfig` | Plugin configuration access |
| `ui` | `PluginUI` | Terminal output helpers |
| `fs` | `PluginFileSystem` | Limited filesystem access |
| `shell` | `PluginShell?` | Shell execution (if permitted) |
| `network` | `PluginNetwork?` | HTTP requests (if permitted) |
| `llm` | `PluginLLM?` | LLM access (if permitted) |

### Permissions

Declare required permissions in `plugin.manifest.json`:

```json
{
  "permissions": ["fs:read", "fs:write"]
}
```

| Permission | Description |
|------------|-------------|
| `fs:read` | Read files in project directory |
| `fs:write` | Write/delete files in project directory |
| `shell:exec` | Execute shell commands |
| `network:outbound` | Make HTTP requests |
| `memory:read` | Read ARCANE_MEMORY.md |
| `memory:write` | Write to ARCANE_MEMORY.md |
| `llm:invoke` | Use the LLM (counts toward session budget) |

### Hooks

Subscribe to Arcane events in `onLoad`:

```typescript
ctx.events.on('chat:turn_complete', (payload) => {
  // { turn: number, tokensUsed: number }
});
```

| Hook | Payload |
|------|---------|
| `chat:turn_complete` | `{ turn, tokensUsed }` |
| `memory:entry_added` | `{ entryCount }` |
| `swd:verified` | `{ path, hash }` |
| `swd:mismatch` | `{ path, expected, actual }` |
| `budget:warning` | `{ tokensPercent, turnsPercent }` |
| `budget:exceeded` | `{ reason }` |

### Helper Functions

#### `definePlugin(plugin)`

Type-safe wrapper for defining a plugin.

#### `createLogger(prefix, logger?)`

Create a namespaced logger.

#### `defineConfig(properties)`

Helper for defining plugin config schema.

#### `PERMISSIONS`

Constant object with all available permissions.

#### `HOOKS`

Constant object with all available hooks.

## Publishing

1. Update version in `package.json`
2. Publish to npm:

```bash
npm publish --access public
```

3. Your plugin can now be installed by anyone:

```bash
arcane plugin install arcane-plugin-my-feature
```

## License

MIT