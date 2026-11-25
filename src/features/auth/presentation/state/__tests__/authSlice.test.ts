import { createAppStore } from '../../../../../app/store/createAppStore';
import { createMockRepository } from '../../../../../test-utils/mockTaskRepository';
import { deferred } from '../../../../../test-utils/mockTaskRepository';
import { DEMO_CREDENTIALS } from '../../../domain/demoCredentials';
import type { AuthSession } from '../../../domain/entities/Auth';
import { MockAuthRepository } from '../../../data/repositories/MockAuthRepository';
import {
  authErrorCleared,
  initialState,
  selectAuthState,
  selectIsAuthenticated,
  selectSession,
} from '../authSlice';
import { signIn, signOut, signUp } from '../authThunks';

function setup() {
  const auth = new MockAuthRepository({ latencyMs: 0 });
  const store = createAppStore(createMockRepository(), auth);
  return { auth, store };
}

const newUser = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'Sup3rsecret',
};

describe('initial state', () => {
  it('starts signed out and idle', () => {
    const { store } = setup();
    expect(store.getState().auth).toEqual(initialState);
    expect(selectIsAuthenticated(store.getState())).toBe(false);
    expect(selectSession(store.getState())).toBeNull();
  });
});

describe('signIn', () => {
  it('goes pending, then stores the session for the demo credentials', async () => {
    const { store, auth } = setup();
    const gate = deferred<AuthSession>();
    jest.spyOn(auth, 'signIn').mockReturnValue(gate.promise);

    const request = store.dispatch(signIn(DEMO_CREDENTIALS));
    expect(selectAuthState(store.getState()).status).toBe('pending');
    expect(selectIsAuthenticated(store.getState())).toBe(false);

    gate.resolve({
      user: { id: 'demo-user', name: 'Demo User', email: 'demo@litmos.com' },
      isDemo: true,
    });
    await request;

    expect(selectAuthState(store.getState())).toEqual({
      session: {
        user: { id: 'demo-user', name: 'Demo User', email: 'demo@litmos.com' },
        isDemo: true,
      },
      status: 'idle',
      error: null,
    });
    expect(selectIsAuthenticated(store.getState())).toBe(true);
  });

  it('stays signed out with an error for invalid credentials', async () => {
    const { store } = setup();
    await store.dispatch(
      signIn({ email: DEMO_CREDENTIALS.email, password: 'wrong' }),
    );

    expect(selectAuthState(store.getState())).toEqual({
      session: null,
      status: 'failed',
      error: { message: 'Incorrect email or password.' },
    });
  });

  it('carries field errors from the repository', async () => {
    const { store } = setup();
    await store.dispatch(signIn({ email: '', password: '' }));

    const { error } = selectAuthState(store.getState());
    expect(error?.fieldErrors?.map(e => e.field)).toEqual([
      'email',
      'password',
    ]);
  });

  it('clears an earlier error when a new attempt starts and succeeds', async () => {
    const { store } = setup();
    await store.dispatch(
      signIn({ email: DEMO_CREDENTIALS.email, password: 'x' }),
    );
    expect(selectAuthState(store.getState()).status).toBe('failed');

    await store.dispatch(signIn(DEMO_CREDENTIALS));
    expect(selectAuthState(store.getState())).toMatchObject({
      status: 'idle',
      error: null,
    });
    expect(selectIsAuthenticated(store.getState())).toBe(true);
  });

  it('keeps only serializable data in the store', async () => {
    const { store } = setup();
    await store.dispatch(
      signIn({ email: DEMO_CREDENTIALS.email, password: 'x' }),
    );
    expect(() => JSON.stringify(store.getState().auth)).not.toThrow();
    expect(JSON.stringify(store.getState().auth)).not.toContain('"x"');
  });
});

