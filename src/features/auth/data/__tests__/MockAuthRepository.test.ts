import { DEMO_CREDENTIALS } from '../../domain/demoCredentials';
import { AuthError } from '../../domain/repositories/AuthRepository';
import { AuthValidationError } from '../../domain/rules/authValidation';
import { MockAuthRepository } from '../repositories/MockAuthRepository';

const repo = () => new MockAuthRepository({ latencyMs: 0 });

const newUser = {
  name: '  Asha Verma ',
  email: 'Asha@Example.com',
  password: 'Sup3rsecret',
};

describe('MockAuthRepository.signIn', () => {
  it('signs in with the demo credentials', async () => {
    const session = await repo().signIn(DEMO_CREDENTIALS);
    expect(session.user).toEqual({
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@litmos.com',
    });
  });

  it('marks the session as demonstration data and has no token or password', async () => {
    const session = await repo().signIn(DEMO_CREDENTIALS);
    expect(session.isDemo).toBe(true);
    expect(Object.keys(session).sort()).toEqual(['isDemo', 'user']);
    expect(JSON.stringify(session)).not.toContain(DEMO_CREDENTIALS.password);
  });

  it('matches the email ignoring case and surrounding spaces', async () => {
    const session = await repo().signIn({
      email: '  DEMO@Litmos.com ',
      password: DEMO_CREDENTIALS.password,
    });
    expect(session.user.id).toBe('demo-user');
  });

  it('rejects a wrong password with invalid_credentials', async () => {
    await expect(
      repo().signIn({ email: DEMO_CREDENTIALS.email, password: 'nope' }),
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'invalid_credentials',
      message: 'Incorrect email or password.',
    });
  });

  it('rejects an unknown email with the same error as a wrong password', async () => {
    const unknown = await repo()
      .signIn({ email: 'who@example.com', password: 'whatever1' })
      .catch(e => e);
    const wrong = await repo()
      .signIn({ email: DEMO_CREDENTIALS.email, password: 'wrong-pass' })
      .catch(e => e);
    expect(unknown).toBeInstanceOf(AuthError);
    expect(unknown.message).toBe(wrong.message);
    expect(unknown.code).toBe(wrong.code);
  });

  it('treats the password as case-sensitive', async () => {
    await expect(
      repo().signIn({
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password.toLowerCase(),
      }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('rejects missing fields with a validation error before checking credentials', async () => {
    const error = await repo()
      .signIn({ email: '', password: '' })
      .catch(e => e);
    expect(error).toBeInstanceOf(AuthValidationError);
    expect(error.errors.map((e: { field: string }) => e.field)).toEqual([
      'email',
      'password',
    ]);
  });
});

describe('MockAuthRepository.signUp', () => {
  it('creates the account and returns its signed-in session', async () => {
    const session = await repo().signUp(newUser);
    expect(session.user).toMatchObject({
      name: 'Asha Verma', // trimmed
      email: 'asha@example.com', // normalized
    });
    expect(session.user.id).toMatch(/^mock-user-/);
    expect(session.isDemo).toBe(true);
    expect(JSON.stringify(session)).not.toContain(newUser.password);
  });

  it('lets the new user sign in afterwards, with the right password only', async () => {
    const r = repo();
    await r.signUp(newUser);

    const session = await r.signIn({
      email: 'asha@example.com',
      password: newUser.password,
    });
    expect(session.user.name).toBe('Asha Verma');
    await expect(
      r.signIn({ email: 'asha@example.com', password: 'wrong-pass' }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('gives each new user a distinct id', async () => {
    const r = repo();
    const a = await r.signUp(newUser);
    const b = await r.signUp({ ...newUser, email: 'other@example.com' });
    expect(a.user.id).not.toBe(b.user.id);
  });

  it('rejects an email that is already registered, ignoring case', async () => {
    const r = repo();
    await r.signUp(newUser);
    await expect(
      r.signUp({ ...newUser, email: 'ASHA@example.com' }),
    ).rejects.toMatchObject({ code: 'email_in_use' });
  });

  it('rejects the demo email', async () => {
    await expect(
      repo().signUp({ ...newUser, email: DEMO_CREDENTIALS.email }),
    ).rejects.toMatchObject({ code: 'email_in_use' });
  });

  it('rejects invalid input with a validation error', async () => {
    const error = await repo()
      .signUp({ name: '', email: 'bad', password: 'short' })
      .catch(e => e);
    expect(error).toBeInstanceOf(AuthValidationError);
    expect(error.errors.map((e: { field: string }) => e.field)).toEqual([
      'name',
      'email',
      'password',
    ]);
  });

  it('keeps accounts per instance, so nothing is shared or persisted', async () => {
    await repo().signUp(newUser);
    await expect(
      repo().signIn({ email: 'asha@example.com', password: newUser.password }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});

describe('MockAuthRepository.signOut', () => {
  it('resolves', async () => {
    await expect(repo().signOut()).resolves.toBeUndefined();
  });
});

describe('latency', () => {
  it('waits for the configured delay', async () => {
    jest.useFakeTimers();
    try {
      let done = false;
      const request = new MockAuthRepository({ latencyMs: 300 })
        .signIn(DEMO_CREDENTIALS)
        .then(() => {
          done = true;
        });

      await jest.advanceTimersByTimeAsync(299);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await request;
      expect(done).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
