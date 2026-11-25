import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  createMockRepository,
  deferred,
  emptySummary,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import type { Task } from '../../../domain/entities/Task';
import { TaskValidationError } from '../../../domain/rules/taskValidation';
import {
  applyFilter,
  filterChanged,
  initialState,
  mutationErrorCleared,
  selectListState,
  selectMutationState,
  selectSummaryState,
  selectTaskFilter,
  selectTasks,
  selectTaskSummary,
} from '../tasksSlice';
import {
  createTask,
  deleteTask,
  loadSummary,
  loadTasks,
  updateTask,
} from '../tasksThunks';

function setup(overrides: Parameters<typeof createMockRepository>[0] = {}) {
  const repo = createMockRepository(overrides);
  const store = createAppStore(repo);
  return { repo, store };
}

describe('initial state', () => {
  it('starts idle with no data', () => {
    const { store } = setup();
    expect(store.getState().tasks).toEqual(initialState);
    expect(selectTasks(store.getState())).toEqual([]);
    expect(selectTaskSummary(store.getState())).toBeNull();
    expect(selectListState(store.getState()).status).toBe('idle');
  });
});

describe('loadTasks', () => {
  it('goes loading then succeeded and stores the repository result', async () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    const gate = deferred<Task[]>();
    const { store } = setup({
      getTasks: jest.fn().mockReturnValue(gate.promise),
    });

    const request = store.dispatch(loadTasks());
    expect(selectListState(store.getState()).status).toBe('loading');

    gate.resolve(tasks);
    await request;

    expect(selectListState(store.getState())).toMatchObject({
      status: 'succeeded',
      error: null,
    });
    expect(selectTasks(store.getState())).toEqual(tasks);
  });

  it('records the error and keeps the previous tasks when loading fails', async () => {
    const previous = [makeTask()];
    const getTasks = jest
      .fn()
      .mockResolvedValueOnce(previous)
      .mockRejectedValueOnce(new Error('disk error'));
    const { store } = setup({ getTasks });

    await store.dispatch(loadTasks());
    await store.dispatch(loadTasks());

    expect(selectListState(store.getState())).toMatchObject({
      status: 'failed',
      error: 'disk error',
    });
    expect(selectTasks(store.getState())).toEqual(previous);
  });

  it('keeps showing the previous tasks while reloading and clears the old error', async () => {
    const getTasks = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockReturnValueOnce(new Promise(() => {}));
    const { store } = setup({ getTasks });

    await store.dispatch(loadTasks());
    expect(selectListState(store.getState()).error).toBe('boom');

    store.dispatch(loadTasks());
    expect(selectListState(store.getState())).toMatchObject({
      status: 'loading',
      error: null,
    });
  });

  it('ignores a stale response that arrives after a newer one', async () => {
    const first = deferred<Task[]>();
    const second = deferred<Task[]>();
    const getTasks = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { store } = setup({ getTasks });

    const slow = store.dispatch(loadTasks());
    const fast = store.dispatch(loadTasks());

    second.resolve([makeTask({ id: 'new' })]);
    await fast;
    first.resolve([makeTask({ id: 'old' })]);
    await slow;

    expect(selectTasks(store.getState()).map(t => t.id)).toEqual(['new']);
    expect(selectListState(store.getState()).status).toBe('succeeded');
  });
});

describe('filters', () => {
  it('stores the filter and loads with it', async () => {
    const { repo, store } = setup();

    await store.dispatch(
      applyFilter({ status: 'done', priority: 'critical', keyword: 'api' }),
    );

    expect(selectTaskFilter(store.getState())).toEqual({
      status: 'done',
      priority: 'critical',
      keyword: 'api',
    });
    expect(repo.getTasks).toHaveBeenCalledWith({
      status: 'done',
      priority: 'critical',
      keyword: 'api',
    });
  });

  it('clears filters with an empty filter', async () => {
    const { repo, store } = setup();
    await store.dispatch(applyFilter({ status: 'done' }));
    await store.dispatch(applyFilter({}));

    expect(selectTaskFilter(store.getState())).toEqual({});
    expect(repo.getTasks).toHaveBeenLastCalledWith({});
  });

  it('uses the latest filter when responses arrive out of order', async () => {
    const first = deferred<Task[]>();
    const second = deferred<Task[]>();
    const getTasks = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { store } = setup({ getTasks });

    const a = store.dispatch(applyFilter({ status: 'todo' }));
    const b = store.dispatch(applyFilter({ status: 'done' }));
    second.resolve([makeTask({ id: 'done-task', status: 'done' })]);
    await b;
    first.resolve([makeTask({ id: 'todo-task' })]);
    await a;

    expect(selectTaskFilter(store.getState())).toEqual({ status: 'done' });
    expect(selectTasks(store.getState()).map(t => t.id)).toEqual(['done-task']);
  });

  it('changing the filter alone does not call the repository', () => {
    const { repo, store } = setup();
    store.dispatch(filterChanged({ keyword: 'x' }));
    expect(repo.getTasks).not.toHaveBeenCalled();
  });
});

