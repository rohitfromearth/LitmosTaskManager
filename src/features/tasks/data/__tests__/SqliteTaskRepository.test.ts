import { FakeDatabase } from '../../../../test-utils/FakeDatabase';
import type { SqlRow } from '../../../../services/database/types';
import type { Task } from '../../domain/entities/Task';
import { TaskValidationError } from '../../domain/rules/taskValidation';
import { createTaskRepository } from '../createTaskRepository';
import { TaskLocalDataSource } from '../datasources/local/TaskLocalDataSource';
import { recordToTask } from '../models/TaskRecord';
import { SqliteTaskRepository } from '../repositories/SqliteTaskRepository';

const T0 = '2026-11-25T00:00:00.000Z';
const T1 = '2026-11-25T01:00:00.000Z';

const stored: Task = {
  id: 'task-1',
  title: 'Write report',
  description: 'Quarterly',
  status: 'todo',
  priority: 'high',
  assignedTo: 'Asha',
  createdDate: T0,
  modifiedDate: T0,
  isDeleted: false,
};

const toRow = (task: Task): SqlRow => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assigned_to: task.assignedTo,
  created_date: task.createdDate,
  modified_date: task.modifiedDate,
  is_deleted: task.isDeleted ? 1 : 0,
});

/** A fake database holding the given tasks, found by `SELECT * ... WHERE id = ?`. */
function setup(tasks: Task[] = []) {
  const db = new FakeDatabase((sql, params) => {
    if (sql.startsWith('SELECT * FROM tasks WHERE id')) {
      return tasks.filter(t => t.id === params[0]).map(t => toRow(t));
    }
    return [];
  });
  const repo = new SqliteTaskRepository(new TaskLocalDataSource(db), {
    generateId: () => 'new-id',
    now: () => T1,
  });
  return { db, repo };
}

const newTask = {
  title: ' New task ',
  description: '',
  status: 'todo' as const,
  priority: 'low' as const,
  assignedTo: 'Ravi',
};

describe('record mapping', () => {
  it('converts is_deleted and column names to the domain shape', () => {
    expect(recordToTask(toRow({ ...stored, isDeleted: true }))).toEqual({
      ...stored,
      isDeleted: true,
    });
  });
});

describe('createTask', () => {
  it('validates, builds the task and inserts it', async () => {
    const { db, repo } = setup();
    const task = await repo.createTask(newTask);

    expect(task).toMatchObject({
      id: 'new-id',
      title: 'New task',
      createdDate: T1,
      modifiedDate: T1,
      isDeleted: false,
    });
    const [insert] = db.callsStartingWith('INSERT INTO tasks');
    expect(insert.params).toEqual([
      'new-id',
      'New task',
      '',
      'todo',
      'low',
      'Ravi',
      T1,
      T1,
      0,
    ]);
  });

  it('rejects invalid input without touching the database', async () => {
    const { db, repo } = setup();
    await expect(
      repo.createTask({ ...newTask, title: ' ' }),
    ).rejects.toBeInstanceOf(TaskValidationError);
    expect(db.calls).toEqual([]);
  });
});

describe('updateTask', () => {
  it('applies the changes, bumps modifiedDate and writes the row', async () => {
    const { db, repo } = setup([stored]);
    const updated = await repo.updateTask('task-1', { status: 'done' });

    expect(updated).toEqual({ ...stored, status: 'done', modifiedDate: T1 });
    const [update] = db.callsStartingWith('UPDATE tasks');
    expect(update.params.at(-1)).toBe('task-1');
    expect(update.params).toContain('done');
  });

  it('rejects invalid changes, a missing task and a deleted task', async () => {
    const { repo } = setup([
      stored,
      { ...stored, id: 'gone', isDeleted: true },
    ]);
    await expect(
      repo.updateTask('task-1', { title: '' }),
    ).rejects.toBeInstanceOf(TaskValidationError);
    await expect(repo.updateTask('missing', { title: 'x' })).rejects.toThrow(
      'not found',
    );
    await expect(repo.updateTask('gone', { title: 'x' })).rejects.toThrow(
      'deleted',
    );
  });
});

