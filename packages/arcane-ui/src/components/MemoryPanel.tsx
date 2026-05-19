import { Box, Text, ScrollBox } from '@opentui/core';
import type { VNode } from '@opentui/core';
import { COLORS, formatBudgetBar } from '../primitives';

interface MemoryPanelProps {
  status: {
    used: number;
    total: number;
    items: Array<{ key: string; size: number; timestamp: Date }>;
  };
}

export function createMemoryPanel(props: MemoryPanelProps): VNode {
  const percentage = props.status.total > 0
    ? Math.round((props.status.used / props.status.total) * 100)
    : 0;

  const usageBar = formatBudgetBar(percentage, 20);
  const usageColor = percentage > 80 ? COLORS.accentRed : percentage > 50 ? COLORS.accentYellow : COLORS.accentGreen;

  return Box(
    {
      flexDirection: 'column',
      flexGrow: 1,
      backgroundColor: COLORS.background,
      borderStyle: 'rounded',
      border: true,
      borderColor: COLORS.border,
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
        Text({ content: '󰍛', fg: COLORS.accentCyan }),
        Text({ content: 'Memory Status', fg: COLORS.accentCyan, attributes: 1 }),
      ),
      Text({
        content: `${props.status.items.length} item(s)`,
        fg: COLORS.textSecondary,
      }),
    ),
    // Stats row
    Box(
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingX: 2,
        paddingY: 1,
        height: 3,
        border: ['bottom'],
        borderColor: COLORS.border,
      },
      Box(
        { flexDirection: 'row', alignItems: 'center', gap: 1 },
        Text({ content: 'Usage:', fg: COLORS.textSecondary }),
        Text({
          content: `${props.status.used} / ${props.status.total}`,
          fg: COLORS.textPrimary,
          attributes: 1,
        }),
      ),
      Box(
        { flexDirection: 'row', alignItems: 'center', gap: 1 },
        Text({ content: usageBar, fg: usageColor }),
        Text({
          content: `${percentage}%`,
          fg: usageColor,
          attributes: 1,
        }),
      ),
    ),
    // Items list
    ScrollBox(
      {
        flexDirection: 'column',
        flexGrow: 1,
        scrollY: true,
        paddingX: 2,
        paddingY: 1,
      },
      props.status.items.length === 0
        ? Box(
            {
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            },
            Text({ content: 'No memory items stored.', fg: COLORS.textSecondary }),
          )
        : Box(
            { flexDirection: 'column', gap: 1 },
            ...props.status.items.map((item) =>
              Box(
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingX: 1,
                  paddingY: 1,
                  borderStyle: 'single',
                  border: ['bottom'],
                  borderColor: COLORS.border,
                },
                Box(
                  { flexDirection: 'column' },
                  Text({ content: item.key, fg: COLORS.textPrimary, attributes: 1 }),
                  Text({
                    content: item.timestamp.toLocaleString(),
                    fg: COLORS.textSecondary,
                  }),
                ),
                Text({
                  content: `${item.size}KB`,
                  fg: COLORS.accentCyan,
                }),
              ),
            ),
          ),
    ),
  );
}

export const MemoryPanel = createMemoryPanel;