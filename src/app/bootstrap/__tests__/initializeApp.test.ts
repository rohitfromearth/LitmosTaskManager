import { FakeDatabase } from '../../../test-utils/FakeDatabase';
import {
  createMockRepository,
  emptySummary,
  makeTask,
} from '../../../test-utils/mockTaskRepository';
import { MockAuthRepository, signIn } from '../../../features/auth';
import { initializeApp } from '../initializeApp';

function setup(
  overrides: {
    openDatabase?: jest.Mock;
    createTaskRepository?: jest.Mock;
    repository?: ReturnType<typeof createMockRepository>;
  } = {},
) {
  const order: string[] = [];
  const repository = overrides.repository ?? createMockRepository();
  const db = new FakeDatabase();
  const openDatabase =
    overrides.openDatabase ??
    jest.fn(async () => {
      order.push('openDatabase');
      return db;
    });
  const createTaskRepository =
    overrides.createTaskRepository ??
    jest.fn(async () => {
      order.push('createTaskRepository');
      return repository;
    });
  const authRepository = new MockAuthRepository({ latencyMs: 0 });
  return {
    order,
    db,
    repository,
    openDatabase,
    createTaskRepository,
    authRepository,
  };
}

describe('initializeApp', () => {
  it('opens the database before creating the repository, which gets that database', async () => {
    const { order, db, openDatabase, createTaskRepository, authRepository } =
      setup();

    await initializeApp({ openDatabase, createTaskRepository, authRepository });

    expect(order).toEqual(['openDatabase', 'createTaskRepository']);
    expect(createTaskRepository).toHaveBeenCalledWith(db);
  });

  it('returns a store backed by the repository with tasks and summary already loaded', async () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    const summary = {
      ...emptySummary,
      byStatus: { todo: 2, in_progress: 0, done: 0 },
    };
    const repository = createMockRepository({
      getTasks: jest.fn().mockResolvedValue(tasks),
      getTaskSummary: jest.fn().mockResolvedValue(summary),
    });
    const { openDatabase, createTaskRepository, authRepository } = setup({
      repository,
    });

    const store = await initializeApp({
      openDatabase,
      createTaskRepository,
      authRepository,
    });

    const { tasks: state } = store.getState();
    expect(state.items).toEqual(tasks);
    expect(state.summary).toEqual(summary);
    expect(state.list.status).toBe('succeeded');
    expect(state.summaryLoad.status).toBe('succeeded');
    expect(repository.getTasks).toHaveBeenCalledWith({});
  });

  it('rejects, without creating a repository, when the database cannot be opened', async () => {
    const { createTaskRepository, authRepository } = setup();
    const openDatabase = jest
      .fn()
      .mockRejectedValue(new Error('migration failed'));

    await expect(
      initializeApp({ openDatabase, createTaskRepository, authRepository }),
    ).rejects.toThrow('migration failed');
    expect(createTaskRepository).not.toHaveBeenCalled();
  });

  it('rejects when the repository cannot be created (e.g. seeding fails)', async () => {
    const { openDatabase, authRepository } = setup();
    const createTaskRepository = jest
      .fn()
      .mockRejectedValue(new Error('seed failed'));

    await expect(
      initializeApp({ openDatabase, createTaskRepository, authRepository }),
    ).rejects.toThrow('seed failed');
  });

  it('still starts when the initial load fails, leaving the errors in the store', async () => {
    const repository = createMockRepository({
      getTasks: jest.fn().mockRejectedValue(new Error('read failed')),
      getTaskSummary: jest.fn().mockRejectedValue(new Error('count failed')),
    });
    const { openDatabase, createTaskRepository, authRepository } = setup({
      repository,
    });

    const store = await initializeApp({
      openDatabase,
      createTaskRepository,
      authRepository,
    });

    const { tasks: state } = store.getState();
    expect(state.list).toMatchObject({
      status: 'failed',
      error: 'read failed',
    });
    expect(state.summaryLoad).toMatchObject({
      status: 'failed',
      error: 'count failed',
    });
  });

  it('passes the auth repository to the store, starting signed out', async () => {
    const { openDatabase, createTaskRepository, authRepository } = setup();

    const store = await initializeApp({
      openDatabase,
      createTaskRepository,
      authRepository,
    });
    expect(store.getState().auth.session).toBeNull();

    await store.dispatch(
      signIn({ email: 'demo@litmos.com', password: 'Litmos@123' }),
    );
    expect(store.getState().auth.session?.user.email).toBe('demo@litmos.com');
  });
});
