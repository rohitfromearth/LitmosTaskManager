import type { TaskFilter } from '../domain/repositories/TaskRepository';

/**
 * The filter with `patch` applied. `applyFilter` replaces the whole filter, so
 * a control that changes one field passes the current filter through here.
 * Fields set to `undefined` or a blank string are removed, so "no filter" is
 * always the same shape (`{}`), and the keyword is stored trimmed.
 */
export function mergeFilter(filter: TaskFilter, patch: TaskFilter): TaskFilter {
  const merged: TaskFilter = { ...filter, ...patch };
  const keyword = merged.keyword?.trim();

  const next: TaskFilter = {};
  if (merged.status) {
    next.status = merged.status;
  }
  if (merged.priority) {
    next.priority = merged.priority;
  }
  if (keyword) {
    next.keyword = keyword;
  }
  return next;
}

/** True if any filter (status, priority or keyword) narrows the list. */
export function hasActiveFilter(filter: TaskFilter): boolean {
  return Object.keys(mergeFilter(filter, {})).length > 0;
}
