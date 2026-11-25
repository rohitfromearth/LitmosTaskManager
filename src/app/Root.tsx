/**
 * @format
 */

import { MockAuthRepository } from '../features/auth';
import { createTaskRepository } from '../features/tasks';
import { openDatabase } from '../services/database/database';
import App from './App';
import { initializeApp } from './bootstrap/initializeApp';

// The only place the real (native) SQLite connection and the auth backend are
// wired in. Tests render `App` with their own `initialize` instead of importing
// this file. Swap `MockAuthRepository` for a real implementation here. It is
// created once so demo accounts survive a startup retry.
const authRepository = new MockAuthRepository();
const initialize = () =>
  initializeApp({ openDatabase, createTaskRepository, authRepository });

function Root() {
  return <App initialize={initialize} />;
}

export default Root;
