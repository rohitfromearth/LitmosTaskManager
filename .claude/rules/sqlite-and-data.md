---
paths:
  - "src/services/database/**/*"
  - "src/features/tasks/data/**/*"
  - "src/test-utils/FakeDatabase.ts"
---

# SQLite and data layer

Details: `docs/DATA_AND_SYNC.md`.

## Driver and integration

- Driver: `@op-engineering/op-sqlite` (`19.0.6`). Opened only in `services/database/database.ts`.
- Callers depend on `SqlDatabase` / `SqlExecutor` in `types.ts`, not on op-sqlite types.
- WAL enabled after open; migrations run before the connection is returned.
- `Root.tsx` is the only production wiring of `openDatabase` + `createTaskRepository`.

## SQL conventions

- Parameterized statements only (`?` placeholders). Never concatenate user input into SQL.
- Task SQL lives only in `TaskLocalDataSource` + `taskQueries.ts`.
- Row mapping: snake_case DB ↔ camelCase `Task` in `TaskRecord.ts` (`is_deleted` 0/1 ↔ boolean).

## Migrations

- Append-only lists in `MIGRATIONS` (`migrations.ts`). Version = index + 1 via `PRAGMA user_version`.
- Each migration runs in a transaction with its version bump.
- Never edit a migration that has shipped to a device. Schema has **no** sync columns today — add them in a new migration when sync is built.

## Transactions and seed

- Use `db.transaction` for multi-statement atomic work (migrations, seed).
- `seedIfEmpty`: count all rows (including deleted); if zero, insert samples in the **same** transaction. Deleting all active tasks must not re-seed.

## Soft deletion

- `deleteTask` sets `isDeleted` / `is_deleted = 1` and updates `modified_date`.
- Listings, keyword search and summary filters `is_deleted = 0`.
- `getTaskById` returns `null` for deleted tasks. No hard deletes.

## Testing limitations

- Jest cannot load native op-sqlite here. Tests use `FakeDatabase`, which records statements/params and returns stub rows — it does **not** prove SQL correctness.
- Treat FakeDatabase tests as contract/regression for call shape; verify real queries on emulator/device before claiming persistence complete.
