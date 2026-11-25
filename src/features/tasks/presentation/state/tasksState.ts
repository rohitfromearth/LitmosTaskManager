import type { Task } from '../../domain/entities/Task';
import type { FieldError } from '../../domain/rules/taskValidation';
import type {
  TaskFilter,
  TaskRepository,
  TaskSummary,
} from '../../domain/repositories/TaskRepository';

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/** State of a read. `requestId` identifies the latest request so stale responses are ignored. */
export interface LoadState {
  status: RequestStatus;
  error: string | null;
  requestId: string | null;
}

/** State of the latest create/update/delete. */
export interface MutationState {
  status: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: ThunkError | null;
}

/** The single task shown on the details/edit screens, as last read from the repository. */
export interface DetailState {
  /** Which task `task` and `load` refer to; null before anything was requested. */
  taskId: string | null;
  /** null while loading, or when the repository has no such (non-deleted) task. */
  task: Task | null;
  load: LoadState;
}

export interface TasksState {
  /** Tasks matching `filter`, as last read from the repository. Never edited locally. */
  items: Task[];
  filter: TaskFilter;
  summary: TaskSummary | null;
  list: LoadState;
  summaryLoad: LoadState;
  detail: DetailState;
  mutation: MutationState;
}

/** Serializable error stored in Redux; field errors let a form show per-field messages. */
export interface ThunkError {
  message: string;
  fieldErrors?: FieldError[];
}

/** Passed to every thunk as `extra`; the only way the state layer reaches storage. */
export interface ThunkExtra {
  taskRepository: TaskRepository;
}

export interface TasksRootState {
  tasks: TasksState;
}
