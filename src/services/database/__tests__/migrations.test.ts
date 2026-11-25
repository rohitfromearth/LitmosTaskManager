import { FakeDatabase } from '../../../test-utils/FakeDatabase';
import { MIGRATIONS, runMigrations } from '../migrations';

const dbAtVersion = (version: number) =>
  new FakeDatabase(sql =>
    sql === 'PRAGMA user_version' ? [{ user_version: version }] : [],
  );

const versionWrites = (db: FakeDatabase) =>
  db.callsStartingWith('PRAGMA user_version =').map(c => c.sql);

describe('runMigrations', () => {
  it('applies every migration to a new database and records the version', async () => {
    const db = dbAtVersion(0);
    await runMigrations(db);

    const statements = db.calls.filter(c => c.inTransaction).map(c => c.sql);
    expect(statements[0]).toContain('CREATE TABLE tasks');
    expect(versionWrites(db)).toEqual([
      `PRAGMA user_version = ${MIGRATIONS.length}`,
    ]);
  });

  it('runs each migration and its version bump inside a transaction', async () => {
    const db = dbAtVersion(0);
    await runMigrations(db);
    expect(
      db.callsStartingWith('PRAGMA user_version =').every(c => c.inTransaction),
    ).toBe(true);
  });

  it('does nothing when the database is already up to date', async () => {
    const db = dbAtVersion(MIGRATIONS.length);
    await runMigrations(db);
    expect(db.calls.filter(c => c.inTransaction)).toEqual([]);
  });

  it('applies only the migrations after the current version', async () => {
    const db = dbAtVersion(1);
    await runMigrations(db, [
      ['CREATE TABLE a (x)'],
      ['ALTER TABLE a ADD y'],
      ['ALTER TABLE a ADD z'],
    ]);

    const statements = db.calls.filter(c => c.inTransaction).map(c => c.sql);
    expect(statements).toEqual([
      'ALTER TABLE a ADD y',
      'PRAGMA user_version = 2',
      'ALTER TABLE a ADD z',
      'PRAGMA user_version = 3',
    ]);
  });

  it('refuses a database newer than the app supports', async () => {
    await expect(
      runMigrations(dbAtVersion(MIGRATIONS.length + 1)),
    ).rejects.toThrow('newer');
  });

  it('does not record the version when a migration fails', async () => {
    const db = new FakeDatabase(sql => {
      if (sql === 'PRAGMA user_version') return [{ user_version: 0 }];
      if (sql === 'BAD SQL') throw new Error('syntax error');
      return [];
    });
    await expect(runMigrations(db, [['BAD SQL']])).rejects.toThrow(
      'syntax error',
    );
    expect(versionWrites(db)).toEqual([]);
  });
});

describe('schema', () => {
  const sql = MIGRATIONS[0].join('\n');

  it('stores every domain field', () => {
    for (const column of [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'assigned_to',
      'created_date',
      'modified_date',
      'is_deleted',
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${column}\\b`));
    }
  });

  it('constrains status and priority to the internal values', () => {
    expect(sql).toContain("status IN ('todo','in_progress','done')");
    expect(sql).toContain("priority IN ('low','medium','high','critical')");
  });
});
