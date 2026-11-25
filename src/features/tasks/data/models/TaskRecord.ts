import type {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/Task';
import type { SqlParam, SqlRow } from '../../../../services/database/types';

/** A row of the `tasks` table. */
export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string;
  created_date: string;
  modified_date: string;
  is_deleted: 0 | 1;
}

export function recordToTask(row: SqlRow): Task {
  const record = row as unknown as TaskRecord;
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    assignedTo: record.assigned_to,
    createdDate: record.created_date,
    modifiedDate: record.modified_date,
    isDeleted: record.is_deleted === 1,
  };
}

/** Column values in the order used by the INSERT/UPDATE statements. */
export function taskToParams(task: Task): SqlParam[] {
  return [
    task.id,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.assignedTo,
    task.createdDate,
    task.modifiedDate,
    task.isDeleted ? 1 : 0,
  ];
}