describe('deleteTask', () => {
  it('soft deletes by updating the row, never issuing DELETE', async () => {
    const { db, repo } = setup([stored]);
    await repo.deleteTask('task-1');

    expect(db.callsStartingWith('DELETE')).toEqual([]);
    const [update] = db.callsStartingWith('UPDATE tasks');
    // taskToParams order: ..., modified_date, is_deleted, then the id for WHERE
    expect(update.params.slice(-3)).toEqual([T1, 1, 'task-1']);
  });

  it('is a no-op for an already deleted task and rejects a missing one', async () => {
    const { db, repo } = setup([{ ...stored, isDeleted: true }]);
    await repo.deleteTask('task-1');
    expect(db.callsStartingWith('UPDATE')).toEqual([]);
    await expect(repo.deleteTask('missing')).rejects.toThrow('not found');
  });
});

describe('getTaskById', () => {
  it('returns the task, or null for a missing or soft-deleted one', async () => {
    const { repo } = setup([
      stored,
      { ...stored, id: 'gone', isDeleted: true },
    ]);
    expect(await repo.getTaskById('task-1')).toEqual(stored);
    expect(await repo.getTaskById('gone')).toBeNull();
    expect(await repo.getTaskById('missing')).toBeNull();
  });
});

describe('getTasks', () => {
  it('queries non-deleted tasks with the filter and maps the rows', async () => {
    const db = new FakeDatabase(sql =>
      sql.includes('FROM tasks WHERE is_deleted = 0') ? [toRow(stored)] : [],
    );
    const repo = new SqliteTaskRepository(new TaskLocalDataSource(db));

    const tasks = await repo.getTasks({ status: 'todo', keyword: 'report' });

    expect(tasks).toEqual([stored]);
    expect(db.calls[0].params).toEqual(['todo', '%report%', '%report%']);
  });
});

describe('getTaskSummary', () => {
  it('maps grouped counts and reports 0 for values with no tasks', async () => {
    const db = new FakeDatabase(sql => {
      if (sql.includes('GROUP BY status'))
        return [
          { value: 'todo', count: 3 },
          { value: 'done', count: 2 },
        ];
      if (sql.includes('GROUP BY priority'))
        return [{ value: 'critical', count: 1 }];
      return [];
    });
    const repo = new SqliteTaskRepository(new TaskLocalDataSource(db));

    expect(await repo.getTaskSummary()).toEqual({
      byStatus: { todo: 3, in_progress: 0, done: 2 },
      byPriority: { low: 0, medium: 0, high: 0, critical: 1 },
    });
  });

  it('counts only non-deleted tasks', async () => {
    const db = new FakeDatabase();
    await new SqliteTaskRepository(
      new TaskLocalDataSource(db),
    ).getTaskSummary();
    expect(db.calls.every(c => c.sql.includes('is_deleted = 0'))).toBe(true);
  });
});

describe('createTaskRepository seeding', () => {
  const countRows = (count: number) => (sql: string) =>
    sql.startsWith('SELECT COUNT(*)') ? [{ count }] : [];

  it('seeds the sample tasks in one transaction when the table is empty', async () => {
    const db = new FakeDatabase(countRows(0));
    await createTaskRepository(db, { now: () => T1 });

    const inserts = db.callsStartingWith('INSERT INTO tasks');
    expect(inserts.length).toBeGreaterThanOrEqual(10);
    expect(inserts.every(c => c.inTransaction)).toBe(true);
  });

  it('runs the emptiness check inside the same transaction as the inserts', async () => {
    const db = new FakeDatabase(countRows(0));
    await createTaskRepository(db, { now: () => T1 });

    const [check] = db.callsStartingWith('SELECT COUNT(*)');
    expect(check.inTransaction).toBe(true);
    expect(db.calls.every(c => c.inTransaction)).toBe(true);
  });

  it('propagates a seeding failure so the transaction can roll back', async () => {
    const db = new FakeDatabase(sql => {
      if (sql.startsWith('SELECT COUNT(*)')) return [{ count: 0 }];
      if (sql.startsWith('INSERT INTO tasks')) throw new Error('disk full');
      return [];
    });
    await expect(createTaskRepository(db, { now: () => T1 })).rejects.toThrow(
      'disk full',
    );
  });

  it('does not seed when the table already has rows (including deleted ones)', async () => {
    const db = new FakeDatabase(countRows(5));
    await createTaskRepository(db, { now: () => T1 });
    expect(db.callsStartingWith('INSERT INTO tasks')).toEqual([]);
  });
});
