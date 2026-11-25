import type { SignInCredentials } from './entities/Auth';

/**
 * Public demonstration credentials, accepted by the mock repository and shown
 * on the Sign In screen. They protect nothing. Delete this file, the hint prop
 * and the mock when real authentication replaces them.
 */
export const DEMO_CREDENTIALS: Readonly<SignInCredentials> = {
  email: 'demo@litmos.com',
  password: 'Litmos@123',
};

export const DEMO_USER_NAME = 'Demo User';
