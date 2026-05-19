export type ArcaneEventMap = {
  'message:send': { content: string; files?: FileAction[] };
  'message:receive': { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date };
  'message:reaction': { messageId: string; reaction: string };
  'tab:change': 'chat' | 'memory' | 'swd';
  'console:toggle': void;
  'budget:update': { used: number; total: number; percentage: number };
  'streaming:start': { messageId: string };
  'streaming:chunk': { messageId: string; content: string };
  'streaming:end': { messageId: string };
  'file:drop': { files: FileAction[] };
};

export type FileAction = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
};