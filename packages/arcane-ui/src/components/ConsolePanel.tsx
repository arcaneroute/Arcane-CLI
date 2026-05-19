import { Box, Text, ScrollBox } from '@opentui/core';
import type { VNode } from '@opentui/core';
import { COLORS } from '../primitives';

interface ConsolePanelProps {
  visible: boolean;
  logs: string[];
  onClear: () => void;
}

export function createConsolePanel(props: ConsolePanelProps): VNode {
  return Box(
    {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
      visible: props.visible,
      flexDirection: 'column',
      backgroundColor: COLORS.background,
      borderStyle: 'rounded',
      border: true,
      borderColor: COLORS.accentCyan,
    },
    // Header
    Box(
      {
        flexDirection: 'row',
        height: 3,
        width: '100%',
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingX: 2,
        border: ['bottom'],
        borderColor: COLORS.border,
      },
      Box(
        { flexDirection: 'row', alignItems: 'center', gap: 1 },
        Text({ content: '▸', fg: COLORS.accentCyan }),
        Text({ content: 'Console', fg: COLORS.textPrimary, attributes: 1 }),
        Text({
          content: `(${props.logs.length} lines)`,
          fg: COLORS.textSecondary,
        }),
      ),
      Box(
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingX: 2,
          paddingY: 1,
          borderStyle: 'rounded',
          border: true,
          borderColor: COLORS.border,
          onMouseDown: props.onClear,
        },
        Text({ content: 'Clear', fg: COLORS.accentCyan }),
      ),
    ),
    // Log area
    ScrollBox(
      {
        flexDirection: 'column',
        flexGrow: 1,
        scrollY: true,
        paddingX: 2,
        paddingY: 1,
      },
      props.logs.length === 0
        ? Text({ content: 'No logs yet.', fg: COLORS.textSecondary })
        : Box(
            { flexDirection: 'column', gap: 0 },
            ...props.logs.map((log, i) =>
              Box(
                { flexDirection: 'row', alignItems: 'center', gap: 1 },
                Text({ content: `${i + 1}`, fg: COLORS.border }),
                Text({ content: log, fg: COLORS.textSecondary }),
              ),
            ),
          ),
    ),
  );
}

export const ConsolePanel = createConsolePanel;