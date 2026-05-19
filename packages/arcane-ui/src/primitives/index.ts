export const COLORS = {
  background: '#0D1117',
  surface: '#161B22',
  border: '#30363D',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  accentCyan: '#58A6FF',
  accentGreen: '#3FB950',
  accentYellow: '#D29922',
  accentRed: '#F85149',
  userRole: '#58A6FF',
  assistantRole: '#A371F7',
} as const;

export const SEMANTIC_COLORS = {
  success: '#3FB950',
  warning: '#D29922',
  error: '#F85149',
  info: '#58A6FF',
} as const;

export function getBudgetColor(percentage: number): string {
  if (percentage > 80) return SEMANTIC_COLORS.error;
  if (percentage > 50) return SEMANTIC_COLORS.warning;
  return SEMANTIC_COLORS.success;
}

export function formatBudgetBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}