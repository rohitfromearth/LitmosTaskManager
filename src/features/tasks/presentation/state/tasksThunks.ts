import {
  createAsyncThunk,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { Task } from '../../domain/entities/Task';
import type {
  NewTask,
  TaskChanges,
  TaskSummary,
} from '../../domain/repositories/TaskRepository';
import { TaskValidationError } from '../../domain/rules/taskValidation';
import type { TasksRootState, ThunkError, ThunkExtra } from './tasksState';

const createThunk = createAsyncThunk.withTypes<{
  state: TasksRootState;
  extra: ThunkExtra;
  rejectValue: ThunkError;
}>();

export function toThunkError(error: unknown): ThunkError {
  if (error instanceof TaskValidationError) {
    return { message: error.message, fieldErrors: error.errors };
  }
  return {
    message: error instanceof Error ? error.message : 'Something went wrong',
  };
}

/** Loads the tasks matching the filter currently in state. */
export const loadTasks = createThunk<Task[], void>(
  'tasks/load',
  async (_, { getState, extra, rejectWithValue }) => {
    try {
      return await extra.taskRepository.getTasks(getState().tasks.filter);
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
  },
);

/** Reads one task; resolves with null if it doesn't exist or is soft-deleted. */
export const loadTask = createThunk<Task | null, string>(
  'tasks/loadTask',
  async (id, { extra, rejectWithValue }) => {
    try {
      return await extra.taskRepository.getTaskById(id);
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
  },
);

export const loadSummary = createThunk<TaskSummary, void>(
  'tasks/loadSummary',
  async (_, { extra, rejectWithValue }) => {
    try {
      return await extra.taskRepository.getTaskSummary();
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
  },
);

/**
 * SQLite stays the source of truth: after a successful write the list and the
 * summary are re-read from the repository instead of being patched in Redux
 * (the change may add or remove the task from the current filter).
 * A failed refresh shows up in `list`/`summaryLoad`, not as a failed write.
 */
const refresh = (
  dispatch: ThunkDispatch<TasksRootState, ThunkExtra, UnknownAction>,
) => Promise.all([dispatch(loadTasks()), dispatch(loadSummary())]);

export const createTask = createThunk<Task, NewTask>(
  'tasks/create',
  async (input, { dispatch, extra, rejectWithValue }) => {
    let task: Task;
    try {
      task = await extra.taskRepository.createTask(input);
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
    await refresh(dispatch);
    return task;
  },
);

export const updateTask = createThunk<
  Task,
  { id: string; changes: TaskChanges }
>(
  'tasks/update',
  async ({ id, changes }, { dispatch, extra, rejectWithValue }) => {
    let task: Task;
    try {
      task = await extra.taskRepository.updateTask(id, changes);
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
    // Also re-read this task so the details screen shows the saved values.
    await Promise.all([refresh(dispatch), dispatch(loadTask(id))]);
    return task;
  },
);

/** Soft delete; resolves with the deleted task's id. */
export const deleteTask = createThunk<string, string>(
  'tasks/delete',
  async (id, { dispatch, extra, rejectWithValue }) => {
    try {
      await extra.taskRepository.deleteTask(id);
    } catch (error) {
      return rejectWithValue(toThunkError(error));
    }
    await refresh(dispatch);
    return id;
  },
);
