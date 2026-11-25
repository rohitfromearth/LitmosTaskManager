# Litmos Task Manager

React Native (Android and iOS) task manager in TypeScript. Local SQLite is the source of truth; the UI uses React Navigation and Redux Toolkit.

## Status

**Implemented:** offline task CRUD (soft delete), filters and keyword search, status/priority summary, create/edit/details screens, demo sign-in/sign-up, first-run sample data.

**Not implemented:** backend/API server, remote sync, NetInfo-driven offline queue. See [`docs/API.md`](docs/API.md) and [`docs/DATA_AND_SYNC.md`](docs/DATA_AND_SYNC.md).

## Stack

- React Native `0.88.1`, React `19.3`, TypeScript
- React Navigation native stack
- Redux Toolkit + React Redux
- `@op-engineering/op-sqlite` (local DB)
- Jest + `react-test-renderer`

## Requirements

- Node.js 22.11 or newer
- React Native environment for Android and/or iOS ([setup guide](https://reactnative.dev/docs/set-up-your-environment))
- iOS only: Ruby/Bundler and CocoaPods

## Getting started

```sh
npm install

# iOS only, first run or after native dependency changes
bundle install
bundle exec pod install --project-directory=ios

npm start          # Metro bundler
npm run android    # in another terminal
npm run ios
```

### Demo sign-in

On launch the app shows Sign In. Use the demo credentials shown on screen (`demo@litmos.com` / `Litmos@123`), or the “Use demo credentials” control. Auth is in-memory only (not secure); sessions do not survive a cold start.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Metro |
| `npm run android` / `npm run ios` | Build and run on a device or emulator |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

Jest covers domain, data (via a fake DB that does **not** execute native SQLite), Redux and UI. Verify real SQLite behaviour on an emulator or device. Details: [`docs/TESTING.md`](docs/TESTING.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Project conventions for contributors and Claude Code |
| [`.claude/rules/`](.claude/rules/) | Path-scoped Claude Code rules |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, startup, navigation, state |
| [`docs/DATA_AND_SYNC.md`](docs/DATA_AND_SYNC.md) | Schema, repository, seed; planned sync |
| [`docs/API.md`](docs/API.md) | Proposed API (backend not implemented) |
| [`docs/TESTING.md`](docs/TESTING.md) | Test commands, limits, verification levels |
