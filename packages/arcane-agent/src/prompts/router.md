# Router Prompt

Analyze the following task and determine which agent should handle it.

## Task

{{task}}

## Available Agents

{{agents_list}}

## Routing Decision

Respond with ONLY the agent name that should handle this task.
If multiple agents are needed, respond with all agent names separated by commas.

Example responses:
- `FileAgent`
- `CodeAgent,ReviewAgent`
- `FileAgent,CodeAgent,ReviewAgent,ChatAgent`
