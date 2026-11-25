# Litmos Task Manager — Claude Code instructions

Guidance for anyone (human or AI) changing this codebase. Structure and data flow: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Persistence and planned sync: [`docs/DATA_AND_SYNC.md`](docs/DATA_AND_SYNC.md). API status: [`docs/API.md`](docs/API.md). Testing: [`docs/TESTING.md`](docs/TESTING.md). Setup commands: [`README.md`](README.md).

Focused rules live under [`.claude/rules/`](.claude/rules/). Prefer those over inventing new conventions.

## Purpose and assignment context

React Native (Android and iOS) task manager for a Litmos assignment. Local SQLite is the source of truth. Mandatory product behaviours already reflected in code:

- Task fields: `id`, `title`, `description`, `status`, `priority`, `assignedTo`, `createdDate`, `modifiedDate`, `isDeleted`
- Statuses: To Do / In Progress / Done (`todo`, `in_progress`, `done`)
- Priorities: Low / Medium / High / Critical (`low`, `medium`, `high`, `critical`)
- Required non-blank `assignedTo`
- Soft deletion; exclude deleted tasks from listings, search and summary
- Filters: status, priority, keyword search
- Summary: counts by status and by priority
- React Navigation for screen flow

Title (100) and description (1000) length limits are project decisions, not assignment mandates.

## Technology stack (verify in `package.json`)

| Area | Choice | Version notes |
| --- | --- | --- |
| App | React Native + React | RN `0.88.1`, React `19.3.0` |
| Language | TypeScript (strict via `@react-native/typescript-config`) | `typescript` in `package.json` |
| Navigation | React Navigation native stack | `@react-navigation/native` + `native-stack` v7 |
| State | Redux Toolkit + React Redux | RTK `^2.15`, `react-redux` `^9.3` |
| SQLite | `@op-engineering/op-sqlite` | `19.0.6` |
| Connectivity | `@react-native-community/netinfo` | Installed `^12`; **not used in source yet** |
| HTTP | Fetch API | No HTTP client wrapper implemented |
| Tests | Jest + `react-test-renderer` | `@react-native/jest-preset`; **not** React Native Testing Library |
| Lint/format | ESLint + Prettier | RN defaults |

Node: `>= 22.11.0`.

## Current implementation status

**Implemented**

- App bootstrap (`openDatabase` → migrations → `createTaskRepository` + seed → Redux store → initial `loadTasks` / `loadSummary`)
- Task domain, validation rules, SQLite repository and local data source
- Redux tasks slice and thunks
- Screens: Task List (filter/search/summary), Create, Details, Edit; soft delete with confirmation
- Demo auth (`MockAuthRepository`, Sign In / Sign Up); not security

**Not implemented**

- Backend / Express mock server
- Remote data source, sync engine, pending-ops queue
- NetInfo wiring and offline/online UX beyond local SQLite
- Restore of soft-deleted tasks
- iOS device verification is not documented as completed in-repo; do not claim it

Do not document or claim unfinished work as complete.

## Folder structure and boundaries

```
src/
  app/           Composition root: Root, App, bootstrap, navigation, store
  features/
    tasks/       domain | data | presentation (+ index.ts public API)
    auth/        Same layering; demo only; must not import tasks (and vice versa)
  services/      database (op-sqlite), http (.gitkeep — unused)
  shared/        Theme, generic UI, utils
  test-utils/    FakeDatabase, mock/stateful repositories, render helpers
```

- Feature code outside a feature imports it only through that feature’s `index.ts`.
- `domain` is plain TypeScript: no React, React Native, storage or network imports.
- Dependencies: `presentation` → `domain` ← `data`. UI never calls SQL or HTTP directly.
- Only `services/database/database.ts` imports op-sqlite. Only `TaskLocalDataSource` runs task SQL.
- Only `Root.tsx` wires real `openDatabase` / `createTaskRepository` / auth repository so Jest never loads native SQLite by importing `Root`.

## Domain and task model

