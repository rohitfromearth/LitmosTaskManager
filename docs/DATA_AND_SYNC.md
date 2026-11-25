# Data and sync

## Status

| Area | Status |
| --- | --- |
| SQLite schema v1 + migrations runner | Implemented |
| Local task CRUD, filters, summary, soft delete | Implemented |
| First-run sample seed | Implemented |
| Remote data source | Not implemented (`.gitkeep`) |
| Sync engine / pending ops / NetInfo usage | Not implemented |
| Sync-related schema columns | None (intentionally omitted from v1) |

## Database

- File: `litmos-tasks.db` (op-sqlite)
- Open path: `src/services/database/database.ts`
- Abstraction: `SqlDatabase` / `SqlExecutor` in `types.ts` (execute + transaction)
- Journal: `PRAGMA journal_mode = WAL`
- Version: `PRAGMA user_version`; migrations in `migrations.ts`

### Schema (migration v1)

Table `tasks`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | Device-generated string |
| `title` | TEXT NOT NULL | |
| `description` | TEXT NOT NULL DEFAULT `''` | |
| `status` | TEXT | CHECK `todo` \| `in_progress` \| `done` |
| `priority` | TEXT | CHECK `low` \| `medium` \| `high` \| `critical` |
| `assigned_to` | TEXT NOT NULL | |
| `created_date` | TEXT NOT NULL | ISO 8601 UTC |
| `modified_date` | TEXT NOT NULL | ISO 8601 UTC |
| `is_deleted` | INTEGER | 0/1, default 0 |

Indexes: active-by-modified, status, priority (all include `is_deleted`).

### Migration rules

- Append new entries to `MIGRATIONS`; never edit a released migration.
- Each migration runs in one transaction with its version bump.
- Newer-than-app `user_version` throws.

## Domain task model

Mapped in `TaskRecord.ts` (DB snake_case ↔ domain camelCase).

```ts
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string; // required, non-blank after trim
  createdDate: IsoDateString;
  modifiedDate: IsoDateString;
  isDeleted: boolean;
}
```

Limits (project decision): title ≤ 100 chars (required); description ≤ 1000 chars (may be empty).

## Repository behaviour

Contract: `TaskRepository` in `domain/repositories/TaskRepository.ts`.  
Implementation: `SqliteTaskRepository` → `TaskLocalDataSource` → SQL builders in `taskQueries.ts`.

| Method | Behaviour |
| --- | --- |
| `getTasks(filter?)` | Non-deleted; optional status, priority, keyword (`LIKE` on title/description, ESCAPE); AND; order `modified_date DESC, id` |
| `getTaskSummary()` | Counts of non-deleted by status and by priority; missing keys → 0; **not** affected by list filter |
| `getTaskById` | `null` if missing or soft-deleted |
| `createTask` | `buildTask` then INSERT |
| `updateTask` | load, `applyTaskChanges`, UPDATE all columns; error if missing/deleted |
| `deleteTask` | `markTaskDeleted`; UPDATE; second delete no-op; error if missing |

Business rules live in `domain/rules`; the data source does not re-validate.

SQL uses bound parameters. Keyword wildcards `%` / `_` / `\` are escaped for `LIKE`.

## Seed strategy

`createTaskRepository` → `seedIfEmpty(buildSampleTasks(now))`.

- 12 sample tasks covering statuses/priorities and several assignees.
- Runs only when `COUNT(*)` on `tasks` is 0 (soft-deleted rows count).
- Check + inserts share one transaction.
- Clearing the active list does not re-seed.

## Soft deletion

- No `DELETE FROM tasks` for user deletes.
- Listings, search and summary require `is_deleted = 0`.
- Intended so a future sync can propagate deletions.

---

## Planned: offline synchronization

> **Planned / not implemented.** The following records architectural intent only. No pending-ops table, remote client, or NetInfo listener exists in source.

Agreed direction from project decisions:

1. **Local first** — SQLite remains authoritative for the UI; screens keep using `TaskRepository`.
2. **Separate layers** — remote data source under `data/datasources/remote`; sync orchestration under `data/sync`; HTTP helpers under `services/http`.
3. **Connectivity** — use the already-declared `@react-native-community/netinfo` dependency when building sync.
4. **Durable pending work** — queue create/update/delete (soft) operations so they survive process death; flush when online; require clear server acknowledgement before dropping a pending op.
5. **Conflicts** — define and document a rule (e.g. last-write-wins on `modifiedDate`, or server-wins) in this file **before** coding; do not invent ad hoc behaviour in UI.
6. **Schema** — add any sync metadata (`pending_ops`, cursors, etags, etc.) via a **new** migration; do not edit v1.
7. **Transport** — Fetch API against a mock/backend contract described in [API.md](API.md) (proposed until a server exists).

Until that work lands, do not claim offline sync, retry, or conflict handling in READMEs, demos or AI summaries.
