/**
 * The small slice of a SQLite client the app depends on. op-sqlite satisfies it
 * (see database.ts); tests use a fake, so nothing else imports op-sqlite.
 */
export type SqlParam = string | number | null;
export type SqlRow = Record<string, string | number | null>;

export interface SqlExecutor {
  execute(sql: string, params?: SqlParam[]): Promise<{ rows: SqlRow[] }>;
}

export interface SqlDatabase extends SqlExecutor {
  /** Runs fn atomically: commits if it resolves, rolls back if it throws. */
  transaction(fn: (tx: SqlExecutor) => Promise<void>): Promise<void>;
}
