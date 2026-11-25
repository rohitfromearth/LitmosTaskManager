import type { TaskPriority, TaskStatus } from '../domain/entities/Task';

interface BadgeColors {
  text: string;
  background: string;
}

// Record<...> makes the compiler fail if a status or priority has no colors.
export const STATUS_COLORS: Record<TaskStatus, BadgeColors> = {
  todo: { text: '#475569', background: '#E2E8F0' },
  in_progress: { text: '#1D4ED8', background: '#DBEAFE' },
  done: { text: '#15803D', background: '#DCFCE7' },
};

export const PRIORITY_COLORS: Record<TaskPriority, BadgeColors> = {
  low: { text: '#475569', background: '#F1F5F9' },
  medium: { text: '#A16207', background: '#FEF3C7' },
  high: { text: '#C2410C', background: '#FFEDD5' },
  critical: { text: '#B91C1C', background: '#FEE2E2' },
};
