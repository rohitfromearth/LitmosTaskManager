/** ISO 8601 timestamp in UTC, e.g. "2026-11-25T01:45:00.000Z". */
export type IsoDateString = string;

/** Internal values; display text lives in presentation/taskLabels.ts. */
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Required, non-blank string. */
  assignedTo: string;
  createdDate: IsoDateString;
  modifiedDate: IsoDateString;
  /** Soft-delete flag; deleted tasks stay stored but are hidden from listings and counts. */
  isDeleted: boolean;
}
