import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../../shared/theme/theme';
import { formatDate } from '../../../../shared/utils/formatDate';
import { getInitials } from '../../../../shared/utils/getInitials';
import type { Task } from '../../domain/entities/Task';
import { PRIORITY_COLORS } from '../taskColors';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';
import { PriorityBadge, StatusBadge } from './TaskBadges';

interface TaskCardProps {
  task: Task;
  /** Called with the task id when the card is pressed. */
  onPress?: (taskId: string) => void;
}

/** One task in the list: title, description preview, status/priority, assignee and dates. */
function TaskCardComponent({ task, onPress }: TaskCardProps) {
  const created = formatDate(task.createdDate);
  const updated = formatDate(task.modifiedDate);
  const wasUpdated = task.modifiedDate !== task.createdDate && updated !== '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress ? () => onPress(task.id) : undefined}
      accessibilityRole="button"
      accessibilityHint="Opens task details"
      accessibilityLabel={`${task.title}. ${STATUS_LABELS[task.status]}, ${
        PRIORITY_LABELS[task.priority]
      } priority. Assigned to ${task.assignedTo}.`}
      testID="task-card"
    >
      {/* Priority color strip: a quick visual cue next to the text badge. */}
      <View
        style={[
          styles.strip,
          { backgroundColor: PRIORITY_COLORS[task.priority].text },
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.badges}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </View>

        <View style={styles.footer}>
          <View style={styles.assignee}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(task.assignedTo)}
              </Text>
            </View>
            <Text style={styles.assigneeName} numberOfLines={1}>
              {task.assignedTo}
            </Text>
          </View>
          <Text style={styles.date}>
            {wasUpdated ? `Updated ${updated}` : `Created ${created}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const TaskCard = memo(TaskCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  strip: { width: 5 },
  body: { flex: 1, padding: spacing.lg },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  assignee: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#3730A3' },
  assigneeName: {
    marginLeft: spacing.sm,
    flexShrink: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  date: { fontSize: 12, color: colors.textMuted },
});
