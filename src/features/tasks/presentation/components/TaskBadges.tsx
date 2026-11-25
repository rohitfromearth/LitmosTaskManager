import { Badge } from '../../../../shared/components/Badge';
import type { TaskPriority, TaskStatus } from '../../domain/entities/Task';
import { PRIORITY_COLORS, STATUS_COLORS } from '../taskColors';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';

export function StatusBadge({ status }: { status: TaskStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge
      label={STATUS_LABELS[status]}
      textColor={colors.text}
      backgroundColor={colors.background}
      showDot
      testID="status-badge"
    />
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <Badge
      label={PRIORITY_LABELS[priority]}
      textColor={colors.text}
      backgroundColor={colors.background}
      testID="priority-badge"
    />
  );
}
