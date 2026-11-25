---
paths:
  - "src/services/http/**/*"
  - "src/features/tasks/data/sync/**/*"
  - "src/features/tasks/data/datasources/remote/**/*"
  - "docs/API.md"
  - "docs/DATA_AND_SYNC.md"
---

# Backend and sync (mostly unimplemented)

**Status: not implemented.** Folders `services/http`, `data/datasources/remote` and `data/sync` contain only `.gitkeep`. `@react-native-community/netinfo` is installed but unused. There is no server package in this repo.

Read `docs/API.md` and the planned section of `docs/DATA_AND_SYNC.md` before writing any network or sync code. Do not describe planned behaviour as shipped.

## When implementing (assignment direction)

- Keep API access behind data-layer types (remote data source / sync service). Presentation and domain stay free of `fetch` and NetInfo.
- SQLite remains the local source of truth; sync reconciles remote with local — UI keeps using `TaskRepository`.
- Soft deletes must be propagatable (rows retained with `isDeleted`).
- Prefer durable pending operations (survive process death) over in-memory-only queues once sync exists.
- Use NetInfo (already a dependency) for connectivity; retry with clear acknowledgement of accepted server state; define conflict rules explicitly in docs before coding them.
- Auth today is `MockAuthRepository` (demo). Real tokens/backends replace the mock at `Root.tsx` without rewriting screens.

## Required product surface (for a future API)

Align any backend with existing repository capabilities: list (filter), summary, get by id, create, update, soft delete — using the same task field names and enum values as the domain model.

## Boundaries

- No direct SQL or API calls from UI components.
- No sync schema columns until a real migration is added.
- Demo auth is not security; never invent tokens or persist passwords.
