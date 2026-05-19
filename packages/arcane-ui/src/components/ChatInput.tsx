import type { KeyEvent, VNode } from '@opentui/core';
import { Box, Input, Text } from '@opentui/core';
import { arcaneEventBus } from '../events/ArcaneEventBus';
import { COLORS } from '../primitives';

interface ChatInputProps {
  onSubmit?: (content: string) => void;
  commandHistory?: string[];
}

export function createChatInput(props: ChatInputProps): VNode {
  let inputValue = '';

  const handleSubmit = () => {
    const content = inputValue.trim();
    if (content) {
      arcaneEventBus.emit('message:send', { content });
      props.onSubmit?.(content);
      inputValue = '';
    }
  };

  const inputField = Input({
    value: '',
    placeholder: '  Type a message... (Enter to send)',
    backgroundColor: COLORS.background,
    textColor: COLORS.textPrimary,
    focusedBackgroundColor: COLORS.background,
    focusedTextColor: COLORS.textPrimary,
    placeholderColor: COLORS.textSecondary,
    onKeyDown: (e: KeyEvent) => {
      if (e.name === 'return' && !e.shift) {
        handleSubmit();
      } else if (e.name && e.name.length === 1) {
        inputValue += e.name;
      } else if (e.name === 'backspace') {
        inputValue = inputValue.slice(0, -1);
      }
    },
  });

  const sendButton = Box(
    {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      backgroundColor: COLORS.accentCyan,
      paddingX: 3,
      marginLeft: 1,
      borderStyle: 'rounded',
      onMouseDown: () => handleSubmit(),
    },
    Text({
      content: 'Send',
      fg: COLORS.background,
      attributes: 1,
    }),
  );

  return Box(
    {
      flexDirection: 'column',
      height: 5,
      borderStyle: 'single',
      border: ['top'],
      borderColor: COLORS.accentCyan,
      backgroundColor: COLORS.surface,
      paddingX: 2,
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    Box(
      {
        flexDirection: 'row',
        alignItems: 'center',
      },
      Box(
        {
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
          borderStyle: 'rounded',
          paddingX: 1,
        },
        inputField,
      ),
      sendButton,
    ),
  );
}

export const ChatInput = createChatInput;