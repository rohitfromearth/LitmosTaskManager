import type { Task } from '../features/tasks/domain/entities/Task';
import type { TaskFilter } from '../features/tasks/domain/repositories/TaskRepository';
import type { NewTask } from '../features/tasks/domain/repositories/TaskRepository';
import {
  applyTaskChanges,
  buildTask,
  markTaskDeleted,
} from '../features/tasks/domain/rules/taskRules';
import { createMockRepository, emptySummary } from './mockTaskRepository';

/** Case-insensitive match on title or description, like the real query's LIKE. */
function matchesKeyword(task: Task, keyword?: string): boolean {
  const needle = keyword?.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    task.title.toLowerCase().includes(needle) ||
    task.description.toLowerCase().includes(needle)
  );
}

/**
 * A mock repository that really stores tasks in memory and follows the
 * `TaskRepository` contract for soft deletion: deleted tasks are kept (with
 * `isDeleted`) but never listed, counted or returned by id, and can't be updated.
 * Being jest mocks, calls can still be asserted, and a method can be overridden
 * afterwards with `mockRejectedValueOnce` etc.
 */
export function createStatefulRepository(initial: Task[]) {
  let stored = [...initial];
  const now = '2026-12-01T10:00:00.000Z';
  const active = () => stored.filter(t => !t.isDeleted);

  const repository = createMockRepository({
    getTasks: jest.fn(async (filter?: TaskFilter) =>
      active().filter(
        t =>
          (!filter?.status || t.status === filter.status) &&
          (!filter?.priority || t.priority === filter.priority) &&
          matchesKeyword(t, filter?.keyword),
      ),
    ),
    getTaskSummary: jest.fn(async () => {
      const summary = JSON.parse(
        JSON.stringify(emptySummary),
      ) as typeof emptySummary;
      for (const task of active()) {
        summary.byStatus[task.status] += 1;
        summary.byPriority[task.priority] += 1;
      }
      return summary;
    }),
    getTaskById: jest.fn(
      async (id: string) => active().find(t => t.id === id) ?? null,
    ),
    createTask: jest.fn(async (input: NewTask) => {
      const task = buildTask(input, `new-${stored.length + 1}`, now);
      stored = [task, ...stored];
      return task;
    }),
    updateTask: jest.fn(async (id: string, changes) => {
      const current = active().find(t => t.id === id);
      if (!current) {
        throw new Error(`Task not found: ${id}`);
      }
      const updated = applyTaskChanges(current, changes, now);
      stored = stored.map(t => (t.id === id ? updated : t));
      return updated;
    }),
    deleteTask: jest.fn(async (id: string) => {
      const current = stored.find(t => t.id === id);
      if (!current) {
        throw new Error(`Task not found: ${id}`);
      }
      stored = stored.map(t => (t.id === id ? markTaskDeleted(t, now) : t));
    }),
  });

  return {
    repository,
    /** Every stored record, including soft-deleted ones. */
    records: () => stored,
  };
}
