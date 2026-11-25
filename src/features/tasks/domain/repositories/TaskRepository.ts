import type { Task, TaskPriority, TaskStatus } from '../entities/Task';

/** Fields a caller supplies when creating a task. */
export type NewTask = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'assignedTo'
>;

/** Any subset of the caller-editable fields. */
export type TaskChanges = Partial<NewTask>;

/** All provided criteria must match; omitted ones are ignored. */
export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  /** Case-insensitive match against title and description. Blank is ignored. */
  keyword?: string;
}

/** Counts of tasks that are not soft-deleted. Every key is always present. */
export interface TaskSummary {
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
}

/**
 * Implementations validate input with the rules in `domain/rules` and manage
 * `id`, `createdDate`, `modifiedDate` and `isDeleted` themselves.
 */
export interface TaskRepository {
  /** Returns matching tasks that are not soft-deleted, most recently modified first. */
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  /** Counts of non-deleted tasks grouped by status and by priority. */
  getTaskSummary(): Promise<TaskSummary>;
  /** Returns the task, or null if it doesn't exist or is soft-deleted. */
  getTaskById(id: string): Promise<Task | null>;
  /** Rejects with a TaskValidationError if the input is invalid. */
  createTask(task: NewTask): Promise<Task>;
  /**
   * Rejects with a TaskValidationError if the changes are invalid.
   * Rejects if the task doesn't exist or is deleted.
   */
  updateTask(id: string, changes: TaskChanges): Promise<Task>;
  /**
   * Soft delete: sets isDeleted and modifiedDate; the record is never removed.
   * Rejects if the task doesn't exist; deleting twice is a no-op.
   */
  deleteTask(id: string): Promise<void>;
}
