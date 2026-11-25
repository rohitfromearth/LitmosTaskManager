import { useCallback, useEffect } from 'react';
import type { Task } from '../../domain/entities/Task';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import { selectTaskDetail } from '../state/tasksSlice';
import { loadTask } from '../state/tasksThunks';

export interface TaskDetailView {
  /** The task, once loaded. Kept on screen while it reloads or if a reload fails. */
  task: Task | null;
  /** Nothing to show yet and the first read is still running. */
  isLoading: boolean;
  /** The read finished and the task doesn't exist (or was deleted). */
  missing: boolean;
  /** Message of a failed read; may be set while `task` is still shown (stale). */
  error: string | null;
  reload: () => void;
}

/** Loads one task from the repository when the screen opens and exposes its state. */
export function useTaskDetail(taskId: string): TaskDetailView {
  const dispatch = useTasksDispatch();
  const detail = useTasksSelector(selectTaskDetail);

  const reload = useCallback(() => {
    dispatch(loadTask(taskId));
  }, [dispatch, taskId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // State for a different task (or none yet) counts as "not loaded for this id".
  const isCurrent = detail.taskId === taskId;
  const task = isCurrent ? detail.task : null;
  const status = isCurrent ? detail.load.status : 'idle';

  return {
    task,
    isLoading: !task && (status === 'idle' || status === 'loading'),
    missing: !task && status === 'succeeded',
    error: isCurrent && status === 'failed' ? detail.load.error : null,
    reload,
  };
}
