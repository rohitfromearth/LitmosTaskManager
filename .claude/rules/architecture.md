---
paths:
  - "src/**/*.{ts,tsx}"
---

# Architecture boundaries

Feature-first pragmatic Clean Architecture. Full map: `docs/ARCHITECTURE.md`.

## Layers

- `domain`: entities, repository interfaces, pure rules. No React, RN, SQLite or network.
- `data`: repository implementations, local/remote data sources, mappers, seed. Implements domain contracts.
- `presentation`: screens, components, feature Redux slice/thunks/hooks. Depends on domain types and rules only — never on `data/` or `services/database`.
- `app`: composition root (bootstrap, navigation wiring, store factory). Injects repositories.
- `services`: infrastructure (database today; `http` reserved).
- `shared`: framework-agnostic UI primitives and utils with no task/auth domain knowledge.

Import a feature only through its `index.ts`. `tasks` and `auth` must not import each other; `app` wires them.

## Repository boundary

- UI and Redux thunks talk to `TaskRepository` / `AuthRepository` only (via thunk `extra`).
- No SQL, op-sqlite or `fetch` inside screens or components.
- Swap implementations in `Root.tsx` / `createTaskRepository` / store factory without changing presentation.

## Redux Toolkit patterns

- Store created with `createAppStore(taskRepository, authRepository)`.
- Task data in the store is a **read cache**: after create/update/delete, thunks re-read list + summary from the repository. Do not add reducers that surgically patch `items`.
- Keep state serializable.
- Feature hooks (`presentation/state/hooks.ts`) inside features; `app/store/hooks` for app shell only.
- Navigation: typed `RootStackParamList`; pass **ids** in routes, not task objects; screens receive navigation callbacks as props.

## Data flow

```
Screen → dispatch thunk → TaskRepository → TaskLocalDataSource → SQLite
                ↓
         re-read → update Redux items/summary/detail
```

SQLite is the source of truth until a sync layer exists (it does not yet).
