/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { FakeDatabase } from '../../test-utils/FakeDatabase';
import {
  createMockRepository,
  emptySummary,
  makeTask,
} from '../../test-utils/mockTaskRepository';
import { MockAuthRepository } from '../../features/auth';
import App from '../App';
import { Alert, Text } from 'react-native';
import { createStatefulRepository } from '../../test-utils/statefulRepository';
import { byTestId, hasTestId, textsOf } from '../../test-utils/renderHelpers';
import { applyTaskChanges } from '../../features/tasks/domain/rules/taskRules';
import { initializeApp } from '../bootstrap/initializeApp';

// SafeAreaProvider renders nothing until the native side reports insets.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// These tests never load op-sqlite: startup is driven by fakes passed to App.

function fakeInitialize() {
  const repository = createMockRepository({
    getTasks: jest
      .fn()
      .mockResolvedValue([makeTask({ id: 'a' }), makeTask({ id: 'b' })]),
    getTaskSummary: jest.fn().mockResolvedValue({
      ...emptySummary,
      byStatus: { todo: 2, in_progress: 0, done: 0 },
      byPriority: { low: 0, medium: 2, high: 0, critical: 0 },
    }),
  });
  return () =>
    initializeApp({
      openDatabase: async () => new FakeDatabase(),
      createTaskRepository: async () => repository,
      authRepository: new MockAuthRepository({ latencyMs: 0 }),
    });
}

const rendered: ReactTestRenderer.ReactTestRenderer[] = [];

// Unmount so navigation timers don't outlive the test.
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

async function render(initialize: () => Promise<unknown>) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <App initialize={initialize as never} />,
    );
  });
  rendered.push(renderer);
  return renderer;
}

/** Renders, then signs in with the demo credentials through the Sign In screen. */
async function renderSignedIn(initialize: () => Promise<unknown>) {
  const renderer = await render(initialize);
  await signInWithDemo(renderer);
  return renderer;
}

async function signInWithDemo(renderer: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {
    byTestId(renderer, 'use-demo-credentials')[0].props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    byTestId(renderer, 'signin-submit')[0].props.onPress();
  });
}

test('shows a loading screen while startup is in progress', async () => {
  const renderer = await render(() => new Promise(() => {}));
  expect(hasTestId(renderer, 'startup-loading')).toBe(true);
  expect(hasTestId(renderer, 'startup-error')).toBe(false);
});

test('mounts the navigation with the initial data once startup succeeds', async () => {
  const renderer = await renderSignedIn(fakeInitialize());

  expect(hasTestId(renderer, 'startup-loading')).toBe(false);
  const text = textsOf(renderer);
  expect(text).toContain('2 tasks');
  expect(text).toContain('Write report');
  expect(hasTestId(renderer, 'add-task-button')).toBe(true);
});

test('shows the error and a retry button when startup fails, and recovers on retry', async () => {
  const succeed = fakeInitialize();
  const initialize = jest
    .fn()
    .mockRejectedValueOnce(new Error('Database is locked'))
    .mockImplementation(succeed);

  const renderer = await render(initialize);
  expect(hasTestId(renderer, 'startup-error')).toBe(true);
  expect(textsOf(renderer)).toContain('Database is locked');

  const retry = renderer.root.find(
    node => node.props.testID === 'startup-retry',
  );
  await ReactTestRenderer.act(async () => {
    retry.props.onPress();
  });

  expect(initialize).toHaveBeenCalledTimes(2);
  expect(hasTestId(renderer, 'startup-error')).toBe(false);
  await signInWithDemo(renderer);
  expect(textsOf(renderer)).toContain('2 tasks');
});

test('does not update state if unmounted before startup finishes', async () => {
  let resolve!: (store: unknown) => void;
  const pending = new Promise(res => {
    resolve = res;
  });
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const renderer = await render(() => pending);
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
    resolve(await fakeInitialize()());
  });

  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

