import type { SqlDatabase } from './types';

/**
 * Ordered schema migrations. Index + 1 is the schema version, stored in
 * SQLite's PRAGMA user_version. Never edit a released migration; append a new one.
 */
export const MIGRATIONS: readonly string[][] = [
  // v1: tasks table
  [
    `CREATE TABLE tasks (
      id            TEXT PRIMARY KEY NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL CHECK (status IN ('todo','in_progress','done')),
      priority      TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
      assigned_to   TEXT NOT NULL,
      created_date  TEXT NOT NULL,
      modified_date TEXT NOT NULL,
      is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1))
    )`,
    'CREATE INDEX idx_tasks_active ON tasks (is_deleted, modified_date DESC)',
    'CREATE INDEX idx_tasks_status ON tasks (is_deleted, status)',
    'CREATE INDEX idx_tasks_priority ON tasks (is_deleted, priority)',
  ],
];

async function getVersion(db: SqlDatabase): Promise<number> {
  const { rows } = await db.execute('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/**
 * Applies pending migrations, each in its own transaction together with its
 * version bump, so a failure leaves the database at the last good version.
 */
export async function runMigrations(
  db: SqlDatabase,
  migrations: readonly string[][] = MIGRATIONS,
): Promise<void> {
  const current = await getVersion(db);
  if (current > migrations.length) {
    throw new Error(
      `Database schema v${current} is newer than this app supports (v${migrations.length})`,
    );
  }

  for (let version = current + 1; version <= migrations.length; version++) {
    await db.transaction(async tx => {
      for (const statement of migrations[version - 1]) {
        await tx.execute(statement);
      }
      // PRAGMA can't take bound parameters; version is our own integer.
      await tx.execute(`PRAGMA user_version = ${version}`);
    });
  }
}
