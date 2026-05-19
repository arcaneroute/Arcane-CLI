import type { VNode } from '@opentui/core';
import { Box, Text, ScrollBox } from '@opentui/core';
import { createMessage, type MessageData } from './Message';
import { COLORS } from '../primitives';

interface ChatAreaProps {
  messages: MessageData[];
  isStreaming?: boolean;
  streamingMessageId?: string;
}

export function createChatArea(props: ChatAreaProps): VNode {
  if (props.messages.length === 0) {
    return Box(
      {
        flexDirection: 'column',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
      },
      Box(
        {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        },
        Text({
          content: '◈  Arcane Route',
          fg: COLORS.accentCyan,
          attributes: 1,
        }),
        Text({
          content: 'Start a conversation below',
          fg: COLORS.textSecondary,
        }),
      ),
    );
  }

  const messageNodes = props.messages.map((msg) =>
    createMessage({
      ...msg,
      isStreaming: props.isStreaming && msg.id === props.streamingMessageId,
    })
  );

  return ScrollBox(
    {
      flexDirection: 'column',
      flexGrow: 1,
      scrollY: true,
      paddingX: 4,
      paddingY: 1,
    },
    ...messageNodes,
  );
}