- String ids generated on device; ISO 8601 UTC strings for dates (`IsoDateString`).
- Internal enums stored and synced later: never store display labels.
- Display labels: `presentation/taskLabels.ts` (`Record` keyed by internal values).
- Rules: `domain/rules` (`buildTask`, `applyTaskChanges`, `markTaskDeleted`, validators). Repositories must use them.
- Invalid input → `TaskValidationError` with per-field errors.
- Updating a deleted task errors; deleting twice is a no-op.
- Callers supply `NewTask` / `TaskChanges` only; repository owns `id`, dates, `isDeleted`.

## Database and persistence

- DB file: `litmos-tasks.db`; WAL; schema version via `PRAGMA user_version`.
- Migrations: append-only in `services/database/migrations.ts`. Never edit a migration that has run on a real device.
- Soft delete: `is_deleted = 1`; no hard `DELETE` for tasks.
- Seed: 12 samples once, in a transaction, only if the table has never held a row (including deleted).
- Do not add sync columns or backend code until that feature is built (new migration then).

## State management

- Redux holds UI state and request status only. SQLite remains source of truth.
- After writes, thunks re-read list (current filter) and summary; do not patch `items` by hand.
- Inject repositories via `createAppStore(taskRepository, authRepository)` → thunk `extra`.
- Serializable state only (messages / field errors, not `Error` objects).
- Feature screens use feature hooks (`useTasksDispatch` / `useTasksSelector`, auth equivalents), not `app/store/hooks`.
- Navigation callbacks and route params (ids only) come from `src/app/navigation`.

## Development workflow

1. Inspect existing code and docs before editing.
2. Prefer small, focused changes that match current patterns.
3. Do not silently change architectural decisions (layers, soft delete, repository injection, Redux-as-cache-of-reads).
4. Avoid new dependencies and abstractions unless required.
5. Add or update tests next to the behaviour you change.
6. Report exact commands run and real results. Never claim unverified features.

Incremental rule: implement one vertical slice at a time; keep `domain` free of frameworks; keep UI free of SQL/HTTP.

## Testing and verification

- `npm test` (Jest). UI tests use `react-test-renderer` + helpers in `src/test-utils`.
- Data-layer tests use `FakeDatabase` (records SQL + params; does **not** execute SQLite). Native SQL must be checked on emulator/device.
- Component tests that use `SafeAreaProvider` must mock `react-native-safe-area-context` (see `App.test.tsx`). Unmount trees in `afterEach`.
- Distinguish: unit / FakeDatabase integration / native SQLite on device / full manual UI. See [`docs/TESTING.md`](docs/TESTING.md).

## Assignment priorities (when choosing work)

1. Correct offline local CRUD, filters, summary and soft delete (done — protect with regression tests).
2. Navigation and typed routes.
3. Clear architecture boundaries for a future remote + sync layer.
4. Backend and sync only when explicitly building that slice; keep them behind repository / data-source boundaries.
5. Demo auth stays demonstrative until replaced at `Root.tsx`.

## Safety rules

- Do not run destructive git commands, force-push, or rewrite history unless explicitly asked.
- Do not bump React Native, SQLite driver or navigation majors without an explicit request and a migration plan.
- Do not edit released migrations; append new ones.
- Do not commit secrets, keystores, `.env*` or credentials. `.claude/settings.json` already denies reading common secret paths.
- Do not remove soft-delete behaviour or start hard-deleting task rows.
- Do not invent MCP servers, custom Claude commands, hooks or skills that are not in the repo.

## Documentation maintenance

- Update docs in the same change as the behaviour they describe.
- Document only what is implemented; label planned work as **planned** / **proposed**.
- Conventions → `CLAUDE.md` + `.claude/rules/`; structure → `docs/ARCHITECTURE.md`; persistence/sync → `docs/DATA_AND_SYNC.md`; HTTP contract → `docs/API.md`; tests → `docs/TESTING.md`; setup → `README.md`. Link instead of duplicating.

## AI collaboration rules

- Developer owns architecture and merge decisions. Propose changes; do not silently re-architect.
- Inspect before editing; match existing naming, folder layout and patterns.
- Prefer editing existing files over creating parallel abstractions.
- When unsure whether something is implemented, search the repo; empty `.gitkeep` folders mean “reserved”, not “built”.
- After substantive work: list files touched, commands run, pass/fail, and residual risk (especially native SQLite and device UI).
