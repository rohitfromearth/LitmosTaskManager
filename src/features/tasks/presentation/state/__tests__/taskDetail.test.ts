import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  createMockRepository,
  deferred,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import type { Task } from '../../../domain/entities/Task';
import { selectTaskDetail } from '../tasksSlice';
import { loadTask, updateTask } from '../tasksThunks';

function setup(overrides: Parameters<typeof createMockRepository>[0] = {}) {
  const repo = createMockRepository(overrides);
  const store = createAppStore(repo);
  return { repo, store };
}

const detail = (store: ReturnType<typeof setup>['store']) =>
  selectTaskDetail(store.getState());

describe('loadTask', () => {
  it('starts idle with no task', () => {
    const { store } = setup();
    expect(detail(store)).toMatchObject({
      taskId: null,
      task: null,
      load: { status: 'idle' },
    });
  });

  it('goes loading then succeeded with the task from the repository', async () => {
    const gate = deferred<Task | null>();
    const { store, repo } = setup({
      getTaskById: jest.fn().mockReturnValue(gate.promise),
    });

    const request = store.dispatch(loadTask('a'));
    expect(detail(store)).toMatchObject({
      taskId: 'a',
      task: null,
      load: { status: 'loading' },
    });

    gate.resolve(makeTask({ id: 'a' }));
    await request;

    expect(repo.getTaskById).toHaveBeenCalledWith('a');
    expect(detail(store)).toMatchObject({
      taskId: 'a',
      task: { id: 'a' },
      load: { status: 'succeeded' },
    });
  });

  it('succeeds with a null task when it does not exist', async () => {
    const { store } = setup({
      getTaskById: jest.fn().mockResolvedValue(null),
    });
    await store.dispatch(loadTask('gone'));
    expect(detail(store)).toMatchObject({
      taskId: 'gone',
      task: null,
      load: { status: 'succeeded' },
    });
  });

  it('records the error message when the read fails', async () => {
    const { store } = setup({
      getTaskById: jest.fn().mockRejectedValue(new Error('db locked')),
    });
    await store.dispatch(loadTask('a'));
    expect(detail(store).load).toMatchObject({
      status: 'failed',
      error: 'db locked',
    });
  });

  it('keeps the shown task while the same task reloads or fails to reload', async () => {
    const getTaskById = jest
      .fn()
      .mockResolvedValueOnce(makeTask({ id: 'a', title: 'First' }))
      .mockRejectedValueOnce(new Error('db locked'));
    const { store } = setup({ getTaskById });

    await store.dispatch(loadTask('a'));
    await store.dispatch(loadTask('a'));

    expect(detail(store).task?.title).toBe('First');
    expect(detail(store).load.status).toBe('failed');
  });

  it('drops the previous task when a different one starts loading', async () => {
    const gate = deferred<Task | null>();
    const getTaskById = jest
      .fn()
      .mockResolvedValueOnce(makeTask({ id: 'a' }))
      .mockReturnValueOnce(gate.promise);
    const { store } = setup({ getTaskById });

    await store.dispatch(loadTask('a'));
    const request = store.dispatch(loadTask('b'));

    expect(detail(store)).toMatchObject({ taskId: 'b', task: null });
    gate.resolve(makeTask({ id: 'b' }));
    await request;
  });

  it('ignores a stale response that arrives after a newer request', async () => {
    const slow = deferred<Task | null>();
    const getTaskById = jest
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(makeTask({ id: 'a', title: 'Newer' }));
    const { store } = setup({ getTaskById });

    const first = store.dispatch(loadTask('a'));
    await store.dispatch(loadTask('a'));
    slow.resolve(makeTask({ id: 'a', title: 'Older' }));
    await first;

    expect(detail(store).task?.title).toBe('Newer');
  });
});

describe('updateTask and the detail', () => {
  it('reloads the detail after a successful update', async () => {
    const stored = makeTask({ id: 'a', title: 'Old' });
    let current = stored;
    const { store, repo } = setup({
      getTaskById: jest.fn(async (_id: string) => current),
      updateTask: jest.fn(async (_id: string, changes) => {
        current = { ...current, ...changes };
        return current;
      }),
    });
    await store.dispatch(loadTask('a'));

    await store.dispatch(updateTask({ id: 'a', changes: { title: 'New' } }));

    expect(repo.updateTask).toHaveBeenCalledWith('a', { title: 'New' });
    expect(detail(store).task?.title).toBe('New');
  });

  it('leaves the detail alone when the update fails', async () => {
    const { store } = setup({
      getTaskById: jest.fn().mockResolvedValue(makeTask({ id: 'a' })),
      updateTask: jest.fn().mockRejectedValue(new Error('disk full')),
    });
    await store.dispatch(loadTask('a'));

    await store.dispatch(updateTask({ id: 'a', changes: { title: 'New' } }));

    expect(detail(store).task?.title).toBe('Write report');
    expect(store.getState().tasks.mutation.status).toBe('failed');
  });
});
