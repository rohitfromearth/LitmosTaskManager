import {
  buildCountBy,
  buildSelectTasks,
} from '../datasources/local/taskQueries';

describe('buildSelectTasks', () => {
  it('always excludes soft-deleted tasks, even with no filter', () => {
    const { sql, params } = buildSelectTasks();
    expect(sql).toContain('is_deleted = 0');
    expect(params).toEqual([]);
  });

  it('keeps the soft-delete condition when filters are applied', () => {
    const { sql } = buildSelectTasks({
      status: 'done',
      priority: 'low',
      keyword: 'x',
    });
    expect(sql).toContain('is_deleted = 0');
  });

  it('filters by status', () => {
    const { sql, params } = buildSelectTasks({ status: 'in_progress' });
    expect(sql).toContain('status = ?');
    expect(params).toEqual(['in_progress']);
  });

  it('filters by priority', () => {
    const { sql, params } = buildSelectTasks({ priority: 'critical' });
    expect(sql).toContain('priority = ?');
    expect(params).toEqual(['critical']);
  });

  it('searches title and description for the keyword', () => {
    const { sql, params } = buildSelectTasks({ keyword: 'login' });
    expect(sql).toContain('title LIKE ?');
    expect(sql).toContain('description LIKE ?');
    expect(params).toEqual(['%login%', '%login%']);
  });

  it('trims the keyword and ignores a blank one', () => {
    expect(buildSelectTasks({ keyword: '  login ' }).params).toEqual([
      '%login%',
      '%login%',
    ]);
    const blank = buildSelectTasks({ keyword: '   ' });
    expect(blank.sql).not.toContain('LIKE');
    expect(blank.params).toEqual([]);
  });

  it('escapes LIKE wildcards so they match literally', () => {
    expect(buildSelectTasks({ keyword: '50%_off' }).params[0]).toBe(
      '%50\\%\\_off%',
    );
  });

  it('combines all filters with AND, in a stable param order', () => {
    const { sql, params } = buildSelectTasks({
      status: 'todo',
      priority: 'high',
      keyword: 'api',
    });
    expect(sql).toMatch(
      /is_deleted = 0 AND status = \? AND priority = \? AND \(/,
    );
    expect(params).toEqual(['todo', 'high', '%api%', '%api%']);
  });

  it('puts the most recently modified first', () => {
    expect(buildSelectTasks().sql).toContain('ORDER BY modified_date DESC');
  });
});

describe('buildCountBy', () => {
  it('groups only non-deleted tasks', () => {
    for (const column of ['status', 'priority'] as const) {
      const sql = buildCountBy(column);
      expect(sql).toContain('is_deleted = 0');
      expect(sql).toContain(`GROUP BY ${column}`);
    }
  });
});
