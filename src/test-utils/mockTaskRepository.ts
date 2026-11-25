import type { Task } from '../features/tasks/domain/entities/Task';
import type { TaskRepository } from '../features/tasks/domain/repositories/TaskRepository';

export const emptySummary = {
  byStatus: { todo: 0, in_progress: 0, done: 0 },
  byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
};

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write report',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'Asha',
    createdDate: '2026-11-25T00:00:00.000Z',
    modifiedDate: '2026-11-25T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  };
}

/** A TaskRepository of jest mocks that succeed with empty data unless overridden. */
export function createMockRepository(
  overrides: Partial<jest.Mocked<TaskRepository>> = {},
): jest.Mocked<TaskRepository> {
  return {
    getTasks: jest.fn().mockResolvedValue([]),
    getTaskSummary: jest.fn().mockResolvedValue(emptySummary),
    getTaskById: jest.fn().mockResolvedValue(null),
    createTask: jest.fn().mockResolvedValue(makeTask()),
    updateTask: jest.fn().mockResolvedValue(makeTask()),
    deleteTask: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** A promise you resolve or reject by hand, to control response order. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
