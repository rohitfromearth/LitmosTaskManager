import type { Task } from '../domain/entities/Task';
import type {
  NewTask,
  TaskChanges,
} from '../domain/repositories/TaskRepository';

/**
 * The fields of `input` that differ from the stored task. Text is compared
 * trimmed, because the domain trims title and assignee when saving; so adding
 * a trailing space is not a change. An empty result means "nothing to save".
 */
export function diffTaskChanges(task: Task, input: NewTask): TaskChanges {
  const changes: TaskChanges = {};
  if (input.title.trim() !== task.title) {
    changes.title = input.title;
  }
  if (input.description !== task.description) {
    changes.description = input.description;
  }
  if (input.assignedTo.trim() !== task.assignedTo) {
    changes.assignedTo = input.assignedTo;
  }
  if (input.status !== task.status) {
    changes.status = input.status;
  }
  if (input.priority !== task.priority) {
    changes.priority = input.priority;
  }
  return changes;
}
