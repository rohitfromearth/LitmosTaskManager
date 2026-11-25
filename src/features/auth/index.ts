// Public API of the auth feature. Nothing outside this folder imports from its
// subfolders, and this feature never imports from `tasks` or `app`.
export { DEMO_CREDENTIALS } from './domain/demoCredentials';
export type {
  AuthSession,
  SignInCredentials,
  SignUpData,
  User,
} from './domain/entities/Auth';
export {
  AuthError,
  type AuthErrorCode,
  type AuthRepository,
} from './domain/repositories/AuthRepository';
export {
  AuthValidationError,
  type AuthFieldError,
} from './domain/rules/authValidation';
export { MockAuthRepository } from './data/repositories/MockAuthRepository';
export { SignInScreen } from './presentation/screens/SignInScreen';
export { SignUpScreen } from './presentation/screens/SignUpScreen';
export { SignOutButton } from './presentation/components/SignOutButton';
export {
  authErrorCleared,
  authReducer,
  selectAuthState,
  selectIsAuthenticated,
  selectSession,
} from './presentation/state/authSlice';
export { signIn, signOut, signUp } from './presentation/state/authThunks';
export type {
  AuthRootState,
  AuthState,
  AuthThunkError,
  AuthThunkExtra,
} from './presentation/state/authState';
