import type { SignInCredentials, SignUpData } from '../entities/Auth';

// Project decisions, not requirements; safe to change.
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;

export type AuthField = 'name' | 'email' | 'password' | 'confirmPassword';

export interface AuthFieldError {
  field: AuthField;
  message: string;
}

export class AuthValidationError extends Error {
  readonly errors: AuthFieldError[];

  constructor(errors: AuthFieldError[]) {
    super(errors.map(e => `${e.field}: ${e.message}`).join('; '));
    this.name = 'AuthValidationError';
    this.errors = errors;
  }
}

export interface SignUpInput extends SignUpData {
  confirmPassword: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails are compared trimmed and lower-case. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailError(email: string): AuthFieldError | null {
  const value = email.trim();
  if (value.length === 0) {
    return { field: 'email', message: 'Email is required' };
  }
  if (!EMAIL_PATTERN.test(value)) {
    return { field: 'email', message: 'Enter a valid email address' };
  }
  return null;
}

/** Sign in only checks that both fields are filled in; it doesn't reveal the password rules. */
export function validateSignIn(input: SignInCredentials): AuthFieldError[] {
  const errors: AuthFieldError[] = [];
  const email = emailError(input.email);
  if (email) {
    errors.push(email);
  }
  if (input.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }
  return errors;
}

export function validateSignUp(input: SignUpInput): AuthFieldError[] {
  const errors: AuthFieldError[] = [];

  const name = input.name.trim();
  if (name.length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.push({
      field: 'name',
      message: `Name must be at most ${NAME_MAX_LENGTH} characters`,
    });
  }

  const email = emailError(input.email);
  if (email) {
    errors.push(email);
  }

  if (input.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });
  }

  if (input.confirmPassword.length === 0) {
    errors.push({
      field: 'confirmPassword',
      message: 'Confirm your password',
    });
  } else if (input.confirmPassword !== input.password) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
    });
  }

  return errors;
}
