import ReactTestRenderer from 'react-test-renderer';
import {
  MockAuthRepository,
  selectAuthState,
  signOut,
} from '../../features/auth';
import { FakeDatabase } from '../../test-utils/FakeDatabase';
import {
  createMockRepository,
  makeTask,
} from '../../test-utils/mockTaskRepository';
import { byTestId, hasTestId, textsOf } from '../../test-utils/renderHelpers';
import App from '../App';
import { initializeApp } from '../bootstrap/initializeApp';
import type { AppStore } from '../store/createAppStore';

// SafeAreaProvider renders nothing until the native side reports insets.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

async function setup() {
  const repository = createMockRepository({
    getTasks: jest
      .fn()
      .mockResolvedValue([
        makeTask({ id: 'a', title: 'Alpha' }),
        makeTask({ id: 'b', title: 'Beta' }),
      ]),
  });
  let store!: AppStore;
  const initialize = async () => {
    store = await initializeApp({
      openDatabase: async () => new FakeDatabase(),
      createTaskRepository: async () => repository,
      authRepository: new MockAuthRepository({ latencyMs: 0 }),
    });
    return store;
  };

  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App initialize={initialize} />);
  });
  rendered.push(renderer);
  return { renderer, repository, getStore: () => store };
}

const press = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

const type = (renderer: Renderer, field: string, text: string) =>
  ReactTestRenderer.act(() => {
    byTestId(renderer, `${field}-input`)[0].props.onChangeText(text);
  });

const showsSignIn = (r: Renderer) => hasTestId(r, 'sign-in-screen');
const showsSignUp = (r: Renderer) => hasTestId(r, 'sign-up-screen');
const showsTasks = (r: Renderer) => hasTestId(r, 'add-task-button');

async function signInWithDemo(renderer: Renderer) {
  await press(renderer, 'use-demo-credentials');
  await press(renderer, 'signin-submit');
}

describe('when signed out', () => {
  it('starts on Sign In and shows none of the task screens', async () => {
    const { renderer } = await setup();

    expect(showsSignIn(renderer)).toBe(true);
    expect(showsTasks(renderer)).toBe(false);
    expect(hasTestId(renderer, 'task-list')).toBe(false);
    expect(hasTestId(renderer, 'task-filter-bar')).toBe(false);
    expect(textsOf(renderer)).not.toContain('Alpha');
  });

  it('shows the demo credentials on the Sign In screen', async () => {
    const { renderer } = await setup();
    const texts = textsOf(renderer).join(' | ');
    expect(texts).toContain('demo@litmos.com');
    expect(texts).toContain('Litmos@123');
  });

  it('opens Sign Up from Sign In and comes back', async () => {
    const { renderer } = await setup();

    await press(renderer, 'go-to-signup');
    expect(showsSignUp(renderer)).toBe(true);
    expect(showsTasks(renderer)).toBe(false);

    await press(renderer, 'go-to-signin');
    expect(showsSignIn(renderer)).toBe(true);
  });

  it('stays on Sign In with an error for invalid credentials', async () => {
    const { renderer, getStore } = await setup();
    await type(renderer, 'signin-email', 'demo@litmos.com');
    await type(renderer, 'signin-password', 'wrong-password');
    await press(renderer, 'signin-submit');

    expect(showsSignIn(renderer)).toBe(true);
    expect(showsTasks(renderer)).toBe(false);
    expect(textsOf(renderer)).toContain('Incorrect email or password.');
    expect(getStore().getState().auth.session).toBeNull();
  });

  it("doesn't show a Sign Up error on Sign In after going back", async () => {
    const { renderer } = await setup();
    await press(renderer, 'go-to-signup');
    await type(renderer, 'signup-name', 'Demo Again');
    await type(renderer, 'signup-email', 'demo@litmos.com');
    await type(renderer, 'signup-password', 'Sup3rsecret');
    await type(renderer, 'signup-confirmPassword', 'Sup3rsecret');
    await press(renderer, 'signup-submit');
    expect(hasTestId(renderer, 'sign-up-error')).toBe(true);

    await press(renderer, 'go-to-signin');

    expect(showsSignIn(renderer)).toBe(true);
    expect(hasTestId(renderer, 'sign-up-error')).toBe(false);
    expect(hasTestId(renderer, 'sign-in-error')).toBe(false);
  });
});

