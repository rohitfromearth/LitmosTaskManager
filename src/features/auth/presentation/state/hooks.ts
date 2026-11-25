import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthRootState, AuthThunkExtra } from './authState';

// Typed against the feature's own state, so the feature never imports from `app`.
// The app's store satisfies these types.
export const useAuthDispatch =
  useDispatch.withTypes<
    ThunkDispatch<AuthRootState, AuthThunkExtra, UnknownAction>
  >();
export const useAuthSelector = useSelector.withTypes<AuthRootState>();