describe('loadSummary', () => {
  it('stores the counts', async () => {
    const summary = {
      ...emptySummary,
      byStatus: { todo: 2, in_progress: 1, done: 0 },
    };
    const { store } = setup({
      getTaskSummary: jest.fn().mockResolvedValue(summary),
    });

    const request = store.dispatch(loadSummary());
    expect(selectSummaryState(store.getState()).status).toBe('loading');
    await request;

    expect(selectTaskSummary(store.getState())).toEqual(summary);
    expect(selectSummaryState(store.getState())).toMatchObject({
      status: 'succeeded',
      error: null,
    });
  });

  it('records an error and keeps the previous summary on failure', async () => {
    const getTaskSummary = jest
      .fn()
      .mockResolvedValueOnce(emptySummary)
      .mockRejectedValueOnce(new Error('nope'));
    const { store } = setup({ getTaskSummary });

    await store.dispatch(loadSummary());
    await store.dispatch(loadSummary());

    expect(selectSummaryState(store.getState())).toMatchObject({
      status: 'failed',
      error: 'nope',
    });
    expect(selectTaskSummary(store.getState())).toEqual(emptySummary);
  });
});

describe('createTask', () => {
  const input = {
    title: 'New',
    description: '',
    status: 'todo',
    priority: 'low',
    assignedTo: 'Ravi',
  } as const;

  it('is pending while writing, then succeeded', async () => {
    const gate = deferred<Task>();
    const { store } = setup({
      createTask: jest.fn().mockReturnValue(gate.promise),
    });

    const request = store.dispatch(createTask(input));
    expect(selectMutationState(store.getState())).toEqual({
      status: 'pending',
      error: null,
    });

    gate.resolve(makeTask());
    await request;
    expect(selectMutationState(store.getState())).toEqual({
      status: 'succeeded',
      error: null,
    });
  });

  it('passes the input to the repository and returns the created task', async () => {
    const created = makeTask({ id: 'created' });
    const { repo, store } = setup({
      createTask: jest.fn().mockResolvedValue(created),
    });

    const result = await store.dispatch(createTask(input));

    expect(repo.createTask).toHaveBeenCalledWith(input);
    expect(result.payload).toEqual(created);
  });

  it('re-reads the list (with the current filter) and the summary from the repository', async () => {
    const created = makeTask({ id: 'created' });
    const getTasks = jest.fn().mockResolvedValue([created]);
    const { repo, store } = setup({
      createTask: jest.fn().mockResolvedValue(created),
      getTasks,
    });
    store.dispatch(filterChanged({ priority: 'low' }));

    await store.dispatch(createTask(input));

    expect(repo.getTasks).toHaveBeenCalledWith({ priority: 'low' });
    expect(repo.getTaskSummary).toHaveBeenCalledTimes(1);
    expect(selectTasks(store.getState())).toEqual([created]);
  });

  it('fails with field errors for invalid input, without reloading or changing the list', async () => {
    const error = new TaskValidationError([
      { field: 'title', message: 'Title is required' },
    ]);
    const { repo, store } = setup({
      createTask: jest.fn().mockRejectedValue(error),
    });

    const result = await store.dispatch(createTask({ ...input, title: '' }));

    expect(result.type).toBe('tasks/create/rejected');
    expect(selectMutationState(store.getState())).toEqual({
      status: 'failed',
      error: {
        message: error.message,
        fieldErrors: [{ field: 'title', message: 'Title is required' }],
      },
    });
    expect(repo.getTasks).not.toHaveBeenCalled();
    expect(selectTasks(store.getState())).toEqual([]);
  });

  it('reports a storage failure as a plain message', async () => {
    const { store } = setup({
      createTask: jest.fn().mockRejectedValue(new Error('disk full')),
    });
    await store.dispatch(createTask(input));
    expect(selectMutationState(store.getState()).error).toEqual({
      message: 'disk full',
    });
  });

  it('a failed refresh does not turn a successful write into a failure', async () => {
    const { store } = setup({
      getTasks: jest.fn().mockRejectedValue(new Error('read failed')),
    });

    await store.dispatch(createTask(input));

    expect(selectMutationState(store.getState()).status).toBe('succeeded');
    expect(selectListState(store.getState())).toMatchObject({
      status: 'failed',
      error: 'read failed',
    });
  });

  it('a new write clears the previous error, and the error can be cleared explicitly', async () => {
    const createMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce(makeTask());
    const { store } = setup({ createTask: createMock });

    await store.dispatch(createTask(input));
    expect(selectMutationState(store.getState()).status).toBe('failed');
    store.dispatch(mutationErrorCleared());
    expect(selectMutationState(store.getState())).toEqual({
      status: 'idle',
      error: null,
    });

    await store.dispatch(createTask(input));
    expect(selectMutationState(store.getState()).status).toBe('succeeded');
  });
});

