import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { InlineBanner } from '../../../../shared/components/InlineBanner';
import {
  colors,
  MAX_CONTENT_WIDTH,
  spacing,
} from '../../../../shared/theme/theme';
import type { Task } from '../../domain/entities/Task';
import { TaskDetailFallback } from '../components/TaskDetailFallback';
import { TaskDetailsContent } from '../components/TaskDetailsContent';
import { toSubmitOutcome } from '../components/TaskForm';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { useTasksDispatch } from '../state/hooks';
import { deleteTask } from '../state/tasksThunks';

interface TaskDetailsScreenProps {
  taskId: string;
  onEdit: () => void;
  /** Called once after the task has been deleted. The caller decides where to go. */
  onDeleted: () => void;
  onBack: () => void;
}

/**
 * Read-only view of one task, loaded from the repository, with Edit and Delete.
 * Delete asks for confirmation, then dispatches the `deleteTask` thunk (a soft
 * delete). Its progress is kept in this screen, not in the shared `mutation`
 * state, because this screen stays mounted under Edit, whose save errors would
 * otherwise show up here.
 */
export function TaskDetailsScreen({
  taskId,
  onEdit,
  onDeleted,
  onBack,
}: TaskDetailsScreenProps) {
  const dispatch = useTasksDispatch();
  const { task, isLoading, missing, error, reload } = useTaskDetail(taskId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Refs, not state, so two quick presses can't both get through before a render.
  const deleteInFlight = useRef(false);
  const confirmOpen = useRef(false);
  const mounted = useRef(true);
  // The last task shown, so the screen doesn't go blank while it slides away
  // after the delete cleared the loaded task from the store.
  const lastTask = useRef<Task | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (task) {
    lastTask.current = task;
  }
  const shownTask = task ?? (isDeleting || isDeleted ? lastTask.current : null);

  const runDelete = async () => {
    if (deleteInFlight.current) {
      return;
    }
    deleteInFlight.current = true;
    setIsDeleting(true);
    setDeleteError(null);

    const outcome = toSubmitOutcome(await dispatch(deleteTask(taskId)));
    deleteInFlight.current = false;
    if (!mounted.current) {
      // Left the screen mid-delete: it still went through, but don't navigate again.
      return;
    }

    setIsDeleting(false);
    if (outcome.ok) {
      setIsDeleted(true);
      onDeleted();
    } else {
      setDeleteError(outcome.error.message);
    }
  };

  const confirmDelete = () => {
    if (deleteInFlight.current || confirmOpen.current || !shownTask) {
      return;
    }
    confirmOpen.current = true;
    const close = () => {
      confirmOpen.current = false;
    };
    Alert.alert(
      'Delete task?',
      `“${shownTask.title}” will be removed from your active task list and the task counts.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: close },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            close();
            runDelete();
          },
        },
      ],
      { cancelable: true, onDismiss: close },
    );
  };

  if (!shownTask) {
    return (
      <TaskDetailFallback
        isLoading={isLoading}
        missing={missing}
        error={error}
        onRetry={reload}
        onBack={onBack}
      />
    );
  }

  const busy = isDeleting || isDeleted;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      testID="task-details-screen"
    >
      <View style={styles.content}>
        {deleteError ? (
          <InlineBanner
            message={`Couldn't delete the task. ${deleteError}`}
            actionLabel="Try again"
            onAction={runDelete}
            testID="task-details-delete-error"
          />
        ) : null}
        {error && !busy ? (
          <InlineBanner
            message="Couldn't refresh. Showing the last loaded details."
            actionLabel="Retry"
            onAction={reload}
            testID="task-details-refresh-error"
          />
        ) : null}
        <TaskDetailsContent task={shownTask} />
        <View style={styles.actions}>
          <Button
            label="Edit"
            onPress={onEdit}
            disabled={busy}
            testID="task-details-edit"
          />
          <Button
            label={isDeleting ? 'Deleting…' : 'Delete'}
            variant="danger"
            onPress={confirmDelete}
            loading={isDeleting}
            disabled={isDeleted}
            testID="task-details-delete"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
