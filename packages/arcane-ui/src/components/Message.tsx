import { Box, Text } from '@opentui/core';
import type { VNode } from '@opentui/core';

export interface MessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reactions?: string[];
  files?: Array<{ id: string; name: string; path: string }>;
  isStreaming?: boolean;
}

export function createMessage(msg: MessageData): VNode {
  const isUser = msg.role === 'user';
  const roleColor = isUser ? '#58A6FF' : '#A371F7';
  const roleLabel = isUser ? '▸ USER' : '◆ AI';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dimColor = '#8B949E';
  const bgColor = isUser ? '#0D1F3C' : '#1A0D3C';

  const header = Box(
    {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 2,
    },
    Box(
      { flexDirection: 'row', alignItems: 'center', gap: 1 },
      Text({ content: roleLabel, fg: roleColor, attributes: 1 }),
    ),
    Text({ content: time, fg: dimColor }),
  );

  const contentRow = Box(
    {
      flexDirection: 'row',
      alignItems: 'center',
    },
    Text({ content: msg.content, fg: '#E6EDF3' }),
    msg.isStreaming
      ? Text({ content: ' █', fg: '#FFFF00' })
      : null,
  );

  const reactionsBox = msg.reactions && msg.reactions.length > 0
    ? Box(
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
          marginTop: 1,
        },
        ...msg.reactions.map((reaction) =>
          Text({ content: reaction, fg: '#8B949E' })
        )
      )
    : null;

  const filesBox = msg.files && msg.files.length > 0
    ? Box(
        {
          flexDirection: 'column',
          marginTop: 1,
          paddingX: 1,
          paddingY: 1,
          borderStyle: 'rounded',
          border: true,
          borderColor: dimColor,
        },
        Box(
          { flexDirection: 'row', alignItems: 'center', height: 2 },
          Text({ content: 'Attachments', fg: dimColor, attributes: 1 }),
        ),
        ...msg.files.map((file) =>
          Box(
            {
              flexDirection: 'row',
              alignItems: 'center',
              height: 2,
              gap: 1,
            },
            Text({ content: '📄', fg: dimColor }),
            Text({ content: file.name, fg: '#E6EDF3', attributes: 1 }),
            Text({ content: file.path, fg: dimColor }),
          )
        )
      )
    : null;

  return Box(
    {
      flexDirection: 'column',
      marginY: 1,
      paddingX: 2,
      paddingY: 1,
      backgroundColor: bgColor,
      borderStyle: 'rounded',
      border: true,
      borderColor: isUser ? '#1A3A6C' : '#2D1A5C',
    },
    header,
    Box({ paddingTop: 1 }, contentRow),
    reactionsBox,
    filesBox,
  );
}
