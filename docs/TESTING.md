# Testing

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the full Jest suite |
| `npx jest path/to/file.test.ts` | Run one file |
| `npm run lint` | ESLint |

Setup and run-on-device commands: [README.md](../README.md).

## Framework

- **Jest** with `@react-native/jest-preset` (`jest.config.js`).
- UI tests use **`react-test-renderer`**, not React Native Testing Library (RNTL is not in `package.json`).
- Helpers: `src/test-utils/renderHelpers.ts` (`byTestId`, `hostByTestId`, …). Prefer `hostByTestId` when counting host elements (`byTestId` also matches composite wrappers).
- Packages that ship untranspiled ESM (React Navigation, RTK, immer, redux, …) are allow-listed in `transformIgnorePatterns`. Extend that list if Jest fails with `Unexpected token 'export'`.

## Test layout

Tests live next to code under `__tests__/` (≈ 30 suites as of the docs pass). Areas covered:

| Area | Examples |
| --- | --- |
| Domain rules | `taskValidation`, `taskRules`, `authValidation` |
| Data / SQL intent | `taskQueries`, `SqliteTaskRepository`, `migrations`, `sampleTasks` |
| Redux | `tasksSlice`, `taskDetail`, `authSlice` |
| Screens / components | list, create, edit, details, delete, filters, summary, cards, auth screens |
| App shell | `initializeApp`, `App`, auth navigation |

Shared helpers: `FakeDatabase`, `createMockRepository`, `createStatefulRepository`, `deferred` (in test files / test-utils).

## What each kind of test proves

| Kind | Mechanism | Proves | Does not prove |
| --- | --- | --- | --- |
| Unit | Pure functions | Domain rules, labels, filter merge, diffs | Persistence, UI |
| FakeDatabase integration | Records SQL + params; stub rows | Repository/data source call shape | Real SQLite parsing, indexes, CHECK constraints |
| Stateful / mock repository UI | In-memory repo contract | Screen/Redux behaviour | Native DB or device chrome |
| Manual on emulator/device | Real op-sqlite + UI | Migrations, seed, queries, alerts, navigation | Automated CI coverage (none configured in-repo for devices) |
| Backend / sync E2E | — | — | **N/A — not implemented** |

**Important:** FakeDatabase explicitly does not execute SQL. Passing repository tests is not “native SQLite verification”.

## Conventions worth keeping

- Mock `react-native-safe-area-context` when rendering trees that include `SafeAreaProvider` (see `src/app/__tests__/App.test.tsx`).
- Unmount React test renderers in `afterEach` to avoid open-handle warnings.
- Soft-delete UI tests mock `Alert.alert` and use `createStatefulRepository`.
- Debounced search tests: `jest.useFakeTimers()` and restore real timers in `afterEach`.
- Prefer asserting through repository/state outcomes over brittle layout snapshots.

## Known limitations

- Native op-sqlite cannot run under this project’s Jest setup; `better-sqlite3` was previously found unsuitable on the Windows setup used for development.
- No Detox/Appium/Maestro (or similar) suite in the repo.
- No documented automated iOS verification evidence in-repo — do not claim iOS QA complete without a recorded run.
- `@react-native-community/netinfo` is unused; there are no connectivity tests.
- Backend and sync have no tests because they do not exist.

## Verification status (documentation pass)

During documentation review, `npm test` was executed once on the developer machine:

- Most suites reported **PASS**.
- `src/features/tasks/presentation/screens/__tests__/EditTaskScreen.test.tsx` reported a **failure**: one test exceeded the default 5000 ms timeout (`shows a loading state, then the form`).

That result is a point-in-time observation, not a guarantee of current CI health (no CI config is asserted here). Re-run `npm test` before treating the suite as green. Do not cite invented pass counts.

## Reporting standard for contributors and AI

1. State the exact command.
2. State pass/fail (and which files failed, if any).
3. Separate “Jest with FakeDatabase/mocks” from “verified on Android/iOS emulator with real SQLite”.
4. Never mark sync/backend features tested until they exist.
