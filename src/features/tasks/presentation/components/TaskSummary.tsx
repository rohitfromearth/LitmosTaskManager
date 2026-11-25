import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../../../../shared/theme/theme';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../domain/entities/Task';
import type { TaskSummary as TaskSummaryData } from '../../domain/repositories/TaskRepository';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import { selectSummaryState, selectTaskSummary } from '../state/tasksSlice';
import { loadSummary } from '../state/tasksThunks';
import { PRIORITY_COLORS, STATUS_COLORS } from '../taskColors';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';

/** Every active task has exactly one status, so the status counts add up to the total. */
export function totalTasks(summary: TaskSummaryData): number {
  return TASK_STATUSES.reduce(
    (sum, status) => sum + summary.byStatus[status],
    0,
  );
}

function Tile({
  label,
  count,
  color,
  testID,
}: {
  label: string;
  count: number | null;
  color: string;
  testID: string;
}) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={
        count === null ? `${label}: loading` : `${label}: ${count}`
      }
      testID={testID}
    >
      <View style={styles.tileHeader}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.tileCount}>{count === null ? '–' : count}</Text>
    </View>
  );
}

/**
 * Counts of all active (non-deleted) tasks, by status and by priority. It reads
 * the summary the repository already computes and never looks at the list or
 * the search and filters, so the numbers don't change when the list is narrowed.
 * It never blocks the list: while loading it shows placeholders, and if the
 * read fails it shows a small error with Retry (keeping old counts if it has any).
 */
export function TaskSummary() {
  const dispatch = useTasksDispatch();
  const summary = useTasksSelector(selectTaskSummary);
  const load = useTasksSelector(selectSummaryState);

  const retry = () => {
    dispatch(loadSummary());
  };

  if (!summary && load.status === 'failed') {
    return (
      <View style={styles.card} testID="task-summary-error">
        <Text style={styles.title}>All tasks</Text>
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn't load the summary.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            hitSlop={8}
            testID="task-summary-error-action"
          >
            <Text style={styles.errorAction}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // No data yet: same layout with placeholders, so nothing jumps when it arrives.
  const isLoading = !summary;
  const total = summary ? totalTasks(summary) : null;

  return (
    <View
      style={styles.card}
      testID={isLoading ? 'task-summary-loading' : 'task-summary'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>All tasks</Text>
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text
            style={styles.total}
            accessibilityLabel={`${total} active tasks`}
            testID="task-summary-total"
          >
            {total}
          </Text>
        )}
      </View>

      <Text style={styles.groupLabel}>By status</Text>
      <View style={styles.row}>
        {TASK_STATUSES.map(status => (
          <Tile
            key={status}
            label={STATUS_LABELS[status]}
            count={summary ? summary.byStatus[status] : null}
            color={STATUS_COLORS[status].text}
            testID={`summary-status-${status}`}
          />
        ))}
      </View>

      <Text style={styles.groupLabel}>By priority</Text>
      <View style={styles.row}>
        {TASK_PRIORITIES.map(priority => (
          <Tile
            key={priority}
            label={PRIORITY_LABELS[priority]}
            count={summary ? summary.byPriority[priority] : null}
            color={PRIORITY_COLORS[priority].text}
            testID={`summary-priority-${priority}`}
          />
        ))}
      </View>

      {summary && load.status === 'failed' ? (
        <View style={styles.errorRow} testID="task-summary-refresh-error">
          <Text style={styles.errorText}>
            Couldn't refresh the counts. They may be out of date.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            hitSlop={8}
            testID="task-summary-refresh-error-action"
          >
            <Text style={styles.errorAction}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  total: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  groupLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  // Tiles share the row; on a narrow screen they wrap instead of squeezing.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 68,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.background,
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, marginRight: spacing.xs + 2, borderRadius: 4 },
  tileLabel: { flexShrink: 1, fontSize: 12, color: colors.textSecondary },
  tileCount: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.dangerSurface,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger },
  errorAction: { fontSize: 13, fontWeight: '700', color: colors.danger },
});
