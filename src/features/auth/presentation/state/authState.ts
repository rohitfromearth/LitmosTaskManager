import type { AuthSession } from '../../domain/entities/Auth';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { AuthFieldError } from '../../domain/rules/authValidation';

/** Serializable error stored in Redux; field errors let a form show per-field messages. */
export interface AuthThunkError {
  message: string;
  fieldErrors?: AuthFieldError[];
}

export interface AuthState {
  /** Who is signed in; null when signed out. Reset to null by sign out. */
  session: AuthSession | null;
  /** The latest sign in, sign up or sign out request. */
  status: 'idle' | 'pending' | 'failed';
  /** Why the latest sign in or sign up failed; null otherwise. */
  error: AuthThunkError | null;
}

/** Passed to every auth thunk as `extra`; the only way the state layer reaches the backend. */
export interface AuthThunkExtra {
  authRepository: AuthRepository;
}

export interface AuthRootState {
  auth: AuthState;
}