describe('signUp', () => {
  it('stores the new user as the signed-in session', async () => {
    const { store } = setup();
    await store.dispatch(signUp(newUser));

    const { session, status, error } = selectAuthState(store.getState());
    expect(session?.user).toMatchObject({
      name: 'Asha Verma',
      email: 'asha@example.com',
    });
    expect(session?.isDemo).toBe(true);
    expect(status).toBe('idle');
    expect(error).toBeNull();
  });

  it('fails for a taken email and stays signed out', async () => {
    const { store } = setup();
    await store.dispatch(signUp({ ...newUser, email: DEMO_CREDENTIALS.email }));

    expect(selectAuthState(store.getState())).toMatchObject({
      session: null,
      status: 'failed',
      error: { message: 'An account with this email already exists.' },
    });
  });

  it('never keeps the password in state', async () => {
    const { store } = setup();
    await store.dispatch(signUp(newUser));
    expect(JSON.stringify(store.getState())).not.toContain(newUser.password);
  });
});

describe('signOut and the reset of auth state', () => {
  it('clears the session and returns to the initial state', async () => {
    const { store } = setup();
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    expect(selectIsAuthenticated(store.getState())).toBe(true);

    await store.dispatch(signOut());

    expect(store.getState().auth).toEqual(initialState);
    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });

  it('shows pending while signing out', async () => {
    const { store, auth } = setup();
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    const gate = deferred<void>();
    jest.spyOn(auth, 'signOut').mockReturnValue(gate.promise);

    const request = store.dispatch(signOut());
    expect(selectAuthState(store.getState()).status).toBe('pending');

    gate.resolve();
    await request;
    expect(selectAuthState(store.getState()).status).toBe('idle');
  });

  it('still signs out locally when the backend call fails', async () => {
    const { store, auth } = setup();
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    jest.spyOn(auth, 'signOut').mockRejectedValue(new Error('offline'));

    await store.dispatch(signOut());

    expect(selectIsAuthenticated(store.getState())).toBe(false);
    expect(store.getState().auth).toEqual(initialState);
  });

  it('lets the same user sign in again after signing out', async () => {
    const { store } = setup();
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    await store.dispatch(signOut());
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    expect(selectIsAuthenticated(store.getState())).toBe(true);
  });

  it('a new account created before signing out can sign in again', async () => {
    const { store } = setup();
    await store.dispatch(signUp(newUser));
    await store.dispatch(signOut());
    await store.dispatch(
      signIn({ email: newUser.email, password: newUser.password }),
    );
    expect(selectSession(store.getState())?.user.email).toBe(newUser.email);
  });
});

describe('authErrorCleared', () => {
  it('removes a failure and goes back to idle, leaving the session alone', async () => {
    const { store } = setup();
    await store.dispatch(
      signIn({ email: DEMO_CREDENTIALS.email, password: 'x' }),
    );
    store.dispatch(authErrorCleared());
    expect(store.getState().auth).toEqual(initialState);

    await store.dispatch(signIn(DEMO_CREDENTIALS));
    store.dispatch(authErrorCleared());
    expect(selectIsAuthenticated(store.getState())).toBe(true);
  });

  it("doesn't touch a request that is still pending", async () => {
    const { store, auth } = setup();
    const gate = deferred<AuthSession>();
    jest.spyOn(auth, 'signIn').mockReturnValue(gate.promise);
    const request = store.dispatch(signIn(DEMO_CREDENTIALS));

    store.dispatch(authErrorCleared());
    expect(selectAuthState(store.getState()).status).toBe('pending');

    gate.reject(new Error('x'));
    await request;
  });
});

describe('a store built without an auth backend', () => {
  it('fails to sign in with a clear message instead of crashing', async () => {
    const store = createAppStore(createMockRepository());
    await store.dispatch(signIn(DEMO_CREDENTIALS));
    expect(selectAuthState(store.getState())).toMatchObject({
      session: null,
      status: 'failed',
      error: { message: 'Authentication is not configured.' },
    });
  });
});
