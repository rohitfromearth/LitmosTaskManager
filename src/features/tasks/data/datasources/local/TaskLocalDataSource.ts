import type { SqlDatabase } from '../../../../../services/database/types';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
} from '../../../domain/entities/Task';
import type {
  TaskFilter,
  TaskSummary,
} from '../../../domain/repositories/TaskRepository';
import { recordToTask, taskToParams } from '../../models/TaskRecord';
import {
  buildCountBy,
  buildSelectTasks,
  COUNT_ALL,
  INSERT_TASK,
  SELECT_BY_ID,
  UPDATE_TASK,
} from './taskQueries';

/** The only code that talks SQL for tasks. Applies no business rules. */
export class TaskLocalDataSource {
  constructor(private readonly db: SqlDatabase) {}

  /** Finds a task by id, including soft-deleted ones. */
  async findById(id: string): Promise<Task | null> {
    const { rows } = await this.db.execute(SELECT_BY_ID, [id]);
    return rows.length > 0 ? recordToTask(rows[0]) : null;
  }

  /** Non-deleted tasks matching the filter. */
  async findAll(filter?: TaskFilter): Promise<Task[]> {
    const { sql, params } = buildSelectTasks(filter);
    const { rows } = await this.db.execute(sql, params);
    return rows.map(recordToTask);
  }

  async insert(task: Task): Promise<void> {
    await this.db.execute(INSERT_TASK, taskToParams(task));
  }

  /** Writes all fields of the task, including isDeleted. */
  async update(task: Task): Promise<void> {
    await this.db.execute(UPDATE_TASK, [...taskToParams(task), task.id]);
  }

  /** Counts of non-deleted tasks; values with no tasks are reported as 0. */
  async getSummary(): Promise<TaskSummary> {
    const [byStatusRows, byPriorityRows] = await Promise.all([
      this.db.execute(buildCountBy('status')),
      this.db.execute(buildCountBy('priority')),
    ]);

    const byStatus = Object.fromEntries(
      TASK_STATUSES.map(value => [value, 0]),
    ) as TaskSummary['byStatus'];
    const byPriority = Object.fromEntries(
      TASK_PRIORITIES.map(value => [value, 0]),
    ) as TaskSummary['byPriority'];

    for (const row of byStatusRows.rows) {
      byStatus[row.value as keyof typeof byStatus] = Number(row.count);
    }
    for (const row of byPriorityRows.rows) {
      byPriority[row.value as keyof typeof byPriority] = Number(row.count);
    }
    return { byStatus, byPriority };
  }

  /**
   * Inserts the tasks only if the table has never held a row. Soft-deleted rows
   * count, so deleting everything doesn't bring the samples back.
   * The emptiness check and all inserts run in one transaction: either every
   * sample is stored or none is, and concurrent calls can't seed twice.
   * Returns true if it seeded.
   */
  async seedIfEmpty(tasks: Task[]): Promise<boolean> {
    let seeded = false;
    await this.db.transaction(async tx => {
      const { rows } = await tx.execute(COUNT_ALL);
      if (Number(rows[0]?.count ?? 0) > 0) {
        return;
      }
      for (const task of tasks) {
        await tx.execute(INSERT_TASK, taskToParams(task));
      }
      seeded = true;
    });
    return seeded;
  }
}
