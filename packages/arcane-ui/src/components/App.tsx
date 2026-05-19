import { Box, Text } from '@opentui/core';
import type { VNode } from '@opentui/core';
import { COLORS } from '../primitives';
import { arcaneEventBus, type ArcaneEventBus } from '../events/ArcaneEventBus';
import { createTabBar, type TabId } from './TabBar';
import { createChatArea } from './ChatArea';
import { createChatInput } from './ChatInput';
import { createShortcutBar } from './ShortcutBar';
import { createConsolePanel } from './ConsolePanel';
import { createMemoryPanel } from './MemoryPanel';
import { createSWDPanel } from './SWDPanel';
import { type MessageData } from './Message';
import type { CliRenderer } from '@opentui/core';

interface AppState {
  activeTab: TabId;
  messages: MessageData[];
  budget: { used: number; total: number; percentage: number };
  consoleVisible: boolean;
  consoleLogs: string[];
  memoryStatus: { used: number; total: number; items: Array<{ key: string; size: number; timestamp: Date }> };
  swdStatus: { active: boolean; currentStep: string; progress: number; logs: string[] };
  isStreaming: boolean;
  streamingMessageId: string | null;
}

export class ArcaneApp {
  private renderer: CliRenderer;
  private eventBus: ArcaneEventBus;
  private state: AppState;
  private rootVNode: VNode | null = null;
  private unsubscribers: Array<() => void> = [];
  private mounted = false;

  constructor(renderer: CliRenderer, eventBus: ArcaneEventBus) {
    this.renderer = renderer;
    this.eventBus = eventBus;
    this.state = this.getInitialState();

    // Mount the UI immediately
    this.mount();

    // Wire up events after mounting
    this.wireEvents();
  }

  private mount(): void {
    if (this.mounted) return;

    // Build the component tree and add to renderer's root
    this.rootVNode = this.buildComponentTree();
    this.renderer.root.add(this.rootVNode);
    this.mounted = true;
  }

  private getInitialState(): AppState {
    return {
      activeTab: 'chat',
      messages: [],
      budget: { used: 0, total: 100000, percentage: 0 },
      consoleVisible: false,
      consoleLogs: [],
      memoryStatus: { used: 0, total: 0, items: [] },
      swdStatus: { active: false, currentStep: 'idle', progress: 0, logs: [] },
      isStreaming: false,
      streamingMessageId: null,
    };
  }

  private wireEvents(): void {
    // Tab change handler
    const unsubTabChange = this.eventBus.on('tab:change', (tab: TabId) => {
      this.state.activeTab = tab;
      this.rerender();
    });

    // Message send handler
    const unsubMessageSend = this.eventBus.on('message:send', ({ content }: { content: string }) => {
      const message: MessageData = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      this.state.messages = [...this.state.messages, message];
      this.rerender();
    });

    // Message receive handler
    const unsubMessageReceive = this.eventBus.on('message:receive', (data: { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }) => {
      const message: MessageData = {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
      };
      this.state.messages = [...this.state.messages, message];
      this.rerender();
    });

    // Console toggle handler
    const unsubConsoleToggle = this.eventBus.on('console:toggle', () => {
      this.state.consoleVisible = !this.state.consoleVisible;
      this.rerender();
    });

    // Budget update handler
    const unsubBudgetUpdate = this.eventBus.on('budget:update', (budget: { used: number; total: number; percentage: number }) => {
      this.state.budget = budget;
      this.rerender();
    });

    // Streaming start handler
    const unsubStreamingStart = this.eventBus.on('streaming:start', ({ messageId }: { messageId: string }) => {
      this.state.isStreaming = true;
      this.state.streamingMessageId = messageId;
      this.rerender();
    });

    // Streaming chunk handler
    const unsubStreamingChunk = this.eventBus.on('streaming:chunk', ({ messageId, content }: { messageId: string; content: string }) => {
      // Append content to the last assistant message
      const messages = [...this.state.messages];
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        lastAssistantMsg.content += content;
        this.state.messages = messages;
      }
      this.rerender();
    });

    // Streaming end handler
    const unsubStreamingEnd = this.eventBus.on('streaming:end', ({ messageId }: { messageId: string }) => {
      this.state.isStreaming = false;
      this.state.streamingMessageId = null;
      this.rerender();
    });

    this.unsubscribers = [
      unsubTabChange,
      unsubMessageSend,
      unsubMessageReceive,
      unsubConsoleToggle,
      unsubBudgetUpdate,
      unsubStreamingStart,
      unsubStreamingChunk,
      unsubStreamingEnd,
    ];
  }

  private handleTabClick = (tab: TabId): void => {
    this.eventBus.emit('tab:change', tab);
  };

  private handleConsoleClear = (): void => {
    this.state.consoleLogs = [];
    this.rerender();
  };

  private rerender(): void {
    if (!this.mounted || !this.rootVNode) return;

    // Remove old tree by ID
    const oldId = (this.rootVNode as any).id;
    if (oldId) {
      this.renderer.root.remove(oldId);
    }

    // Rebuild and add new tree
    this.rootVNode = this.buildComponentTree();
    this.renderer.root.add(this.rootVNode);
  }

  private buildComponentTree(): VNode {
    const { activeTab, messages, budget, consoleVisible, consoleLogs, memoryStatus, swdStatus, isStreaming } = this.state;

    const mainContent = () => {
      switch (activeTab) {
        case 'chat':
          return createChatArea({
            messages,
            isStreaming,
            streamingMessageId: this.state.streamingMessageId || undefined,
          });
        case 'memory':
          return createMemoryPanel({ status: memoryStatus });
        case 'swd':
          return createSWDPanel({ status: swdStatus });
        default:
          return createChatArea({ messages, isStreaming });
      }
    };

    return Box(
      {
        flexDirection: 'column',
        width: this.renderer.width,
        height: this.renderer.height,
        backgroundColor: COLORS.background,
      },
      // Tab Bar
      createTabBar({
        activeTab,
        budget,
        onTabClick: this.handleTabClick,
      }),
      // Main Content (Chat/Memory/SWD)
      Box(
        {
          flexDirection: 'column',
          flexGrow: 1,
          alignItems: 'stretch',
        },
        mainContent()
      ),
      // Chat Input (only show in chat mode)
      activeTab === 'chat' ? createChatInput({}) : null,
      // Shortcut Bar
      createShortcutBar(),
      // Console Panel (overlay)
      createConsolePanel({
        visible: consoleVisible,
        logs: consoleLogs,
        onClear: this.handleConsoleClear,
      })
    );
  }

  getVNode(): VNode {
    if (!this.rootVNode) {
      this.rootVNode = this.buildComponentTree();
    }
    return this.rootVNode;
  }

  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

export function createArcaneApp(renderer: CliRenderer, eventBus: ArcaneEventBus): ArcaneApp {
  return new ArcaneApp(renderer, eventBus);
}