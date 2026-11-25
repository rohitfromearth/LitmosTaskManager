import type { SqlDatabase } from '../../../services/database/types';
import type { TaskRepository } from '../domain/repositories/TaskRepository';
import { TaskLocalDataSource } from './datasources/local/TaskLocalDataSource';
import {
  SqliteTaskRepository,
  type RepositoryOptions,
} from './repositories/SqliteTaskRepository';
import { buildSampleTasks } from './seed/sampleTasks';

/**
 * Builds the SQLite-backed repository on an already-migrated database and
 * seeds the sample tasks on first run.
 */
export async function createTaskRepository(
  db: SqlDatabase,
  options: RepositoryOptions = {},
): Promise<TaskRepository> {
  const local = new TaskLocalDataSource(db);
  const now = options.now ?? (() => new Date().toISOString());
  await local.seedIfEmpty(buildSampleTasks(now()));
  return new SqliteTaskRepository(local, { ...options, now });
}
