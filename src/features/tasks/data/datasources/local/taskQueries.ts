import type { SqlParam } from '../../../../../services/database/types';
import type { TaskFilter } from '../../../domain/repositories/TaskRepository';

export interface Query {
  sql: string;
  params: SqlParam[];
}

export const INSERT_TASK = `INSERT INTO tasks
  (id, title, description, status, priority, assigned_to, created_date, modified_date, is_deleted)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Params: the nine task columns (as in taskToParams), then the id again for WHERE. */
export const UPDATE_TASK = `UPDATE tasks SET
  id = ?, title = ?, description = ?, status = ?, priority = ?, assigned_to = ?,
  created_date = ?, modified_date = ?, is_deleted = ?
  WHERE id = ?`;

export const SELECT_BY_ID = 'SELECT * FROM tasks WHERE id = ?';
export const COUNT_ALL = 'SELECT COUNT(*) AS count FROM tasks';

/** Escapes LIKE wildcards so a keyword like "50%" matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, match => `\\${match}`);
}

/** Non-deleted tasks matching every provided filter, most recently modified first. */
export function buildSelectTasks(filter: TaskFilter = {}): Query {
  const conditions = ['is_deleted = 0'];
  const params: SqlParam[] = [];

  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.priority) {
    conditions.push('priority = ?');
    params.push(filter.priority);
  }
  const keyword = filter.keyword?.trim();
  if (keyword) {
    const pattern = `%${escapeLike(keyword)}%`;
    conditions.push(
      "(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')",
    );
    params.push(pattern, pattern);
  }

  return {
    sql: `SELECT * FROM tasks WHERE ${conditions.join(
      ' AND ',
    )} ORDER BY modified_date DESC, id`,
    params,
  };
}

/** Counts of non-deleted tasks per value of the given column. */
export function buildCountBy(column: 'status' | 'priority'): string {
  return `SELECT ${column} AS value, COUNT(*) AS count FROM tasks WHERE is_deleted = 0 GROUP BY ${column}`;
}
