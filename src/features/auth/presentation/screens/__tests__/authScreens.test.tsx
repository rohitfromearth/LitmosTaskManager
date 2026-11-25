import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  createMockRepository,
  deferred,
} from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import { MockAuthRepository } from '../../../data/repositories/MockAuthRepository';
import { DEMO_CREDENTIALS } from '../../../domain/demoCredentials';
import type { AuthSession } from '../../../domain/entities/Auth';
import { selectAuthState, selectIsAuthenticated } from '../../state/authSlice';
import { signIn } from '../../state/authThunks';
import { SignInScreen } from '../SignInScreen';
import { SignUpScreen } from '../SignUpScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
  jest.restoreAllMocks();
});

function makeStore() {
  const auth = new MockAuthRepository({ latencyMs: 0 });
  const store = createAppStore(createMockRepository(), auth);
  return { auth, store };
}

async function mount(
  store: ReturnType<typeof makeStore>['store'],
  element: React.ReactElement,
) {
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>{element}</Provider>,
    );
  });
  rendered.push(renderer);
  return renderer;
}

const type = (renderer: Renderer, field: string, text: string) =>
  ReactTestRenderer.act(() => {
    byTestId(renderer, `${field}-input`)[0].props.onChangeText(text);
  });

const press = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

const valueOf = (renderer: Renderer, field: string) =>
  byTestId(renderer, `${field}-input`)[0].props.value;

const errorOf = (renderer: Renderer, field: string): string | undefined =>
  byTestId(renderer, `${field}-error`)[0]?.props.children;

