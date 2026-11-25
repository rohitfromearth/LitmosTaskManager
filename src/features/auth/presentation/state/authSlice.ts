import { createSlice } from '@reduxjs/toolkit';
import type { AuthRootState, AuthState } from './authState';
import { signIn, signOut, signUp } from './authThunks';

export const initialState: AuthState = {
  session: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Hides an error left over from an earlier attempt (for example when a screen opens). */
    authErrorCleared(state) {
      if (state.status === 'failed') {
        state.status = 'idle';
      }
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(signIn.pending, state => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(signUp.pending, state => {
        state.status = 'pending';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = 'idle';
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = 'idle';
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? {
          message: action.error.message ?? 'Something went wrong',
        };
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? {
          message: action.error.message ?? 'Something went wrong',
        };
      })
      .addCase(signOut.pending, state => {
        state.status = 'pending';
      })
      // Back to the initial state: no session, no error, nothing pending.
      .addCase(signOut.fulfilled, () => initialState);
  },
});

export const { authErrorCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectAuthState = (state: AuthRootState) => state.auth;
export const selectSession = (state: AuthRootState) => state.auth.session;
export const selectIsAuthenticated = (state: AuthRootState) =>
  state.auth.session !== null;
