---
paths:
  - "src/**/*.{ts,tsx}"
---

# React Native and TypeScript

## TypeScript

- Prefer explicit domain types (`Task`, `NewTask`, `TaskChanges`, `TaskFilter`, `TaskSummary`) over ad-hoc shapes.
- Use `TASK_STATUSES` / `TASK_PRIORITIES` const arrays; display maps must be `Record`s so missing labels fail typecheck.
- Prefer named exports. Default exports only where the RN entry requires them (`Root`, `App`).
- Keep Redux state serializable; store field errors as data, not thrown `Error` instances in state.

## Components and hooks

- Feature screens use feature-local dispatch/selector hooks, not `app/store/hooks`.
- Shared form for create/edit: `TaskForm`. Do not fork it.
- Single-task screens load via `useTaskDetail` / `detail` state — never trust list `items` for the open task.
- Forms validate with domain functions (`validateNewTask`, `validateTaskChanges`); show `FieldError`s per field. Do not re-implement limits in the UI (`maxLength` props are not a substitute for validation + counters).
- Local UI progress (e.g. delete on details) may stay on the screen when shared `mutation` state would leak across stacked routes.

## Navigation and UI state

- Wire routes in `src/app/navigation`. Feature screens stay route-agnostic via props (`onCreated`, `onOpenTask`, …).
- Auth gate: render Sign In/Up vs task stack from `selectIsAuthenticated` — no imperative navigate-after-login to task routes.
- Filters: `applyFilter(mergeFilter(current, patch))`; repository performs filtering. Debounce search; do not filter arrays in the UI.
- Summary: only from `getTaskSummary` / `summary` state — never derive counts from filtered `items`.
- Keep previous data on refresh failure (banner); full-screen error only when there is nothing to show.

## Accessibility and errors

- Meaningful `accessibilityLabel`s on primary actions (add, retry, sign out, …).
- Surface validation under fields; non-field failures as banners; keep user input on failure.
- Soft delete always confirms with `Alert` before dispatching `deleteTask`.

## Dependencies

- Do not add libraries for problems solved by existing shared components, domain rules or RTK.
- NetInfo and Fetch wrappers stay unused until sync/backend work starts — do not import them “just in case”.
