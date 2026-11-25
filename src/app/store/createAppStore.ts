import { configureStore } from '@reduxjs/toolkit';
import {
  AuthError,
  authReducer,
  type AuthRepository,
} from '../../features/auth';
import { tasksReducer, type TaskRepository } from '../../features/tasks';

/** Stands in when no auth backend was given: every call fails with a clear message. */
const unconfiguredAuthRepository: AuthRepository = {
  signIn: () => Promise.reject(notConfigured()),
  signUp: () => Promise.reject(notConfigured()),
  signOut: () => Promise.reject(notConfigured()),
};

function notConfigured() {
  return new AuthError('unknown', 'Authentication is not configured.');
}

/**
 * Builds the store around the repositories. They are passed in (not imported)
 * so the UI and state layers never depend on SQLite or on a particular auth
 * backend, and tests or a future remote-backed implementation can be swapped in.
 *
 * `authRepository` is optional only so task-focused tests can build a store
 * without it; `initializeApp` always supplies one, and the auth thunks fail
 * with a clear error if they run without it.
 */
export function createAppStore(
  taskRepository: TaskRepository,
  authRepository: AuthRepository = unconfiguredAuthRepository,
) {
  return configureStore({
    reducer: { tasks: tasksReducer, auth: authReducer },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: { extraArgument: { taskRepository, authRepository } },
      }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
