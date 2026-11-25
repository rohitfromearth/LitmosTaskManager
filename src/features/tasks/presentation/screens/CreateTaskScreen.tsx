import { useEffect } from 'react';
import type { NewTask } from '../../domain/repositories/TaskRepository';
import {
  TaskForm,
  toSubmitOutcome,
  type SubmitOutcome,
} from '../components/TaskForm';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import { mutationErrorCleared, selectMutationState } from '../state/tasksSlice';
import { createTask } from '../state/tasksThunks';

interface CreateTaskScreenProps {
  /** Called once after the task has been saved. The caller decides where to go next. */
  onCreated: () => void;
}

/** Create-task screen: the shared form, saved through the `createTask` thunk. */
export function CreateTaskScreen({ onCreated }: CreateTaskScreenProps) {
  const dispatch = useTasksDispatch();
  const isSaving = useTasksSelector(selectMutationState).status === 'pending';

  useEffect(() => {
    // Don't show an error left over from an earlier create/update/delete.
    dispatch(mutationErrorCleared());
  }, [dispatch]);

  const handleSubmit = async (input: NewTask): Promise<SubmitOutcome> =>
    toSubmitOutcome(await dispatch(createTask(input)));

  return (
    <TaskForm
      submitLabel="Save task"
      savingLabel="Saving…"
      isSaving={isSaving}
      onSubmit={handleSubmit}
      onSuccess={onCreated}
    />
  );
}
