import { useEffect } from 'react';
import type { NewTask } from '../../domain/repositories/TaskRepository';
import { TaskDetailFallback } from '../components/TaskDetailFallback';
import {
  TaskForm,
  toFormValues,
  toSubmitOutcome,
  type SubmitOutcome,
} from '../components/TaskForm';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import { mutationErrorCleared, selectMutationState } from '../state/tasksSlice';
import { updateTask } from '../state/tasksThunks';
import { diffTaskChanges } from '../taskChanges';

interface EditTaskScreenProps {
  taskId: string;
  /** Called once after the changes have been saved (or there was nothing to save). */
  onUpdated: () => void;
  onBack: () => void;
}

/** Edit-task screen: the shared form, prefilled, saved through the `updateTask` thunk. */
export function EditTaskScreen({
  taskId,
  onUpdated,
  onBack,
}: EditTaskScreenProps) {
  const dispatch = useTasksDispatch();
  const isSaving = useTasksSelector(selectMutationState).status === 'pending';
  const { task, isLoading, missing, error, reload } = useTaskDetail(taskId);

  useEffect(() => {
    // Don't show an error left over from an earlier create/update/delete.
    dispatch(mutationErrorCleared());
  }, [dispatch]);

  if (!task) {
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

  const handleSubmit = async (input: NewTask): Promise<SubmitOutcome> => {
    // Send only what changed. Saving without changes writes nothing, so the
    // modified date isn't bumped for a no-op.
    const changes = diffTaskChanges(task, input);
    if (Object.keys(changes).length === 0) {
      return { ok: true };
    }
    return toSubmitOutcome(
      await dispatch(updateTask({ id: task.id, changes })),
    );
  };

  return (
    <TaskForm
      // The form reads its initial values once; the key restarts it for another task.
      key={task.id}
      initialValues={toFormValues(task)}
      submitLabel="Save changes"
      savingLabel="Saving…"
      isSaving={isSaving}
      onSubmit={handleSubmit}
      onSuccess={onUpdated}
    />
  );
}