describe('when signed in', () => {
  it('shows the task list after a demo sign-in, and no authentication screens', async () => {
    const { renderer, getStore } = await setup();
    await signInWithDemo(renderer);

    expect(showsTasks(renderer)).toBe(true);
    expect(showsSignIn(renderer)).toBe(false);
    expect(showsSignUp(renderer)).toBe(false);
    const texts = textsOf(renderer);
    expect(texts).toContain('2 tasks');
    expect(texts).toContain('Alpha');
    expect(getStore().getState().auth.session?.user.email).toBe(
      'demo@litmos.com',
    );
  });

  it('shows the task list after a successful sign-up', async () => {
    const { renderer, getStore } = await setup();
    await press(renderer, 'go-to-signup');
    await type(renderer, 'signup-name', 'Asha Verma');
    await type(renderer, 'signup-email', 'asha@example.com');
    await type(renderer, 'signup-password', 'Sup3rsecret');
    await type(renderer, 'signup-confirmPassword', 'Sup3rsecret');
    await press(renderer, 'signup-submit');

    expect(showsTasks(renderer)).toBe(true);
    expect(showsSignUp(renderer)).toBe(false);
    expect(showsSignIn(renderer)).toBe(false);
    expect(getStore().getState().auth.session?.user.name).toBe('Asha Verma');
  });

  it('keeps the existing task navigation working', async () => {
    const { renderer } = await setup();
    await signInWithDemo(renderer);

    await press(renderer, 'add-task-button');
    expect(hasTestId(renderer, 'task-form')).toBe(true);
    expect(showsSignIn(renderer)).toBe(false);
  });

  it('offers Sign out on the task list', async () => {
    const { renderer } = await setup();
    await signInWithDemo(renderer);
    expect(hasTestId(renderer, 'sign-out-button')).toBe(true);
  });
});

describe('logging out', () => {
  it('returns to Sign In, removes the task screens and resets the auth state', async () => {
    const { renderer, getStore } = await setup();
    await signInWithDemo(renderer);
    expect(showsTasks(renderer)).toBe(true);

    await press(renderer, 'sign-out-button');

    expect(showsSignIn(renderer)).toBe(true);
    expect(showsTasks(renderer)).toBe(false);
    expect(hasTestId(renderer, 'sign-out-button')).toBe(false);
    expect(textsOf(renderer)).not.toContain('Alpha');
    expect(getStore().getState().auth).toEqual({
      session: null,
      status: 'idle',
      error: null,
    });
  });

  it('returns to an empty Sign In form, without the previous password', async () => {
    const { renderer } = await setup();
    await signInWithDemo(renderer);
    await press(renderer, 'sign-out-button');

    expect(byTestId(renderer, 'signin-email-input')[0].props.value).toBe('');
    expect(byTestId(renderer, 'signin-password-input')[0].props.value).toBe('');
  });

  it('leaves from any screen: signing out while on a task screen shows Sign In', async () => {
    const { renderer, getStore } = await setup();
    await signInWithDemo(renderer);
    await press(renderer, 'add-task-button');
    expect(hasTestId(renderer, 'task-form')).toBe(true);

    await ReactTestRenderer.act(async () => {
      await getStore().dispatch(signOut());
    });

    expect(showsSignIn(renderer)).toBe(true);
    expect(hasTestId(renderer, 'task-form')).toBe(false);
    expect(showsTasks(renderer)).toBe(false);
  });

  it('can sign in again afterwards', async () => {
    const { renderer, getStore } = await setup();
    await signInWithDemo(renderer);
    await press(renderer, 'sign-out-button');
    expect(selectAuthState(getStore().getState()).session).toBeNull();

    await signInWithDemo(renderer);
    expect(showsTasks(renderer)).toBe(true);
    expect(showsSignIn(renderer)).toBe(false);
  });

  it('keeps a sign-up account for the rest of the run, so it can sign in again', async () => {
    const { renderer } = await setup();
    await press(renderer, 'go-to-signup');
    await type(renderer, 'signup-name', 'Asha Verma');
    await type(renderer, 'signup-email', 'asha@example.com');
    await type(renderer, 'signup-password', 'Sup3rsecret');
    await type(renderer, 'signup-confirmPassword', 'Sup3rsecret');
    await press(renderer, 'signup-submit');
    await press(renderer, 'sign-out-button');

    await type(renderer, 'signin-email', 'asha@example.com');
    await type(renderer, 'signin-password', 'Sup3rsecret');
    await press(renderer, 'signin-submit');
    expect(showsTasks(renderer)).toBe(true);
  });
});
