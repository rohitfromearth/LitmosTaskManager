---
paths:
  - "**/__tests__/**/*"
  - "src/test-utils/**/*"
  - "jest.config.js"
---

# Testing and verification

Details: `docs/TESTING.md`.

## Setup

- Runner: Jest with `@react-native/jest-preset` (`npm test`).
- UI: `react-test-renderer` + `src/test-utils/renderHelpers` (`hostByTestId`, etc.). **React Native Testing Library is not a dependency** — do not assume or import it.
- ESM packages (React Navigation, RTK, …) must stay listed in `transformIgnorePatterns` in `jest.config.js` when tests fail with `Unexpected token 'export'`.

## What to add

- Domain rules: pure unit tests beside the rules.
- Repository / queries: FakeDatabase or stateful mock repository; assert SQL intent and domain behaviour.
- Redux: `createMockRepository` / `deferred()` for ordering; keep state serializable assertions.
- Screens: mock repositories; mock `Alert.alert` for delete; fake timers for search debounce and restore in `afterEach`.
- Safe area: mock `react-native-safe-area-context` when rendering `SafeAreaProvider` (see `App.test.tsx`). Unmount renderers in `afterEach`.

## Verification levels (do not conflate)

| Level | What it proves |
| --- | --- |
| Unit / FakeDatabase / mock repo | Logic and intended SQL/params |
| Emulator/device with real op-sqlite | Actual schema, queries, seed, migrations |
| Manual UI on device | Navigation, forms, alerts, list behaviour |
| Backend/sync E2E | **Not available** — not implemented |

## Reporting

- Quote exact commands (`npm test`, targeted `npx jest path`, `npm run lint`).
- Report real pass/fail; do not invent counts.
- Never claim “native SQLite verified” from FakeDatabase tests alone.
- Never claim iOS (or Android) verification without evidence from this environment.
- Flaky timeouts are failures until re-run or fixed — say so.
