import { DEMO_CREDENTIALS, DEMO_USER_NAME } from '../../domain/demoCredentials';
import type {
  AuthSession,
  SignInCredentials,
  SignUpData,
  User,
} from '../../domain/entities/Auth';
import {
  AuthError,
  type AuthRepository,
} from '../../domain/repositories/AuthRepository';
import {
  AuthValidationError,
  normalizeEmail,
  validateSignIn,
  validateSignUp,
} from '../../domain/rules/authValidation';

interface MockAuthOptions {
  /** Pretend network delay in ms, so loading states are visible. Use 0 in tests. */
  latencyMs?: number;
}

interface Account {
  user: User;
  /** Held in memory only, for this object's lifetime; never written anywhere. */
  password: string;
}

/**
 * DEMONSTRATION ONLY. Accepts the demo credentials and any account created
 * with sign-up during the current run. It has no server, issues no token and
 * provides no security; accounts disappear when the app restarts.
 *
 * A real implementation replaces this class where it is created (`Root.tsx`)
 * and must map its backend's responses to `AuthSession`, `AuthError` and
 * `AuthValidationError`.
 */
export class MockAuthRepository implements AuthRepository {
  private readonly accounts = new Map<string, Account>();
  private readonly latencyMs: number;
  private nextId = 1;

  constructor({ latencyMs = 500 }: MockAuthOptions = {}) {
    this.latencyMs = latencyMs;
    this.accounts.set(normalizeEmail(DEMO_CREDENTIALS.email), {
      user: {
        id: 'demo-user',
        name: DEMO_USER_NAME,
        email: DEMO_CREDENTIALS.email,
      },
      password: DEMO_CREDENTIALS.password,
    });
  }

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    await this.delay();
    const errors = validateSignIn(credentials);
    if (errors.length > 0) {
      throw new AuthValidationError(errors);
    }

    const account = this.accounts.get(normalizeEmail(credentials.email));
    // Same message for an unknown email and a wrong password.
    if (!account || account.password !== credentials.password) {
      throw new AuthError(
        'invalid_credentials',
        'Incorrect email or password.',
      );
    }
    return { user: account.user, isDemo: true };
  }

  async signUp(data: SignUpData): Promise<AuthSession> {
    await this.delay();
    const errors = validateSignUp({ ...data, confirmPassword: data.password });
    if (errors.length > 0) {
      throw new AuthValidationError(errors);
    }

    const email = normalizeEmail(data.email);
    if (this.accounts.has(email)) {
      throw new AuthError(
        'email_in_use',
        'An account with this email already exists.',
      );
    }

    const user: User = {
      id: `mock-user-${this.nextId++}`,
      name: data.name.trim(),
      email,
    };
    this.accounts.set(email, { user, password: data.password });
    return { user, isDemo: true };
  }

  async signOut(): Promise<void> {
    await this.delay();
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, this.latencyMs));
  }
}
