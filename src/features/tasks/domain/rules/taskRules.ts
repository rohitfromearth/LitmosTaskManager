import type { IsoDateString, Task } from '../entities/Task';
import type { NewTask, TaskChanges } from '../repositories/TaskRepository';
import {
  TaskValidationError,
  validateNewTask,
  validateTaskChanges,
} from './taskValidation';

/**
 * Pure helpers that hold the business rules, so any repository implementation
 * behaves the same. `id` and `now` are passed in to keep them deterministic.
 */

export function buildTask(
  input: NewTask,
  id: string,
  now: IsoDateString,
): Task {
  const errors = validateNewTask(input);
  if (errors.length > 0) {
    throw new TaskValidationError(errors);
  }

  return {
    id,
    title: input.title.trim(),
    description: input.description,
    status: input.status,
    priority: input.priority,
    assignedTo: input.assignedTo.trim(),
    createdDate: now,
    modifiedDate: now,
    isDeleted: false,
  };
}

export function applyTaskChanges(
  task: Task,
  changes: TaskChanges,
  now: IsoDateString,
): Task {
  if (task.isDeleted) {
    throw new Error('Cannot update a deleted task');
  }
  const errors = validateTaskChanges(changes);
  if (errors.length > 0) {
    throw new TaskValidationError(errors);
  }

  return {
    ...task,
    ...(changes.title !== undefined && { title: changes.title.trim() }),
    ...(changes.description !== undefined && {
      description: changes.description,
    }),
    ...(changes.status !== undefined && { status: changes.status }),
    ...(changes.priority !== undefined && { priority: changes.priority }),
    ...(changes.assignedTo !== undefined && {
      assignedTo: changes.assignedTo.trim(),
    }),
    modifiedDate: now,
  };
}

/** Deleting an already-deleted task is a no-op. */
export function markTaskDeleted(task: Task, now: IsoDateString): Task {
  if (task.isDeleted) {
    return task;
  }
  return { ...task, isDeleted: true, modifiedDate: now };
}
