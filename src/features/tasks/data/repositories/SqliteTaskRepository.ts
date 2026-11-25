import type { IsoDateString, Task } from '../../domain/entities/Task';
import type {
  NewTask,
  TaskChanges,
  TaskFilter,
  TaskRepository,
  TaskSummary,
} from '../../domain/repositories/TaskRepository';
import {
  applyTaskChanges,
  buildTask,
  markTaskDeleted,
} from '../../domain/rules/taskRules';
import type { TaskLocalDataSource } from '../datasources/local/TaskLocalDataSource';

export interface RepositoryOptions {
  generateId?: () => string;
  now?: () => IsoDateString;
}

const defaultGenerateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const defaultNow = () => new Date().toISOString();

/** Applies the domain rules and persists the result through the local data source. */
export class SqliteTaskRepository implements TaskRepository {
  private readonly generateId: () => string;
  private readonly now: () => IsoDateString;

  constructor(
    private readonly local: TaskLocalDataSource,
    options: RepositoryOptions = {},
  ) {
    this.generateId = options.generateId ?? defaultGenerateId;
    this.now = options.now ?? defaultNow;
  }

  getTasks(filter?: TaskFilter): Promise<Task[]> {
    return this.local.findAll(filter);
  }

  getTaskSummary(): Promise<TaskSummary> {
    return this.local.getSummary();
  }

  async getTaskById(id: string): Promise<Task | null> {
    const task = await this.local.findById(id);
    return task && !task.isDeleted ? task : null;
  }

  async createTask(input: NewTask): Promise<Task> {
    const task = buildTask(input, this.generateId(), this.now());
    await this.local.insert(task);
    return task;
  }

  async updateTask(id: string, changes: TaskChanges): Promise<Task> {
    const existing = await this.requireTask(id);
    const updated = applyTaskChanges(existing, changes, this.now());
    await this.local.update(updated);
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const existing = await this.requireTask(id);
    const deleted = markTaskDeleted(existing, this.now());
    if (deleted !== existing) {
      await this.local.update(deleted);
    }
  }

  private async requireTask(id: string): Promise<Task> {
    const task = await this.local.findById(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return task;
  }
}
