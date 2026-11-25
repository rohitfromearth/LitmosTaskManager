# API

## Implementation status

**No backend is implemented in this repository.**

- There is no Express (or other) server package.
- `src/services/http/` is empty (`.gitkeep` only).
- `src/features/tasks/data/datasources/remote/` is empty.
- The mobile app does not call `fetch` for tasks.
- Demo auth uses in-memory `MockAuthRepository` only (no HTTP, no tokens).

Historical stack intent (from project setup discussions, not code): a **Node.js + Express** mock backend and the **Fetch API** on the client. That remains **pending**.

---

## Proposed assignment API contract

> **Proposed / pending implementation.** No formal brief with paths was checked into the repo. This contract mirrors the existing `TaskRepository` and domain model so a future mock server can support the same behaviours. Adjust paths or envelopes only with an explicit project decision, then update this file.

### Conventions

- Base URL: configurable (e.g. `http://localhost:3000`); not wired today.
- JSON request/response bodies.
- Task field names and enums match the domain (camelCase JSON):

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high | critical",
  "assignedTo": "string",
  "createdDate": "2026-11-25T12:00:00.000Z",
  "modifiedDate": "2026-11-25T12:00:00.000Z",
  "isDeleted": false
}
```

- Soft delete: API should retain records and expose `isDeleted` (or equivalent) rather than removing rows, consistent with local behaviour.
- List/summary endpoints should exclude deleted tasks by default.

### Endpoints (proposed)

#### List tasks

`GET /tasks`

Query (all optional): `status`, `priority`, `keyword`

**200**

```json
{
  "items": [ /* Task */ ]
}
```

#### Task summary

`GET /tasks/summary`

**200**

```json
{
  "byStatus": { "todo": 0, "in_progress": 0, "done": 0 },
  "byPriority": { "low": 0, "medium": 0, "high": 0, "critical": 0 }
}
```

#### Get by id

`GET /tasks/:id`

**200** — single `Task`  
**404** — missing or soft-deleted (align with local `getTaskById` → `null`)

#### Create

`POST /tasks`

Body: `{ "title", "description", "status", "priority", "assignedTo" }`  
Server or client may supply `id` / timestamps; local app today generates them on device — decide one authority when implementing sync.

**201** — created `Task`  
**400** — validation errors, preferably per-field:

```json
{
  "errors": [{ "field": "title", "message": "Title is required" }]
}
```

#### Update

`PATCH /tasks/:id` (or `PUT` with partial fields)

Body: any subset of editable fields.

**200** — updated `Task`  
**400** — validation  
**404** — missing/deleted

#### Soft delete

`DELETE /tasks/:id`

**204** — deleted (idempotent if already deleted is acceptable; local repo errors only when the id never existed)  
**404** — unknown id

### Auth (out of scope for current mock)

Demo credentials are local only. A future real auth API is **not** specified here. Do not invent bearer tokens in the app until a real `AuthRepository` and contract exist.

### Client integration notes (when built)

- Call HTTP only from `data` / `services/http`, never from screens.
- Prefer mapping remote DTOs in the data layer to domain `Task`.
- Sync acknowledgement and retry behaviour belong in `data/sync` (see [DATA_AND_SYNC.md](DATA_AND_SYNC.md)); they are not part of the UI.
