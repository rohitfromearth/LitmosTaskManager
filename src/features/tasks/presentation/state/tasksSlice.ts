import {
  createSlice,
  isAnyOf,
  type PayloadAction,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { TaskFilter } from '../../domain/repositories/TaskRepository';
import type {
  LoadState,
  TasksRootState,
  TasksState,
  ThunkExtra,
} from './tasksState';
import {
  createTask,
  deleteTask,
  loadSummary,
  loadTask,
  loadTasks,
  updateTask,
} from './tasksThunks';

const idleLoad = (): LoadState => ({
  status: 'idle',
  error: null,
  requestId: null,
});

export const initialState: TasksState = {
  items: [],
  filter: {},
  summary: null,
  list: idleLoad(),
  summaryLoad: idleLoad(),
  detail: { taskId: null, task: null, load: idleLoad() },
  mutation: { status: 'idle', error: null },
};

const mutations = [createTask, updateTask, deleteTask];

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    filterChanged(state, action: PayloadAction<TaskFilter>) {
      state.filter = action.payload;
    },
    mutationErrorCleared(state) {
      state.mutation = { status: 'idle', error: null };
    },
  },
  extraReducers: builder => {
    // Reads keep the previous data while reloading or after a failure. Only the
    // latest request may update state, so a slow earlier response can't overwrite it.
    builder
      .addCase(loadTasks.pending, (state, action) => {
        state.list = {
          status: 'loading',
          error: null,
          requestId: action.meta.requestId,
        };
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return;
        state.items = action.payload;
        state.list.status = 'succeeded';
      })
      .addCase(loadTasks.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return;
        state.list.status = 'failed';
        state.list.error =
          action.payload?.message ??
          action.error.message ??
          'Failed to load tasks';
      })
      .addCase(loadTask.pending, (state, action) => {
        const { requestId, arg: taskId } = action.meta;
        // Never show another task's data while this one loads; reloading the
        // same task keeps what is on screen.
        if (state.detail.taskId !== taskId) {
          state.detail.task = null;
        }
        state.detail.taskId = taskId;
        state.detail.load = { status: 'loading', error: null, requestId };
      })
      .addCase(loadTask.fulfilled, (state, action) => {
        if (state.detail.load.requestId !== action.meta.requestId) return;
        state.detail.task = action.payload;
        state.detail.load.status = 'succeeded';
      })
      .addCase(loadTask.rejected, (state, action) => {
        if (state.detail.load.requestId !== action.meta.requestId) return;
        state.detail.load.status = 'failed';
        state.detail.load.error =
          action.payload?.message ??
          action.error.message ??
          'Failed to load task';
      })
      .addCase(loadSummary.pending, (state, action) => {
        state.summaryLoad = {
          status: 'loading',
          error: null,
          requestId: action.meta.requestId,
        };
      })
      .addCase(loadSummary.fulfilled, (state, action) => {
        if (state.summaryLoad.requestId !== action.meta.requestId) return;
        state.summary = action.payload;
        state.summaryLoad.status = 'succeeded';
      })
      .addCase(loadSummary.rejected, (state, action) => {
        if (state.summaryLoad.requestId !== action.meta.requestId) return;
        state.summaryLoad.status = 'failed';
        state.summaryLoad.error =
          action.payload?.message ??
          action.error.message ??
          'Failed to load summary';
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        // A deleted task must not stay available as "the loaded task". Clearing
        // the request id also drops a read for it that is still in flight.
        if (state.detail.taskId === action.payload) {
          state.detail = { taskId: null, task: null, load: idleLoad() };
        }
      })
      .addMatcher(isAnyOf(...mutations.map(m => m.pending)), state => {
        state.mutation = { status: 'pending', error: null };
      })
      .addMatcher(isAnyOf(...mutations.map(m => m.fulfilled)), state => {
        state.mutation = { status: 'succeeded', error: null };
      })
      .addMatcher(
        isAnyOf(...mutations.map(m => m.rejected)),
        (state, action) => {
          state.mutation = {
            status: 'failed',
            error: action.payload ?? {
              message: action.error.message ?? 'Something went wrong',
            },
          };
        },
      );
  },
});

export const { filterChanged, mutationErrorCleared } = tasksSlice.actions;
export const tasksReducer = tasksSlice.reducer;

/** Sets the filter and reloads the list with it. Pass `{}` to clear filters. */
export const applyFilter =
  (
    filter: TaskFilter,
  ): ThunkAction<
    ReturnType<ReturnType<typeof loadTasks>>,
    TasksRootState,
    ThunkExtra,
    UnknownAction
  > =>
  dispatch => {
    dispatch(filterChanged(filter));
    return dispatch(loadTasks());
  };

export const selectTasks = (state: TasksRootState) => state.tasks.items;
export const selectTaskFilter = (state: TasksRootState) => state.tasks.filter;
export const selectTaskSummary = (state: TasksRootState) => state.tasks.summary;
export const selectListState = (state: TasksRootState) => state.tasks.list;
export const selectSummaryState = (state: TasksRootState) =>
  state.tasks.summaryLoad;
export const selectTaskDetail = (state: TasksRootState) => state.tasks.detail;
export const selectMutationState = (state: TasksRootState) =>
  state.tasks.mutation;