describe('adding a task', () => {
  /** A repository that really stores what is created, newest first. */
  function statefulInitialize() {
    let stored = [makeTask({ id: 'existing', title: 'Existing task' })];
    const repository = createMockRepository({
      getTasks: jest.fn(async () => stored),
      createTask: jest.fn(async input => {
        const created = makeTask({ id: 'new', ...input });
        stored = [created, ...stored];
        return created;
      }),
    });
    const initialize = () =>
      initializeApp({
        openDatabase: async () => new FakeDatabase(),
        createTaskRepository: async () => repository,
        authRepository: new MockAuthRepository({ latencyMs: 0 }),
      });
    return { repository, initialize };
  }

  const fire = (
    renderer: ReactTestRenderer.ReactTestRenderer,
    id: string,
    prop: string,
    ...args: unknown[]
  ) =>
    ReactTestRenderer.act(async () => {
      byTestId(renderer, id)[0].props[prop](...args);
    });

  it('opens the form from the Add task button, saves, and returns to the list showing the new task', async () => {
    const { repository, initialize } = statefulInitialize();
    const renderer = await renderSignedIn(initialize);
    expect(hasTestId(renderer, 'task-form')).toBe(false);
    expect(textsOf(renderer)).toContain('1 task');

    await fire(renderer, 'add-task-button', 'onPress');
    expect(hasTestId(renderer, 'task-form')).toBe(true);

    await fire(renderer, 'field-title-input', 'onChangeText', 'Brand new task');
    await fire(
      renderer,
      'field-assignedTo-input',
      'onChangeText',
      'Asha Verma',
    );
    await fire(renderer, 'task-form-submit', 'onPress');

    expect(repository.createTask).toHaveBeenCalledTimes(1);
    expect(hasTestId(renderer, 'task-form')).toBe(false);
    const texts = textsOf(renderer);
    expect(texts).toContain('2 tasks');
    expect(texts).toContain('Brand new task');
  });

  it('stays on the form with an error when saving fails, then succeeds on retry', async () => {
    const { repository, initialize } = statefulInitialize();
    const realCreate = repository.createTask.getMockImplementation()!;
    repository.createTask.mockRejectedValueOnce(new Error('disk full'));
    repository.createTask.mockImplementation(realCreate);

    const renderer = await renderSignedIn(initialize);
    await fire(renderer, 'add-task-button', 'onPress');
    await fire(renderer, 'field-title-input', 'onChangeText', 'Retry me');
    await fire(renderer, 'field-assignedTo-input', 'onChangeText', 'Sam');

    await fire(renderer, 'task-form-submit', 'onPress');
    expect(hasTestId(renderer, 'task-form-error')).toBe(true);
    expect(hasTestId(renderer, 'task-form')).toBe(true);

    await fire(renderer, 'task-form-submit', 'onPress');
    expect(hasTestId(renderer, 'task-form')).toBe(false);
    expect(textsOf(renderer)).toContain('Retry me');
  });
});

