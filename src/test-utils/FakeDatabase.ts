import type {
  SqlDatabase,
  SqlExecutor,
  SqlParam,
  SqlRow,
} from '../services/database/types';

export interface RecordedCall {
  sql: string;
  params: SqlParam[];
  inTransaction: boolean;
}

/**
 * Records every statement and answers with whatever `respond` returns.
 * It does not run SQL: tests check what the code asks the database to do,
 * and the real queries are exercised on a device/emulator.
 */
export class FakeDatabase implements SqlDatabase {
  readonly calls: RecordedCall[] = [];

  constructor(
    private readonly respond: (
      sql: string,
      params: SqlParam[],
    ) => SqlRow[] = () => [],
  ) {}

  private run(sql: string, params: SqlParam[] = [], inTransaction: boolean) {
    this.calls.push({ sql, params, inTransaction });
    return Promise.resolve({ rows: this.respond(sql, params) });
  }

  execute(sql: string, params?: SqlParam[]) {
    return this.run(sql, params, false);
  }

  async transaction(fn: (tx: SqlExecutor) => Promise<void>) {
    await fn({ execute: (sql, params) => this.run(sql, params, true) });
  }

  /** Statements whose SQL starts with the given prefix (ignoring leading space). */
  callsStartingWith(prefix: string) {
    return this.calls.filter(c => c.sql.trimStart().startsWith(prefix));
  }
}
