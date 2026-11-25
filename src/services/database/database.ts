import { open } from '@op-engineering/op-sqlite';
import { runMigrations } from './migrations';
import type { SqlDatabase, SqlExecutor, SqlRow } from './types';

const DATABASE_NAME = 'litmos-tasks.db';

let instance: Promise<SqlDatabase> | null = null;

/** Opens the app database once, applies migrations and returns the shared connection. */
export function openDatabase(): Promise<SqlDatabase> {
  if (!instance) {
    instance = initialize().catch(error => {
      instance = null; // let a later call retry
      throw error;
    });
  }
  return instance;
}

async function initialize(): Promise<SqlDatabase> {
  const raw = open({ name: DATABASE_NAME });

  // Our schema only has text and integer columns, so rows fit SqlRow.
  const toExecutor = (target: Pick<typeof raw, 'execute'>): SqlExecutor => ({
    execute: async (sql, params) => {
      const { rows } = await target.execute(sql, params);
      return { rows: rows as SqlRow[] };
    },
  });

  const db: SqlDatabase = {
    ...toExecutor(raw),
    transaction: fn => raw.transaction(tx => fn(toExecutor(tx))),
  };

  await db.execute('PRAGMA journal_mode = WAL');
  await runMigrations(db);
  return db;
}
