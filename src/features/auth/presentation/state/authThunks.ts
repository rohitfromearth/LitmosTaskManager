import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
  AuthSession,
  SignInCredentials,
  SignUpData,
} from '../../domain/entities/Auth';
import { AuthValidationError } from '../../domain/rules/authValidation';
import type {
  AuthRootState,
  AuthThunkError,
  AuthThunkExtra,
} from './authState';

const createThunk = createAsyncThunk.withTypes<{
  state: AuthRootState;
  extra: AuthThunkExtra;
  rejectValue: AuthThunkError;
}>();

export function toAuthThunkError(error: unknown): AuthThunkError {
  if (error instanceof AuthValidationError) {
    return { message: error.message, fieldErrors: error.errors };
  }
  return {
    message: error instanceof Error ? error.message : 'Something went wrong',
  };
}

export const signIn = createThunk<AuthSession, SignInCredentials>(
  'auth/signIn',
  async (credentials, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.signIn(credentials);
    } catch (error) {
      return rejectWithValue(toAuthThunkError(error));
    }
  },
);

/** A successful sign up also signs the new user in. */
export const signUp = createThunk<AuthSession, SignUpData>(
  'auth/signUp',
  async (data, { extra, rejectWithValue }) => {
    try {
      return await extra.authRepository.signUp(data);
    } catch (error) {
      return rejectWithValue(toAuthThunkError(error));
    }
  },
);

/**
 * Always ends the local session. Telling the backend is best effort: a failure
 * there must not leave the user stuck in the app.
 */
export const signOut = createThunk<void, void>(
  'auth/signOut',
  async (_, { extra }) => {
    try {
      await extra.authRepository.signOut();
    } catch {
      // Intentionally ignored; see above.
    }
  },
);
