# Architecture

## Overview

Litmos Task Manager is a React Native TypeScript app. Entry: `index.js` → `src/app/Root.tsx`. `Root` is the composition root: it is the only production place that opens SQLite (`openDatabase`), builds `createTaskRepository`, and constructs `MockAuthRepository`, then passes an `initialize` function into `App`.

SQLite is the local source of truth for tasks. Redux Toolkit holds UI and request state and caches repository reads. Demo authentication is in-memory only.

Related docs: [CLAUDE.md](../CLAUDE.md), [DATA_AND_SYNC.md](DATA_AND_SYNC.md), [API.md](API.md), [TESTING.md](TESTING.md).

## Startup

`initializeApp` (`src/app/bootstrap/initializeApp.ts`) runs:

1. `openDatabase()` — open op-sqlite DB, WAL, migrations.
2. `createTaskRepository(db)` — local data source + seed-if-empty + `SqliteTaskRepository`.
3. `createAppStore(repository, authRepository)`.
4. Dispatch `loadTasks` and `loadSummary` (failures here do not block startup; errors land in list/summary request state).

`openDatabase` and `createTaskRepository` are injected so bootstrap tests never load native SQLite.

`App` + `useAppBootstrap`: loading (`StartupLoading`) → error with retry (`StartupError`) → ready (`Provider`, `NavigationContainer`, `RootNavigator` inside `SafeAreaProvider`).

## Source layout

```
src/
  app/                 Root, App, bootstrap, navigation, store
  features/
    tasks/
      domain/          Entities, TaskRepository contract, pure rules
      data/            SQLite repo, local DS, models, seed; remote/sync reserved
      presentation/    Screens, components, hooks, Redux slice/thunks
      index.ts         Public API
    auth/              Same layering; MockAuthRepository (demo)
  services/
    database/          op-sqlite open, migrations, SqlDatabase types
    http/              .gitkeep only (not implemented)
  shared/              Theme, generic components, utils
  test-utils/          FakeDatabase, mock/stateful repos, render helpers
```

Empty reserved folders use `.gitkeep` only: `datasources/remote`, `data/sync`, `services/http`, `domain/usecases`, `app/providers`.

## Layers and dependency flow

Dependencies point inward: **presentation → domain ← data**.

| Layer | Responsibility |
| --- | --- |
| Domain | `Task` model, filters/summary types, `TaskRepository`, validation and pure mutations (`buildTask`, `applyTaskChanges`, `markTaskDeleted`) |
| Data | `TaskLocalDataSource` (SQL), `SqliteTaskRepository` (rules + persistence), `TaskRecord` mapping, sample seed |
| Presentation | Screens/components; Redux slice + thunks; feature hooks |
| App | Wire repositories, navigation, auth gate |

**Rules**

- No SQL, op-sqlite or HTTP from UI components.
- Features export through `index.ts`.
- `tasks` and `auth` do not import each other.

## Navigation

Typed native stack (`src/app/navigation/types.ts`):

| Route | When | Params |
| --- | --- | --- |
| `SignIn`, `SignUp` | Signed out | — |
| `TaskList`, `CreateTask` | Signed in | — |
| `TaskDetails`, `EditTask` | Signed in | `{ taskId: string }` |

`RootNavigator` switches stacks with `selectIsAuthenticated`. Screens receive navigation callbacks as props; routes pass ids only.

## State management

`createAppStore` configures reducers `tasks` and `auth`, with thunk `extraArgument: { taskRepository, authRepository }`.

**Tasks slice (high level):** `items`, `filter`, `summary`, `detail`, plus request states `list`, `summaryLoad`, `mutation`. Thunks: `loadTasks`, `loadSummary`, `loadTask`, `createTask`, `updateTask`, `deleteTask`, `applyFilter`. After successful writes, list (current filter) and summary are re-read. Superseded reads are ignored.

**Auth slice:** in-memory session (`AuthSession` with `isDemo`; no token). Thunks: `signIn`, `signUp`, `signOut`. Passwords never enter Redux.

## Presentation (tasks)

Implemented screens and collaborators:

- `TaskListScreen` — list, pull-to-refresh, filter bar, summary, add FAB
- `CreateTaskScreen` / `EditTaskScreen` — shared `TaskForm`
- `TaskDetailsScreen` — read-only detail, edit navigation, soft delete via `Alert`
- Components: `TaskCard`, `TaskFilterBar`, `TaskSummary`, badges, detail fallback/content
- Helpers: `taskFilter` (`mergeFilter`, debounce search), `taskChanges` (`diffTaskChanges`), `taskLabels` / `taskColors`

Filtering and summary counting happen in the repository, not in the UI.

## Authentication (demo)

`MockAuthRepository`: in-memory accounts, seeded demo user (`demo@litmos.com` / `Litmos@123` from `domain/demoCredentials.ts`), artificial latency, no persistence. Replace at `Root.tsx` when a real backend exists; screens/thunks should not need structural changes.

## Data layer (local)

See [DATA_AND_SYNC.md](DATA_AND_SYNC.md). Remote data source and sync are **not** implemented. A future remote-aware `TaskRepository` can wrap local + remote without changing presentation or domain contracts.

## Shared UI

`shared/components`: `Badge`, `Button`, `ChoiceGroup`, `FloatingActionButton`, `InlineBanner`, `MessageState`, `TextField`. Theme tokens in `shared/theme/theme.ts`. Date/initials helpers under `shared/utils`.
