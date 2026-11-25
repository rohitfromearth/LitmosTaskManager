/** A person who can sign in. Never contains a password. */
export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Who is signed in. Deliberately has no token: whatever a real backend needs
 * to keep a session alive stays inside its repository implementation, so
 * screens and state never handle it.
 */
export interface AuthSession {
  user: User;
  /** True when the session comes from the mock repository, so the UI can say so. */
  isDemo: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

/** What the repository needs to create an account. */
export interface SignUpData {
  name: string;
  email: string;
  password: string;
}
