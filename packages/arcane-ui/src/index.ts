// Renderer
export { createArcaneRenderer, type ArcaneRenderer } from './renderer/createRenderer';

// Event Bus
export { arcaneEventBus, ArcaneEventBus } from './events/ArcaneEventBus';
export type { ArcaneEventMap } from './events/types';

// App
export { ArcaneApp, createArcaneApp } from './components/App';

// Components
export { createTabBar, type TabId } from './components/TabBar';
export { createChatInput } from './components/ChatInput';
export { createMessage, type MessageData } from './components/Message';
export { createConsolePanel } from './components/ConsolePanel';
export { createMemoryPanel } from './components/MemoryPanel';
export { createSWDPanel } from './components/SWDPanel';

// Primitives
export { COLORS, SEMANTIC_COLORS, getBudgetColor, formatBudgetBar } from './primitives';

// Types
export type { FileAction } from './events/types';