describe('viewing and editing a task', () => {
  /** A repository that really stores and updates tasks. */
  function statefulInitialize() {
    let stored = [
      makeTask({ id: 'one', title: 'First task', assignedTo: 'Asha' }),
      makeTask({ id: 'two', title: 'Second task', assignedTo: 'Sam' }),
    ];
    const repository = createMockRepository({
      getTasks: jest.fn(async () => stored),
      getTaskById: jest.fn(
        async (id: string) => stored.find(t => t.id === id) ?? null,
      ),
      updateTask: jest.fn(async (id: string, changes) => {
        const current = stored.find(t => t.id === id)!;
        const updated = applyTaskChanges(
          current,
          changes,
          '2026-12-01T10:00:00.000Z',
        );
        stored = stored.map(t => (t.id === id ? updated : t));
        return updated;
      }),
    });
    const initialize = () =>
      initializeApp({
        openDatabase: async () => new FakeDatabase(),
        createTaskRepository: async () => repository,
        authRepository: new MockAuthRepository({ latencyMs: 0 }),
      });
    return { repository, initialize };
  }

  const fire = (
    renderer: ReactTestRenderer.ReactTestRenderer,
    id: string,
    prop: string,
    ...args: unknown[]
  ) =>
    ReactTestRenderer.act(async () => {
      byTestId(renderer, id)[0].props[prop](...args);
    });

  // The pressable composites of the cards (the host nodes have no onPress).
  const pressableCards = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    byTestId(renderer, 'task-card').filter(
      node => typeof node.props.onPress === 'function',
    );

  const detailsTexts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    byTestId(renderer, 'task-details')[0]
      .findAllByType(Text)
      .map(node => [node.props.children].flat().join(''));

  it('opens the pressed task, edits it, saves, and returns to the updated details', async () => {
    const { repository, initialize } = statefulInitialize();
    const renderer = await renderSignedIn(initialize);
    expect(hasTestId(renderer, 'task-details')).toBe(false);

    // Second card in the list -> its details.
    const cards = pressableCards(renderer);
    await ReactTestRenderer.act(async () => cards[1].props.onPress());
    expect(repository.getTaskById).toHaveBeenCalledWith('two');
    expect(detailsTexts(renderer)).toContain('Second task');
    expect(textsOf(renderer)).toContain('Delete');

    // Edit -> prefilled form.
    await fire(renderer, 'task-details-edit', 'onPress');
    expect(byTestId(renderer, 'field-title-input')[0].props.value).toBe(
      'Second task',
    );
    expect(byTestId(renderer, 'field-assignedTo-input')[0].props.value).toBe(
      'Sam',
    );

    // Change and save -> back on the details with the new title.
    await fire(renderer, 'field-title-input', 'onChangeText', 'Second task v2');
    await fire(renderer, 'task-form-submit', 'onPress');

    expect(repository.updateTask).toHaveBeenCalledWith('two', {
      title: 'Second task v2',
    });
    expect(hasTestId(renderer, 'task-form')).toBe(false);
    expect(detailsTexts(renderer)).toContain('Second task v2');
  });

  it('keeps the form and shows the error when the update fails', async () => {
    const { repository, initialize } = statefulInitialize();
    repository.updateTask.mockRejectedValueOnce(new Error('disk full'));
    const renderer = await renderSignedIn(initialize);

    await ReactTestRenderer.act(async () =>
      pressableCards(renderer)[0].props.onPress(),
    );
    await fire(renderer, 'task-details-edit', 'onPress');
    await fire(renderer, 'field-title-input', 'onChangeText', 'Changed');
    await fire(renderer, 'task-form-submit', 'onPress');

    expect(hasTestId(renderer, 'task-form-error')).toBe(true);
    expect(byTestId(renderer, 'field-title-input')[0].props.value).toBe(
      'Changed',
    );
    expect(detailsTexts(renderer)).toContain('First task');
  });
});

