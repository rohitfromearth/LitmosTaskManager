import type { AuthRepository } from '../../features/auth';
import {
  loadSummary,
  loadTasks,
  type TaskRepository,
} from '../../features/tasks';
import type { SqlDatabase } from '../../services/database/types';
import { createAppStore, type AppStore } from '../store/createAppStore';

/**
 * The pieces startup needs, passed in rather than imported so this module (and
 * its tests) never loads the native SQLite module. Root.tsx supplies the real ones.
 */
export interface InitializeAppDeps {
  /** Opens the database and applies migrations. */
  openDatabase: () => Promise<SqlDatabase>;
  /** Builds the repository on that database and seeds sample data on first run. */
  createTaskRepository: (db: SqlDatabase) => Promise<TaskRepository>;
  /** The authentication backend (the mock for now). Needs no startup work. */
  authRepository: AuthRepository;
}

/**
 * Startup sequence: SQLite first, then the repository, then the Redux store,
 * then the initial tasks and summary.
 *
 * Rejects if the database, migrations, seeding or repository setup fail; the
 * caller shows that as a startup error. A failure of the initial *load* does not
 * reject: the app still starts and the error is in the store's `list` and
 * `summaryLoad` state, where a screen can show it and retry.
 */
export async function initializeApp({
  openDatabase,
  createTaskRepository,
  authRepository,
}: InitializeAppDeps): Promise<AppStore> {
  const db = await openDatabase();
  const repository = await createTaskRepository(db);
  const store = createAppStore(repository, authRepository);

  // These thunks resolve even when the read fails, so Promise.all can't reject.
  await Promise.all([
    store.dispatch(loadTasks()),
    store.dispatch(loadSummary()),
  ]);

  return store;
}
