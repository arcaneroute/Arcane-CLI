# Arcane Agent

LangGraph-based agent system untuk Arcane Route.

## Features

- **Code Review/Verification** - Automated PR and code analysis
- **Task Automation** - Autonomous task execution
- **Chat Assistant** - Conversational AI interactions
- **Multi-Agent Orchestration** - Hierarchical agent coordination
- **Plugin System** - Extensible via `@registerAgent` decorator
- **Human-in-the-Loop** - Approval-based execution flow
- **Centralized Prompts** - File-based prompts for easy customization

## Installation

```bash
bun add arcane-agent
```

## Quick Start

```typescript
import { createAgent } from 'arcane-agent';

const agent = createAgent({
  type: 'code-review',
  name: 'PR-Reviewer'
});

const result = await agent.run('Review PR #123');
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│               ArcaneAgent                        │
│            (Supervisor Agent)                   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │     Central Supervisor (LLM Router)       │   │
│  └─────────────────────────────────────────┘   │
│      │       │       │       │                  │
│  ┌───┴───┐ ┌─┴───┐ ┌─┴───┐ ┌─┴───┐             │
│  │ File  │ │Code │ │Review│ │ Chat│            │
│  │Agent  │ │Agent│ │Agent │ │Agent│            │
│  └───────┘ └─────┘ └─────┘ └─────┘             │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### Agents

Agents are specialized units that handle specific tasks:

- **FileAgent** - Filesystem operations
- **CodeAgent** - Code analysis and manipulation
- **ReviewAgent** - PR review and quality checks
- **ChatAgent** - Conversational interactions

### Tools

Tools provide capabilities to agents:

- **FileTools** - read_file, write_file, edit_file, glob, ls, mkdir, rm
- **ShellTools** - execute, bash
- **GitTools** - git_status, git_diff, git_log, git_commit, etc.
- **SearchTools** - grep, find, semantic_search
- **WebTools** - web_search, fetch_url

### Human-in-the-Loop

Enable approval-based execution:

```typescript
const agent = createAgent({
  type: 'task-automation',
  hitl: { enabled: true }
});

const result = await agent.run('Deploy to production');
// Agent will pause and ask for approval before executing
```

### Plugin System

Extend with custom agents via decorators:

```typescript
import { registerAgent } from 'arcane-agent/plugins';

@registerAgent({
  name: 'DatabaseAgent',
  description: 'Handles database operations',
  events: ['db.query', 'db.result']
})
export class DatabaseAgent {
  execute(state: AgentState): AgentState {
    // Agent logic
    return state;
  }
}
```

## API Reference

### Factory Functions

```typescript
// Create any agent type
createAgent(config: AgentConfig): AgentInstance

// Specialized factories
createCodeReviewAgent(config?: CodeReviewAgentConfig): AgentInstance
createTaskAutomationAgent(config?: TaskAutomationAgentConfig): AgentInstance
createChatAgent(config?: ChatAgentConfig): AgentInstance
createMultiAgent(config?: MultiAgentConfig): AgentInstance
```

### AgentInstance

```typescript
interface AgentInstance {
  run(input: string): Promise<AgentResult>
  stream(input: string): AsyncGenerator<StreamEvent>
  getState(): AgentState
  checkpoint(): Promise<string>
  restore(path: string): Promise<void>
  subscribe(channel: string, handler: EventHandler): void
  requestApproval(request: ApprovalRequest): Promise<ApprovalResponse>
  getPendingApprovals(): ApprovalRequest[]
}
```

## Structured Streaming

```typescript
for await (const event of agent.stream('Review PR #123')) {
  switch (event.type) {
    case 'thought':
      console.log(`[${event.agent}] 💭 ${event.content}`);
      break;
    case 'tool_call':
      console.log(`[${event.agent}] 🔧 ${event.tool}`);
      break;
    case 'approval_request':
      console.log(event.message);
      break;
    case 'complete':
      console.log('🎉 Done:', event.result);
      break;
  }
}
```

## Persistence

```typescript
import { CheckpointManager, SessionStore, MemoryStore } from 'arcane-agent';

// Checkpoint for resume
const checkpointManager = new CheckpointManager({
  storagePath: '~/.arcane/agents'
});

await checkpointManager.createCheckpoint('agent-1', state);

// Session history
const sessionStore = new SessionStore({
  storagePath: '~/.arcane/sessions'
});

const session = await sessionStore.createSession('agent-1');
```

## Prompt Management

Prompts are stored as markdown files in `src/prompts/`:

```typescript
import { PromptManager } from 'arcane-agent/core';

const prompts = new PromptManager({
  promptsDir: './src/prompts'
});

const rendered = await prompts.render('supervisor', {
  task: 'Review PR #123',
  available_agents: 'FileAgent, CodeAgent, ReviewAgent'
});
```

## License

MIT
