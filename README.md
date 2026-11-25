# Litmos Task Manager

A React Native task manager app (Android and iOS), written in TypeScript.

Status: early scaffolding. The task domain model and navigation shell exist; storage, sync and the backend are not implemented yet.

## Requirements

- Node.js 22.11 or newer
- A React Native environment for Android and/or iOS ([setup guide](https://reactnative.dev/docs/set-up-your-environment))
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

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Metro |
| `npm run android` / `npm run ios` | Build and run on a device or emulator |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

## Documentation

- [`CLAUDE.md`](CLAUDE.md): project conventions and decisions (read before contributing)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): code structure and how the layers fit together
