import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '../entities/Task';
import type { NewTask, TaskChanges } from '../repositories/TaskRepository';

// Project decisions, not assignment requirements; safe to change.
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;

export interface FieldError {
  field: keyof NewTask;
  message: string;
}

export class TaskValidationError extends Error {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super(errors.map(e => `${e.field}: ${e.message}`).join('; '));
    this.name = 'TaskValidationError';
    this.errors = errors;
  }
}

function validateFields(input: TaskChanges): FieldError[] {
  const errors: FieldError[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.push({
        field: 'title',
        message: `Title must be at most ${TITLE_MAX_LENGTH} characters`,
      });
    }
  }

  if (
    input.description !== undefined &&
    input.description.length > DESCRIPTION_MAX_LENGTH
  ) {
    errors.push({
      field: 'description',
      message: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
    });
  }

  if (
    input.status !== undefined &&
    !TASK_STATUSES.includes(input.status as TaskStatus)
  ) {
    errors.push({ field: 'status', message: 'Invalid status' });
  }

  if (
    input.priority !== undefined &&
    !TASK_PRIORITIES.includes(input.priority as TaskPriority)
  ) {
    errors.push({ field: 'priority', message: 'Invalid priority' });
  }

  if (input.assignedTo !== undefined && input.assignedTo.trim().length === 0) {
    errors.push({ field: 'assignedTo', message: 'Assigned to is required' });
  }

  return errors;
}

/**
 * Title, status, priority and assignedTo must be present (guards untyped
 * callers, e.g. form input). Description may be empty.
 */
export function validateNewTask(input: NewTask): FieldError[] {
  const errors = validateFields(input);
  for (const field of ['title', 'status', 'priority', 'assignedTo'] as const) {
    if (input[field] === undefined) {
      errors.push({ field, message: `${field} is required` });
    }
  }
  return errors;
}

/** Only fields that are present are checked; undefined means "unchanged". */
export function validateTaskChanges(changes: TaskChanges): FieldError[] {
  return validateFields(changes);
}
