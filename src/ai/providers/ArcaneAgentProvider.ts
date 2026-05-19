/*
 * arcane-route :: src/ai/providers/ArcaneAgentProvider.ts
 * ILLMClient adapter that wraps arcane-agent's AgentInstance
 * Supports real SSE streaming with automatic fallback to non-streaming.
 */

import { createAgent, type AgentInstance } from 'arcane-agent';
import { resolve } from 'node:path';
import type { ConfigManager } from '../../core/ConfigManager.ts';
import type {
  ClaudeResponse,
  CorrectionParams,
  LLMProvider,
  Message,
  SendMessageParams,
  TokenUsage,
} from '../../types/index.ts';
import type { ILLMClient } from '../ILLMClient.ts';

interface FileAction {
  type: 'CREATE' | 'MODIFY' | 'DELETE';
  path: string;
  content?: string;
  oldString?: string;
  newString?: string;
}

/** Result from a streaming or non-streaming LLM call */
interface LLMResult {
  text: string;
  usage: TokenUsage;
}

// Resolve path to arcane-agent's prompts directory (relative to project root)
const AGENT_PROMPTS_DIR = resolve(process.cwd(), 'packages/arcane-agent/src/prompts');

/**
 * LLM Client interface for arcane-agent
 */
interface AgentLLMClient {
  complete(messages: Message[], systemPrompt?: string): Promise<LLMResult>;
  stream(
    messages: Message[],
    systemPrompt: string | undefined,
    onDelta: (chunk: string) => void,
  ): Promise<LLMResult>;
}

/**
 * OpenAI-compatible LLM Client with streaming support
 */
class OpenAIClient implements AgentLLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<LLMResult> {
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      apiMessages.push({ role: m.role, content: m.content });
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0]?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  async stream(
    messages: Message[],
    systemPrompt: string | undefined,
    onDelta: (chunk: string) => void,
  ): Promise<LLMResult> {
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      apiMessages.push({ role: m.role, content: m.content });
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: apiMessages,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens: number; completion_tokens: number };
          };

          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onDelta(delta);
          }

          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens;
            outputTokens = parsed.usage.completion_tokens;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return {
      text: fullText,
      usage: { inputTokens, outputTokens },
    };
  }
}

/**
 * Anthropic-compatible LLM Client with streaming support
 */
class AnthropicClient implements AgentLLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<LLMResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      text: data.content[0]?.text ?? '',
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
    };
  }

  async stream(
    messages: Message[],
    systemPrompt: string | undefined,
    onDelta: (chunk: string) => void,
  ): Promise<LLMResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          try {
            const event = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text?: string };
              usage?: { input_tokens: number; output_tokens: number };
              message?: { usage?: { input_tokens: number; output_tokens: number } };
            };

            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text;
              onDelta(event.delta.text);
            }

            // Token usage from message_start
            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens;
            }

            // Token usage from message_delta (output tokens)
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    return {
      text: fullText,
      usage: { inputTokens, outputTokens },
    };
  }
}

export class ArcaneAgentProvider implements ILLMClient {
  private agent: AgentInstance;
  private underlyingProvider: LLMProvider;
  private llmClient: AgentLLMClient;

  private constructor(
    agent: AgentInstance,
    underlyingProvider: LLMProvider,
    llmClient: AgentLLMClient,
  ) {
    this.agent = agent;
    this.underlyingProvider = underlyingProvider;
    this.llmClient = llmClient;
  }

  /**
   * Factory method to create ArcaneAgentProvider from ConfigManager.
   */
  public static async create(config: ConfigManager): Promise<ArcaneAgentProvider> {
    const underlyingProvider = config.getArcaneUnderlyingProvider();

    // Create LLM client based on underlying provider
    let llmClient: AgentLLMClient;
    if (underlyingProvider === 'openai') {
      llmClient = new OpenAIClient(
        config.getOpenAIApiKey(),
        config.getOpenAIBaseUrl(),
        config.getOpenAIModel(),
      );
    } else {
      llmClient = new AnthropicClient(
        config.getAnthropicApiKey(),
        config.getAnthropicBaseUrl() ?? 'https://api.anthropic.com',
        config.getAnthropicModel(),
      );
    }

    // Create agent config for arcane-agent
    const agentConfig = {
      type: 'chat' as const,
      name: 'ArcaneAI',
      llmProvider: underlyingProvider as 'anthropic' | 'openai',
      hitl: {
        enabled: false,
        autoApprove: true,
        timeout: 120_000,
      },
      promptsDir: AGENT_PROMPTS_DIR,
    };

    const agent = createAgent(agentConfig);

    // Set the LLM client on the agent (for non-streaming agent.run() calls)
    agent.setLLMClient({
      complete: async (messages: Message[]) => {
        const result = await llmClient.complete(messages);
        return result.text;
      },
    });

    return new ArcaneAgentProvider(agent, underlyingProvider, llmClient);
  }

