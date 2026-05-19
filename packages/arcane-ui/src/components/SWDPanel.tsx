import { Box, Text, ScrollBox } from '@opentui/core';
import type { VNode } from '@opentui/core';
import { COLORS, SEMANTIC_COLORS } from '../primitives';

interface SWDPanelProps {
  status: {
    active: boolean;
    currentStep: string;
    progress: number;
    logs: string[];
  };
}

export function createSWDPanel(props: SWDPanelProps): VNode {
  const statusColor = props.status.active
    ? SEMANTIC_COLORS.success
    : COLORS.textSecondary;

  const statusDot = props.status.active ? '●' : '○';

  const filledCount = Math.floor(props.status.progress / 5);
  const emptyCount = 20 - filledCount;
  const progressBar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

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
        Text({ content: '󰑮', fg: COLORS.accentCyan }),
        Text({ content: 'SWD Status', fg: COLORS.accentCyan, attributes: 1 }),
      ),
      Box(
        { flexDirection: 'row', alignItems: 'center', gap: 1 },
        Text({ content: statusDot, fg: statusColor }),
        Text({
          content: props.status.active ? 'Active' : 'Inactive',
          fg: statusColor,
          attributes: 1,
        }),
      ),
    ),
    // Progress section
    Box(
      {
        flexDirection: 'column',
        paddingX: 2,
        paddingY: 1,
        gap: 1,
        border: ['bottom'],
        borderColor: COLORS.border,
      },
      // Current step
      Box(
        { flexDirection: 'row', alignItems: 'center', height: 2, gap: 2 },
        Text({ content: 'Step:', fg: COLORS.textSecondary }),
        Text({
          content: props.status.currentStep,
          fg: COLORS.textPrimary,
          attributes: 1,
        }),
      ),
      // Progress bar
      Box(
        { flexDirection: 'row', alignItems: 'center', height: 2, gap: 2 },
        Text({ content: 'Progress:', fg: COLORS.textSecondary }),
        Text({ content: progressBar, fg: COLORS.accentGreen }),
        Text({
          content: `${props.status.progress}%`,
          fg: COLORS.accentGreen,
          attributes: 1,
        }),
      ),
    ),
    // Logs section
    ScrollBox(
      {
        flexDirection: 'column',
        flexGrow: 1,
        scrollY: true,
        paddingX: 2,
        paddingY: 1,
      },
      props.status.logs.length === 0
        ? Box(
            {
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            },
            Text({ content: 'No SWD activity yet.', fg: COLORS.textSecondary }),
          )
        : Box(
            { flexDirection: 'column', gap: 0 },
            ...props.status.logs.map((log, i) =>
              Box(
                { flexDirection: 'row', alignItems: 'center', gap: 1 },
                Text({ content: `${(i + 1).toString().padStart(3, ' ')}`, fg: COLORS.border }),
                Text({ content: '│', fg: COLORS.border }),
                Text({ content: log, fg: COLORS.textSecondary }),
              ),
            ),
          ),
    ),
  );
}

export const SWDPanel = createSWDPanel;