describe('SignInScreen', () => {
  async function setup(withDemo = true) {
    const { auth, store } = makeStore();
    const onGoToSignUp = jest.fn();
    const renderer = await mount(
      store,
      <SignInScreen
        onGoToSignUp={onGoToSignUp}
        demoCredentials={withDemo ? DEMO_CREDENTIALS : undefined}
      />,
    );
    return { auth, store, renderer, onGoToSignUp };
  }

  describe('demo credentials', () => {
    it('shows the demo email and password clearly', async () => {
      const { renderer } = await setup();
      expect(hasTestId(renderer, 'demo-credentials')).toBe(true);
      const texts = textsOf(renderer).join(' | ');
      expect(texts).toContain('Email: demo@litmos.com');
      expect(texts).toContain('Password: Litmos@123');
      expect(texts).toContain('Demo mode');
    });

    it('fills both fields when asked', async () => {
      const { renderer } = await setup();
      expect(valueOf(renderer, 'signin-email')).toBe('');

      await press(renderer, 'use-demo-credentials');

      expect(valueOf(renderer, 'signin-email')).toBe('demo@litmos.com');
      expect(valueOf(renderer, 'signin-password')).toBe('Litmos@123');
    });

    it('clears validation errors when the demo credentials are filled in', async () => {
      const { renderer } = await setup();
      await press(renderer, 'signin-submit');
      expect(errorOf(renderer, 'signin-email')).toBeDefined();

      await press(renderer, 'use-demo-credentials');
      expect(errorOf(renderer, 'signin-email')).toBeUndefined();
      expect(errorOf(renderer, 'signin-password')).toBeUndefined();
    });

    it('is hidden when no demo credentials are given (as with a real backend)', async () => {
      const { renderer } = await setup(false);
      expect(hasTestId(renderer, 'demo-credentials')).toBe(false);
      expect(hasTestId(renderer, 'use-demo-credentials')).toBe(false);
      expect(textsOf(renderer).join(' ')).not.toContain('Litmos@123');
    });

    it('masks the password field', async () => {
      const { renderer } = await setup();
      expect(
        byTestId(renderer, 'signin-password-input')[0].props.secureTextEntry,
      ).toBe(true);
    });
  });

  describe('validation', () => {
    it('requires email and password and does not call the backend', async () => {
      const { renderer, auth, store } = await setup();
      const signInSpy = jest.spyOn(auth, 'signIn');
      await press(renderer, 'signin-submit');

      expect(errorOf(renderer, 'signin-email')).toBe('Email is required');
      expect(errorOf(renderer, 'signin-password')).toBe('Password is required');
      expect(signInSpy).not.toHaveBeenCalled();
      expect(selectAuthState(store.getState()).status).toBe('idle');
    });

    it('rejects a malformed email', async () => {
      const { renderer, auth } = await setup();
      const signInSpy = jest.spyOn(auth, 'signIn');
      await type(renderer, 'signin-email', 'not-an-email');
      await type(renderer, 'signin-password', 'x');
      await press(renderer, 'signin-submit');

      expect(errorOf(renderer, 'signin-email')).toBe(
        'Enter a valid email address',
      );
      expect(signInSpy).not.toHaveBeenCalled();
    });

    it('clears a field error when that field is edited', async () => {
      const { renderer } = await setup();
      await press(renderer, 'signin-submit');
      await type(renderer, 'signin-email', 'a');
      expect(errorOf(renderer, 'signin-email')).toBeUndefined();
      expect(errorOf(renderer, 'signin-password')).toBeDefined();
    });
  });

  describe('signing in', () => {
    it('signs in with the demo credentials', async () => {
      const { renderer, store } = await setup();
      await press(renderer, 'use-demo-credentials');
      await press(renderer, 'signin-submit');

      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(store.getState().auth.session?.user.name).toBe('Demo User');
    });

    it('shows an error for wrong credentials, keeps the input and stays signed out', async () => {
      const { renderer, store } = await setup();
      await type(renderer, 'signin-email', 'demo@litmos.com');
      await type(renderer, 'signin-password', 'wrong-password');
      await press(renderer, 'signin-submit');

      expect(hasTestId(renderer, 'sign-in-error')).toBe(true);
      expect(textsOf(renderer)).toContain('Incorrect email or password.');
      expect(valueOf(renderer, 'signin-email')).toBe('demo@litmos.com');
      expect(valueOf(renderer, 'signin-password')).toBe('wrong-password');
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      // Usable again.
      expect(byTestId(renderer, 'signin-submit')[0].props.loading).toBe(false);
    });

    it('rejects an unknown email the same way as a wrong password', async () => {
      const { renderer } = await setup();
      await type(renderer, 'signin-email', 'nobody@example.com');
      await type(renderer, 'signin-password', 'Litmos@123');
      await press(renderer, 'signin-submit');
      expect(textsOf(renderer)).toContain('Incorrect email or password.');
    });

    it('hides the error when the user edits a field, and can then succeed', async () => {
      const { renderer, store } = await setup();
      await type(renderer, 'signin-email', 'demo@litmos.com');
      await type(renderer, 'signin-password', 'wrong');
      await press(renderer, 'signin-submit');
      expect(hasTestId(renderer, 'sign-in-error')).toBe(true);

      await type(renderer, 'signin-password', 'Litmos@123');
      expect(hasTestId(renderer, 'sign-in-error')).toBe(false);

      await press(renderer, 'signin-submit');
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it("doesn't show an error left over from before the screen opened", async () => {
      const { auth, store } = makeStore();
      await store.dispatch(
        signIn({ email: DEMO_CREDENTIALS.email, password: 'stale' }),
      );
      expect(auth).toBeDefined();
      expect(selectAuthState(store.getState()).status).toBe('failed');

      const renderer = await mount(
        store,
        <SignInScreen onGoToSignUp={jest.fn()} />,
      );
      expect(hasTestId(renderer, 'sign-in-error')).toBe(false);
      expect(selectAuthState(store.getState()).status).toBe('idle');
    });
  });

  describe('loading and duplicate submissions', () => {
    it('shows progress, locks the form and ignores repeated presses', async () => {
      const { renderer, auth, store } = await setup();
      const gate = deferred<AuthSession>();
      const signInSpy = jest
        .spyOn(auth, 'signIn')
        .mockReturnValue(gate.promise);
      await press(renderer, 'use-demo-credentials');

      await press(renderer, 'signin-submit');
      expect(textsOf(renderer)).toContain('Signing in…');
      expect(byTestId(renderer, 'signin-submit')[0].props.loading).toBe(true);
      expect(byTestId(renderer, 'signin-email-input')[0].props.editable).toBe(
        false,
      );
      expect(
        byTestId(renderer, 'signin-password-input')[0].props.editable,
      ).toBe(false);

      await press(renderer, 'signin-submit');
      await press(renderer, 'signin-submit');
      expect(signInSpy).toHaveBeenCalledTimes(1);

      await ReactTestRenderer.act(async () =>
        gate.resolve({
          user: { id: 'u', name: 'Demo User', email: 'demo@litmos.com' },
          isDemo: true,
        }),
      );
      expect(signInSpy).toHaveBeenCalledTimes(1);
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('ignores two presses made in the same instant', async () => {
      const { renderer, auth } = await setup();
      const signInSpy = jest.spyOn(auth, 'signIn');
      await press(renderer, 'use-demo-credentials');

      await ReactTestRenderer.act(async () => {
        const submit = byTestId(renderer, 'signin-submit')[0].props.onPress;
        submit();
        submit();
      });
      expect(signInSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('opens Sign Up', async () => {
    const { renderer, onGoToSignUp } = await setup();
    await press(renderer, 'go-to-signup');
    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
});

describe('SignUpScreen', () => {
  async function setup() {
    const { auth, store } = makeStore();
    const onGoToSignIn = jest.fn();
    const renderer = await mount(
      store,
      <SignUpScreen onGoToSignIn={onGoToSignIn} />,
    );
    return { auth, store, renderer, onGoToSignIn };
  }

  async function fillValid(renderer: Renderer) {
    await type(renderer, 'signup-name', 'Asha Verma');
    await type(renderer, 'signup-email', 'asha@example.com');
    await type(renderer, 'signup-password', 'Sup3rsecret');
    await type(renderer, 'signup-confirmPassword', 'Sup3rsecret');
  }

  describe('validation', () => {
    it('requires every field and does not call the backend', async () => {
      const { renderer, auth } = await setup();
      const signUpSpy = jest.spyOn(auth, 'signUp');
      await press(renderer, 'signup-submit');

      expect(errorOf(renderer, 'signup-name')).toBe('Name is required');
      expect(errorOf(renderer, 'signup-email')).toBe('Email is required');
      expect(errorOf(renderer, 'signup-password')).toBe('Password is required');
      expect(errorOf(renderer, 'signup-confirmPassword')).toBe(
        'Confirm your password',
      );
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('rejects a malformed email', async () => {
      const { renderer, auth } = await setup();
      const signUpSpy = jest.spyOn(auth, 'signUp');
      await fillValid(renderer);
      await type(renderer, 'signup-email', 'nope');
      await press(renderer, 'signup-submit');

      expect(errorOf(renderer, 'signup-email')).toBe(
        'Enter a valid email address',
      );
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('rejects a password that is too short', async () => {
      const { renderer, auth } = await setup();
      const signUpSpy = jest.spyOn(auth, 'signUp');
      await fillValid(renderer);
      await type(renderer, 'signup-password', 'short');
      await type(renderer, 'signup-confirmPassword', 'short');
      await press(renderer, 'signup-submit');

      expect(errorOf(renderer, 'signup-password')).toContain('at least 8');
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('rejects a confirmation that does not match', async () => {
      const { renderer, auth } = await setup();
      const signUpSpy = jest.spyOn(auth, 'signUp');
      await fillValid(renderer);
      await type(renderer, 'signup-confirmPassword', 'Different1');
      await press(renderer, 'signup-submit');

      expect(errorOf(renderer, 'signup-confirmPassword')).toBe(
        'Passwords do not match',
      );
      expect(errorOf(renderer, 'signup-password')).toBeUndefined();
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('masks both password fields', async () => {
      const { renderer } = await setup();
      for (const id of ['signup-password', 'signup-confirmPassword']) {
        expect(byTestId(renderer, `${id}-input`)[0].props.secureTextEntry).toBe(
          true,
        );
      }
    });

    it('clears a field error when that field is edited', async () => {
      const { renderer } = await setup();
      await press(renderer, 'signup-submit');
      await type(renderer, 'signup-name', 'A');
      expect(errorOf(renderer, 'signup-name')).toBeUndefined();
      expect(errorOf(renderer, 'signup-email')).toBeDefined();
    });
  });

  describe('signing up', () => {
    it('creates the account and signs the new user in', async () => {
      const { renderer, store, auth } = await setup();
      const signUpSpy = jest.spyOn(auth, 'signUp');
      await fillValid(renderer);
      await press(renderer, 'signup-submit');

      // The confirmation is checked in the form and not sent on.
      expect(signUpSpy).toHaveBeenCalledWith({
        name: 'Asha Verma',
        email: 'asha@example.com',
        password: 'Sup3rsecret',
      });
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(store.getState().auth.session?.user).toMatchObject({
        name: 'Asha Verma',
        email: 'asha@example.com',
      });
    });

    it('shows the repository error for a taken email and keeps the input', async () => {
      const { renderer, store } = await setup();
      await fillValid(renderer);
      await type(renderer, 'signup-email', 'demo@litmos.com');
      await press(renderer, 'signup-submit');

      expect(hasTestId(renderer, 'sign-up-error')).toBe(true);
      expect(textsOf(renderer)).toContain(
        'An account with this email already exists.',
      );
      expect(valueOf(renderer, 'signup-name')).toBe('Asha Verma');
      expect(valueOf(renderer, 'signup-password')).toBe('Sup3rsecret');
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });

    it('shows progress, locks the form and ignores repeated presses', async () => {
      const { renderer, auth } = await setup();
      const gate = deferred<AuthSession>();
      const signUpSpy = jest
        .spyOn(auth, 'signUp')
        .mockReturnValue(gate.promise);
      await fillValid(renderer);

      await press(renderer, 'signup-submit');
      expect(textsOf(renderer)).toContain('Creating account…');
      expect(byTestId(renderer, 'signup-submit')[0].props.loading).toBe(true);
      expect(byTestId(renderer, 'signup-name-input')[0].props.editable).toBe(
        false,
      );

      await press(renderer, 'signup-submit');
      await press(renderer, 'signup-submit');
      expect(signUpSpy).toHaveBeenCalledTimes(1);

      await ReactTestRenderer.act(async () =>
        gate.resolve({
          user: { id: 'u', name: 'Asha Verma', email: 'asha@example.com' },
          isDemo: true,
        }),
      );
    });

    it('goes back to Sign In', async () => {
      const { renderer, onGoToSignIn } = await setup();
      await press(renderer, 'go-to-signin');
      expect(onGoToSignIn).toHaveBeenCalledTimes(1);
    });

    it('clears its error when it closes, so Sign In underneath does not show it', async () => {
      const { renderer, store } = await setup();
      await fillValid(renderer);
      await type(renderer, 'signup-email', 'demo@litmos.com');
      await press(renderer, 'signup-submit');
      expect(selectAuthState(store.getState()).status).toBe('failed');

      await ReactTestRenderer.act(async () => renderer.unmount());
      rendered.length = 0;
      expect(selectAuthState(store.getState())).toMatchObject({
        status: 'idle',
        error: null,
      });
    });
  });
});
