import { Box, Text } from '@opentui/core';
import type { VNode } from '@opentui/core';
import { COLORS } from '../primitives';

interface ShortcutEntry {
  key: string;
  label: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { key: 'Ctrl+B', label: 'Console' },
  { key: 'Tab', label: 'Switch View' },
  { key: 'Enter', label: 'Send' },
  { key: 'Ctrl+C', label: 'Exit' },
];

interface ShortcutBarProps {
  onShortcut?: (shortcut: string) => void;
}

export function createShortcutBar(_props?: ShortcutBarProps): VNode {
  const shortcutNodes: VNode[] = [];

  SHORTCUTS.forEach((shortcut, index) => {
    shortcutNodes.push(
      Box(
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        },
        Text({
          content: shortcut.key,
          fg: COLORS.accentCyan,
          attributes: 1,
        }),
        Text({
          content: shortcut.label,
          fg: COLORS.textSecondary,
        }),
      ),
    );
    if (index < SHORTCUTS.length - 1) {
      shortcutNodes.push(
        Text({ content: '│', fg: COLORS.border }),
      );
    }
  });

  return Box(
    {
      flexDirection: 'row',
      height: 3,
      width: '100%',
      backgroundColor: COLORS.surface,
      borderStyle: 'single',
      border: ['top'],
      borderColor: COLORS.border,
      paddingX: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    ...shortcutNodes,
  );
}