describe('updateTask', () => {
  it('sends id and changes, then refreshes from the repository', async () => {
    const updated = makeTask({ status: 'done' });
    const getTasks = jest.fn().mockResolvedValue([updated]);
    const { repo, store } = setup({
      updateTask: jest.fn().mockResolvedValue(updated),
      getTasks,
    });

    await store.dispatch(
      updateTask({ id: 'task-1', changes: { status: 'done' } }),
    );

    expect(repo.updateTask).toHaveBeenCalledWith('task-1', { status: 'done' });
    expect(selectTasks(store.getState())).toEqual([updated]);
    expect(repo.getTaskSummary).toHaveBeenCalled();
    expect(selectMutationState(store.getState()).status).toBe('succeeded');
  });

  it('fails for a missing or deleted task and leaves the list untouched', async () => {
    const existing = [makeTask()];
    const getTasks = jest.fn().mockResolvedValue(existing);
    const { repo, store } = setup({
      updateTask: jest
        .fn()
        .mockRejectedValue(new Error('Task not found: nope')),
      getTasks,
    });
    await store.dispatch(loadTasks());
    getTasks.mockClear();

    await store.dispatch(updateTask({ id: 'nope', changes: { title: 'x' } }));

    expect(selectMutationState(store.getState())).toEqual({
      status: 'failed',
      error: { message: 'Task not found: nope' },
    });
    expect(repo.getTasks).not.toHaveBeenCalled();
    expect(selectTasks(store.getState())).toEqual(existing);
  });
});

describe('deleteTask', () => {
  it('soft deletes through the repository and drops the task because the list is re-read', async () => {
    const getTasks = jest
      .fn()
      .mockResolvedValueOnce([makeTask({ id: 'a' }), makeTask({ id: 'b' })])
      .mockResolvedValueOnce([makeTask({ id: 'b' })]);
    const { repo, store } = setup({ getTasks });
    await store.dispatch(loadTasks());

    const result = await store.dispatch(deleteTask('a'));

    expect(repo.deleteTask).toHaveBeenCalledWith('a');
    expect(result.payload).toBe('a');
    expect(selectTasks(store.getState()).map(t => t.id)).toEqual(['b']);
    expect(repo.getTaskSummary).toHaveBeenCalled();
  });

  it('records the failure and does not reload', async () => {
    const { repo, store } = setup({
      deleteTask: jest.fn().mockRejectedValue(new Error('Task not found: x')),
    });

    await store.dispatch(deleteTask('x'));

    expect(selectMutationState(store.getState())).toEqual({
      status: 'failed',
      error: { message: 'Task not found: x' },
    });
    expect(repo.getTasks).not.toHaveBeenCalled();
  });
});

describe('store wiring', () => {
  it('thunks only reach storage through the injected repository', async () => {
    const { repo, store } = setup();
    await store.dispatch(loadTasks());
    await store.dispatch(loadSummary());
    expect(repo.getTasks).toHaveBeenCalledTimes(1);
    expect(repo.getTaskSummary).toHaveBeenCalledTimes(1);
  });
});
