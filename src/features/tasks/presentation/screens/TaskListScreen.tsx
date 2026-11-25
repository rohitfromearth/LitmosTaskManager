import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InlineBanner } from '../../../../shared/components/InlineBanner';
import { FloatingActionButton } from '../../../../shared/components/FloatingActionButton';
import { MessageState } from '../../../../shared/components/MessageState';
import {
  colors,
  MAX_CONTENT_WIDTH,
  spacing,
} from '../../../../shared/theme/theme';
import type { Task } from '../../domain/entities/Task';
import { TaskCard } from '../components/TaskCard';
import { TaskFilterBar } from '../components/TaskFilterBar';
import { TaskSummary } from '../components/TaskSummary';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import {
  applyFilter,
  selectListState,
  selectTaskFilter,
  selectTasks,
} from '../state/tasksSlice';
import { loadSummary, loadTasks } from '../state/tasksThunks';
import { hasActiveFilter } from '../taskFilter';

interface TaskListScreenProps {
  /** Called when the Add Task button is pressed. */
  onAddTask: () => void;
  /** Called with the task id when a task card is pressed. */
  onOpenTask: (taskId: string) => void;
}

const keyExtractor = (task: Task) => task.id;
const Separator = () => <View style={styles.separator} />;

/** The task list: reads the SQLite-backed Redux state and shows loading, error and empty states. */
export function TaskListScreen({ onAddTask, onOpenTask }: TaskListScreenProps) {
  const dispatch = useTasksDispatch();
  const tasks = useTasksSelector(selectTasks);
  const list = useTasksSelector(selectListState);
  const filter = useTasksSelector(selectTaskFilter);
  const insets = useSafeAreaInsets();

  const reload = useCallback(() => {
    dispatch(loadTasks());
    dispatch(loadSummary());
  }, [dispatch]);

  const clearFilters = useCallback(() => {
    dispatch(applyFilter({}));
  }, [dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: Task }) => <TaskCard task={item} onPress={onOpenTask} />,
    [onOpenTask],
  );

  const hasTasks = tasks.length > 0;
  const isFiltered = hasActiveFilter(filter);
  const isLoading = list.status === 'idle' || list.status === 'loading';

  let content;
  if (!hasTasks && isLoading) {
    content = (
      <View style={styles.centered} testID="tasks-loading">
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading tasks…</Text>
      </View>
    );
  } else if (!hasTasks && list.status === 'failed') {
    content = (
      <MessageState
        testID="tasks-error"
        title="Couldn't load tasks"
        message={list.error ?? undefined}
        actionLabel="Try again"
        onAction={reload}
      />
    );
  } else if (!hasTasks) {
    content = (
      <MessageState
        testID="tasks-empty"
        title={isFiltered ? 'No matching tasks' : 'No tasks yet'}
        message={
          isFiltered
            ? 'Try changing or clearing your filters.'
            : 'Tap “Add task” to create your first one.'
        }
        actionLabel={isFiltered ? 'Clear filters' : undefined}
        onAction={isFiltered ? clearFilters : undefined}
      />
    );
  } else {
    content = (
      <FlatList
        data={tasks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <TaskSummary />
            <Text
              style={styles.count}
              accessibilityRole="header"
              testID="task-count"
            >
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              {isFiltered ? ' (filtered)' : ''}
            </Text>
            {list.status === 'failed' && (
              <InlineBanner
                message={
                  isFiltered
                    ? "Couldn't update the results. They may not match your filters."
                    : "Couldn't refresh. Showing the last loaded tasks."
                }
                actionLabel="Retry"
                onAction={reload}
                testID="tasks-refresh-error"
              />
            )}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          // Room for the floating button so it never covers the last card.
          { paddingBottom: 88 + insets.bottom },
        ]}
        refreshing={list.status === 'loading'}
        onRefresh={reload}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        testID="task-list"
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <TaskFilterBar />
        <View style={styles.results}>
          {/* With tasks, the summary heads the list. In the other states it sits above them. */}
          {hasTasks ? null : (
            <View style={styles.summaryAbove}>
              <TaskSummary />
            </View>
          )}
          {content}
        </View>
      </View>
      <FloatingActionButton
        label="Add task"
        onPress={onAddTask}
        bottomOffset={insets.bottom}
        testID="add-task-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Centered, width-limited column so tablets and landscape stay readable.
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  results: { flex: 1 },
  summaryAbove: { padding: spacing.lg, paddingBottom: 0 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  listContent: { padding: spacing.lg },
  separator: { height: spacing.md },
  count: {
    marginBottom: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
