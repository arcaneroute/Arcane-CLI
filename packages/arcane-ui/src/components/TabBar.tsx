import type { VNode } from '@opentui/core';
import { Box, Text } from '@opentui/core';
import { COLORS, formatBudgetBar, getBudgetColor } from '../primitives';

export type TabId = 'chat' | 'memory' | 'swd';

interface TabBarProps {
  activeTab: TabId;
  budget: { used: number; total: number; percentage: number };
  onTabClick: (tab: TabId) => void;
}

export function createTabBar(props: TabBarProps): VNode {
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'chat', label: 'Chat', icon: '󰭻' },
    { id: 'memory', label: 'Memory', icon: '󰍛' },
    { id: 'swd', label: 'SWD', icon: '󰑮' },
  ];

  return Box(
    {
      flexDirection: 'row',
      height: 3,
      width: '100%',
      backgroundColor: COLORS.surface,
      borderStyle: 'single',
      border: ['bottom'],
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingX: 2,
    },
    // Tab buttons
    Box(
      {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
      },
      ...tabs.map((tab) => {
        const isActive = tab.id === props.activeTab;
        return Box(
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingX: 2,
            paddingY: 1,
            backgroundColor: isActive ? COLORS.background : 'transparent',
            borderStyle: isActive ? 'rounded' : undefined,
            border: isActive,
            borderColor: isActive ? COLORS.accentCyan : undefined,
            onMouseDown: () => props.onTabClick(tab.id),
          },
          Text({
            content: isActive ? `▸ ${tab.label}` : `  ${tab.label}`,
            fg: isActive ? COLORS.accentCyan : COLORS.textSecondary,
            attributes: isActive ? 1 : 0,
          }),
        );
      }),
    ),
    // Budget section
    Box(
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      },
      Text({
        content: 'Budget:',
        fg: COLORS.textSecondary,
      }),
      Text({
        content: formatBudgetBar(props.budget.percentage),
        fg: getBudgetColor(props.budget.percentage),
      }),
      Text({
        content: `${props.budget.percentage}%`,
        fg: getBudgetColor(props.budget.percentage),
        attributes: 1,
      }),
    ),
  );
}