  /**
   * Send a message with real SSE streaming.
   * Falls back to non-streaming if streaming fails.
   */
  async sendMessage(params: SendMessageParams): Promise<ClaudeResponse> {
    let text = '';
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

    try {
      // Attempt streaming
      const result = await this.llmClient.stream(
        params.messages,
        params.systemPrompt,
        (chunk) => {
          if (params.onTextDelta) {
            params.onTextDelta(chunk);
          }
        },
      );
      text = result.text;
      usage = result.usage;
    } catch (streamError) {
      // Fallback to non-streaming
      const result = await this.llmClient.complete(params.messages, params.systemPrompt);
      text = result.text;
      usage = result.usage;

      // Emit full text at once (fallback behavior)
      if (params.onTextDelta) {
        params.onTextDelta(text);
      }
    }

    // Parse and execute FILE_ACTION blocks
    const actions = this.parseFileActions(text);
    if (actions.length > 0) {
      const execResults = await this.executeFileActions(actions);
      text = `${text}\n\n[FILE_ACTION EXECUTION]\n${execResults}`;
    }

    return {
      thinking: '',
      text,
      usage,
    };
  }

  /**
   * Send a correction turn after SWD verification failure.
   * Uses non-streaming for simplicity.
   */
  async sendCorrectionTurn(params: CorrectionParams): Promise<ClaudeResponse> {
    const correctionMessages: Message[] = [
      ...params.messages,
      {
        role: 'user' as const,
        content: `[SWD VERIFICATION FAILED]\n${params.failureSummary}\n\nYou have ${params.attemptsRemaining} attempt(s) remaining. Please retry the file operations correctly.`,
      },
    ];

    const result = await this.llmClient.complete(correctionMessages);
    let text = result.text;

    // Parse and execute FILE_ACTION blocks
    const actions = this.parseFileActions(text);
    if (actions.length > 0) {
      const execResults = await this.executeFileActions(actions);
      text = `${text}\n\n[FILE_ACTION EXECUTION]\n${execResults}`;
    }

    return {
      thinking: '',
      text,
      usage: result.usage,
    };
  }

  /**
   * Send a low-effort message for memory compression (dream).
   */
  async sendLowEffortMessage(params: SendMessageParams): Promise<ClaudeResponse> {
    const result = await this.llmClient.complete(params.messages, params.systemPrompt);

    return {
      thinking: '',
      text: result.text,
      usage: result.usage,
    };
  }

  getProviderName(): LLMProvider {
    return this.underlyingProvider;
  }

  supportsThinking(): boolean {
    return this.underlyingProvider === 'anthropic';
  }

  /**
   * Parse FILE_ACTION blocks from LLM output text.
   */
  private parseFileActions(text: string): FileAction[] {
    const actions: FileAction[] = [];

    // Match [FILE_ACTION] blocks - handle both quoted content and multi-line pipe content
    const blockRegex = /\[FILE_ACTION\]([\s\S]*?)\[\/FILE_ACTION\]/gi;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockRegex.exec(text)) !== null) {
      const block = blockMatch[1] ?? '';

      // Extract type
      const typeMatch = /type:\s*(\w+)/i.exec(block);
      const pathMatch = /path:\s*([^\s\[\]]+)/i.exec(block);
      const typeRaw = typeMatch?.[1]?.toUpperCase();
      const pathRaw = pathMatch?.[1]?.trim();

      if (!typeRaw || !pathRaw) continue;
      if (!['CREATE', 'MODIFY', 'DELETE'].includes(typeRaw)) continue;

      const type = typeRaw as FileAction['type'];
      const action: FileAction = { type, path: pathRaw };

      // Handle content: with pipe (multi-line)
      const pipeMatch = /content:\s*\|[\r\n]+([\s\S]*?)(?=\n\s*(?:oldString|newString|\[\/FILE_ACTION\]|$))/i.exec(block);
      const pipeContent = pipeMatch?.[1];
      if (pipeContent) {
        action.content = pipeContent.trim();
      } else {
        // Handle content: "quoted"
        const contentMatch = /content:\s*"([^"]*)"/i.exec(block);
        const quotedContent = contentMatch?.[1];
        if (quotedContent !== undefined) action.content = quotedContent;
      }

      // Handle oldString and newString
      const oldStringMatch = /oldString:\s*"([^"]*)"/i.exec(block);
      const newStringMatch = /newString:\s*"([^"]*)"/i.exec(block);
      const oldStr = oldStringMatch?.[1];
      const newStr = newStringMatch?.[1];
      if (oldStr !== undefined) action.oldString = oldStr;
      if (newStr !== undefined) action.newString = newStr;

      actions.push(action);
    }

    return actions;
  }

  /**
   * Execute file actions and return results summary.
   */
  private async executeFileActions(actions: FileAction[]): Promise<string> {
    const results: string[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'CREATE': {
            if (!action.content) {
              results.push(`CREATE ${action.path}: No content provided`);
              break;
            }
            await Bun.write(action.path, action.content);
            results.push(`CREATE ${action.path}: OK`);
            break;
          }
          case 'MODIFY': {
            if (!action.oldString || !action.newString) {
              results.push(`MODIFY ${action.path}: oldString and newString required`);
              break;
            }
            const content = await Bun.file(action.path).text();
            if (!content.includes(action.oldString)) {
              results.push(`MODIFY ${action.path}: oldString not found`);
              break;
            }
            const newContent = content.replace(action.oldString, action.newString);
            await Bun.write(action.path, newContent);
            results.push(`MODIFY ${action.path}: OK`);
            break;
          }
          case 'DELETE': {
            const file = Bun.file(action.path);
            if (await file.exists()) {
              const { rm } = await import('node:fs/promises');
              await rm(action.path);
            }
            results.push(`DELETE ${action.path}: OK`);
            break;
          }
        }
      } catch (error) {
        results.push(`${action.type} ${action.path}: FAILED - ${error}`);
      }
    }

    return results.join('\n');
  }
}