describe('deleting a task', () => {
  function statefulInitialize() {
    const { repository, records } = createStatefulRepository([
      makeTask({ id: 'one', title: 'First task' }),
      makeTask({ id: 'two', title: 'Second task', status: 'done' }),
    ]);
    const initialize = () =>
      initializeApp({
        openDatabase: async () => new FakeDatabase(),
        createTaskRepository: async () => repository,
        authRepository: new MockAuthRepository({ latencyMs: 0 }),
      });
    return { repository, records, initialize };
  }

  const fire = (renderer: ReactTestRenderer.ReactTestRenderer, id: string) =>
    ReactTestRenderer.act(async () => {
      byTestId(renderer, id)[0].props.onPress();
    });

  const openFirstTask = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    ReactTestRenderer.act(async () =>
      byTestId(renderer, 'task-card')
        .filter(node => typeof node.props.onPress === 'function')[0]
        .props.onPress(),
    );

  const confirm = (alert: jest.SpyInstance, text: string) =>
    ReactTestRenderer.act(async () => {
      const buttons = alert.mock.calls.at(-1)![2] as {
        text: string;
        onPress: () => void;
      }[];
      buttons.find(b => b.text === text)!.onPress();
    });

  afterEach(() => jest.restoreAllMocks());

  it('confirms, soft-deletes, returns to the list and updates the count', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { repository, records, initialize } = statefulInitialize();
    const renderer = await renderSignedIn(initialize);
    expect(textsOf(renderer)).toContain('2 tasks');

    await openFirstTask(renderer);
    expect(hasTestId(renderer, 'task-details')).toBe(true);

    await fire(renderer, 'task-details-delete');
    expect(alert).toHaveBeenCalledTimes(1);
    expect(repository.deleteTask).not.toHaveBeenCalled();

    await confirm(alert, 'Delete');

    expect(repository.deleteTask).toHaveBeenCalledWith('one');
    expect(hasTestId(renderer, 'task-details')).toBe(false);
    const texts = textsOf(renderer);
    expect(texts).toContain('1 task');
    expect(texts).not.toContain('First task');
    expect(texts).toContain('Second task');
    // The record is kept, flagged as deleted.
    expect(records().find(t => t.id === 'one')?.isDeleted).toBe(true);
  });

  it('stays on the details when cancelled', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { repository, initialize } = statefulInitialize();
    const renderer = await renderSignedIn(initialize);

    await openFirstTask(renderer);
    await fire(renderer, 'task-details-delete');
    await confirm(alert, 'Cancel');

    expect(repository.deleteTask).not.toHaveBeenCalled();
    expect(hasTestId(renderer, 'task-details')).toBe(true);
    expect(textsOf(renderer)).toContain('2 tasks');
  });

  it('stays on the details with an error when deleting fails, then retries', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { repository, initialize } = statefulInitialize();
    repository.deleteTask.mockRejectedValueOnce(new Error('disk full'));
    const renderer = await renderSignedIn(initialize);

    await openFirstTask(renderer);
    await fire(renderer, 'task-details-delete');
    await confirm(alert, 'Delete');
    expect(hasTestId(renderer, 'task-details-delete-error')).toBe(true);
    expect(hasTestId(renderer, 'task-details')).toBe(true);
    expect(textsOf(renderer)).toContain('2 tasks');

    await fire(renderer, 'task-details-delete-error-action');
    expect(repository.deleteTask).toHaveBeenCalledTimes(2);
    expect(hasTestId(renderer, 'task-details')).toBe(false);
    expect(textsOf(renderer)).toContain('1 task');
  });
});

describe('filters and navigation', () => {
  function statefulInitialize() {
    const { repository } = createStatefulRepository([
      makeTask({ id: 'a', title: 'Alpha', status: 'todo' }),
      makeTask({ id: 'b', title: 'Beta', status: 'todo' }),
      makeTask({ id: 'c', title: 'Gamma', status: 'done' }),
    ]);
    const initialize = () =>
      initializeApp({
        openDatabase: async () => new FakeDatabase(),
        createTaskRepository: async () => repository,
        authRepository: new MockAuthRepository({ latencyMs: 0 }),
      });
    return { repository, initialize };
  }

  const press = (renderer: ReactTestRenderer.ReactTestRenderer, id: string) =>
    ReactTestRenderer.act(async () => {
      byTestId(renderer, id)[0].props.onPress();
    });

  const openFirstTask = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    ReactTestRenderer.act(async () =>
      byTestId(renderer, 'task-card')
        .filter(node => typeof node.props.onPress === 'function')[0]
        .props.onPress(),
    );

  afterEach(() => jest.restoreAllMocks());

  it('keeps the filter while viewing a task and after returning to the list', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { repository, initialize } = statefulInitialize();
    const renderer = await renderSignedIn(initialize);
    expect(textsOf(renderer)).toContain('3 tasks');

    await press(renderer, 'filter-status-todo');
    expect(textsOf(renderer)).toContain('2 tasks (filtered)');

    // Open a task, then delete it: the list comes back still filtered.
    await openFirstTask(renderer);
    expect(hasTestId(renderer, 'task-details')).toBe(true);
    await press(renderer, 'task-details-delete');
    await ReactTestRenderer.act(async () => {
      const buttons = alert.mock.calls.at(-1)![2] as {
        text: string;
        onPress: () => void;
      }[];
      buttons.find(b => b.text === 'Delete')!.onPress();
    });

    expect(hasTestId(renderer, 'task-details')).toBe(false);
    const texts = textsOf(renderer);
    expect(texts).toContain('1 task (filtered)');
    expect(texts).toContain('Beta');
    expect(texts).not.toContain('Gamma'); // still filtered to To Do
    expect(repository.getTasks).toHaveBeenLastCalledWith({ status: 'todo' });
    expect(
      byTestId(renderer, 'filter-status-todo')[0].props.accessibilityState
        .selected,
    ).toBe(true);
  });
});
