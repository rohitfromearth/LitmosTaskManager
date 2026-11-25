import type {
  AuthSession,
  SignInCredentials,
  SignUpData,
} from '../entities/Auth';

export type AuthErrorCode = 'invalid_credentials' | 'email_in_use' | 'unknown';

/**
 * The only error an implementation reports besides `AuthValidationError`.
 * An implementation turns whatever its backend returns (HTTP statuses, error
 * bodies) into one of these codes with a message safe to show to the user, so
 * screens never see backend-specific responses.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Authentication operations. Implementations validate input with the rules in
 * `domain/rules`, and reject with `AuthValidationError` or `AuthError`.
 */
export interface AuthRepository {
  /** Resolves with the session for valid credentials; rejects with `invalid_credentials` otherwise. */
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  /** Creates the account and resolves with its (already signed-in) session; rejects with `email_in_use` for a taken email. */
  signUp(data: SignUpData): Promise<AuthSession>;
  /** Ends the session on the implementation's side. */
  signOut(): Promise<void>;
}
