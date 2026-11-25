import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TasksRootState, ThunkExtra } from './tasksState';

// Typed against the feature's own state, so the feature never imports from `app`.
// The app's store satisfies these types.
export const useTasksDispatch =
  useDispatch.withTypes<
    ThunkDispatch<TasksRootState, ThunkExtra, UnknownAction>
  >();
export const useTasksSelector = useSelector.withTypes<TasksRootState>();
