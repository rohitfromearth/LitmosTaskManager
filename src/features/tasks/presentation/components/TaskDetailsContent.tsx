import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../../shared/theme/theme';
import { formatDateTime } from '../../../../shared/utils/formatDate';
import { getInitials } from '../../../../shared/utils/getInitials';
import type { Task } from '../../domain/entities/Task';
import { PriorityBadge, StatusBadge } from './TaskBadges';

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

/** Every field of a task, read-only. */
export function TaskDetailsContent({ task }: { task: Task }) {
  return (
    <View testID="task-details">
      <Text style={styles.title} accessibilityRole="header">
        {task.title}
      </Text>
      <View style={styles.badges}>
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Description</Text>
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : (
          <Text style={styles.empty}>No description</Text>
        )}
      </View>

      <View style={styles.card}>
        <Row label="Assigned to">
          <View style={styles.assignee}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(task.assignedTo)}
              </Text>
            </View>
            <Text style={styles.value}>{task.assignedTo}</Text>
          </View>
        </Row>
        <Row label="Created">
          <Text style={styles.value}>{formatDateTime(task.createdDate)}</Text>
        </Row>
        <Row label="Last modified">
          <Text style={styles.value}>{formatDateTime(task.modifiedDate)}</Text>
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  description: { fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  empty: { fontSize: 15, fontStyle: 'italic', color: colors.textMuted },
  row: { paddingVertical: spacing.sm },
  rowLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  rowValue: { marginTop: 2 },
  value: { fontSize: 16, color: colors.textPrimary, flexShrink: 1 },
  assignee: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28,
    height: 28,
    marginRight: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#3730A3' },
});
