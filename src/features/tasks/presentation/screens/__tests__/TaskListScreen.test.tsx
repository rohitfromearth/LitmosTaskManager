import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  createMockRepository,
  deferred,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  hostByTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import type { Task } from '../../../domain/entities/Task';
import { applyFilter } from '../../state/tasksSlice';
import { loadSummary, loadTasks } from '../../state/tasksThunks';
import { TaskListScreen } from '../TaskListScreen';

// SafeAreaProvider/insets need native values that don't exist in Jest.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const rendered: ReactTestRenderer.ReactTestRenderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

async function setup(
  overrides: Parameters<typeof createMockRepository>[0] = {},
  { preload = true } = {},
) {
  const repo = createMockRepository(overrides);
  const store = createAppStore(repo);
  if (preload) {
    await store.dispatch(loadTasks());
    await store.dispatch(loadSummary());
  }
  const onAddTask = jest.fn();
  const onOpenTask = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <TaskListScreen onAddTask={onAddTask} onOpenTask={onOpenTask} />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return { repo, store, renderer, onAddTask, onOpenTask };
}

const press = (renderer: ReactTestRenderer.ReactTestRenderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

const tasks = (n: number): Task[] =>
  Array.from({ length: n }, (_, i) =>
    makeTask({ id: `t${i}`, title: `Task ${i}` }),
  );

describe('TaskListScreen', () => {
  describe('with tasks', () => {
    it('renders a card per task and the task count', async () => {
      const { renderer } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(3)),
      });

      expect(hostByTestId(renderer, 'task-card').length).toBe(3);
      expect(textsOf(renderer)).toEqual(
        expect.arrayContaining(['Task 0', 'Task 1', 'Task 2', '3 tasks']),
      );
    });

    it('opens a task with its id when its card is pressed', async () => {
      const { renderer, onOpenTask } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(3)),
      });

      await press(renderer, 'task-card'); // first card
      expect(onOpenTask).toHaveBeenCalledTimes(1);
      expect(onOpenTask).toHaveBeenCalledWith('t0');
    });

    it('uses the singular for one task', async () => {
      const { renderer } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(1)),
      });
      expect(textsOf(renderer)).toContain('1 task');
    });

    it('marks the count as filtered when a filter is active', async () => {
      const { renderer, store } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(2)),
      });
      await ReactTestRenderer.act(async () => {
        await store.dispatch(applyFilter({ status: 'todo' }));
      });
      expect(textsOf(renderer)).toContain('2 tasks (filtered)');
    });
  });

  describe('loading', () => {
    it('shows a loading indicator before the first load finishes', async () => {
      const gate = deferred<Task[]>();
      const { renderer, store } = await setup(
        { getTasks: jest.fn().mockReturnValue(gate.promise) },
        { preload: false },
      );
      ReactTestRenderer.act(() => {
        store.dispatch(loadTasks());
      });

      expect(hasTestId(renderer, 'tasks-loading')).toBe(true);
      expect(hasTestId(renderer, 'task-list')).toBe(false);
      expect(hasTestId(renderer, 'tasks-empty')).toBe(false);

      await ReactTestRenderer.act(async () => gate.resolve(tasks(2)));
      expect(hasTestId(renderer, 'tasks-loading')).toBe(false);
      expect(hostByTestId(renderer, 'task-card').length).toBe(2);
    });

    it('keeps showing the list while reloading and marks it as refreshing', async () => {
      const gate = deferred<Task[]>();
      const getTasks = jest
        .fn()
        .mockResolvedValueOnce(tasks(2))
        .mockReturnValueOnce(gate.promise);
      const { renderer, store } = await setup({ getTasks });

      ReactTestRenderer.act(() => {
        store.dispatch(loadTasks());
      });

      expect(hasTestId(renderer, 'tasks-loading')).toBe(false);
      expect(hostByTestId(renderer, 'task-card').length).toBe(2);
      expect(byTestId(renderer, 'task-list')[0].props.refreshing).toBe(true);
      await ReactTestRenderer.act(async () => gate.resolve(tasks(2)));
    });
  });

  describe('empty', () => {
    it('shows an empty state with guidance when there are no tasks', async () => {
      const { renderer } = await setup();

      expect(hasTestId(renderer, 'tasks-empty')).toBe(true);
      const texts = textsOf(renderer);
      expect(texts).toContain('No tasks yet');
      expect(texts.some(t => t.includes('Add task'))).toBe(true);
      expect(hasTestId(renderer, 'task-count')).toBe(false);
    });

    it('explains when a filter matches nothing', async () => {
      const { renderer, store } = await setup();
      await ReactTestRenderer.act(async () => {
        await store.dispatch(applyFilter({ keyword: 'zzz' }));
      });
      expect(textsOf(renderer)).toContain('No matching tasks');
    });
  });

  describe('error', () => {
    it('shows the error with a retry that reloads, then the tasks', async () => {
      const getTasks = jest
        .fn()
        .mockRejectedValueOnce(new Error('disk error'))
        .mockResolvedValue(tasks(2));
      const { renderer, repo } = await setup({ getTasks });

      expect(hasTestId(renderer, 'tasks-error')).toBe(true);
      expect(textsOf(renderer)).toEqual(
        expect.arrayContaining(["Couldn't load tasks", 'disk error']),
      );

      await press(renderer, 'tasks-error-action');

      expect(repo.getTasks).toHaveBeenCalledTimes(2);
      expect(hasTestId(renderer, 'tasks-error')).toBe(false);
      expect(hostByTestId(renderer, 'task-card').length).toBe(2);
    });

    it('keeps the loaded tasks and shows a banner when a refresh fails', async () => {
      const getTasks = jest
        .fn()
        .mockResolvedValueOnce(tasks(2))
        .mockRejectedValueOnce(new Error('boom'));
      const { renderer, store } = await setup({ getTasks });
      await ReactTestRenderer.act(async () => {
        await store.dispatch(loadTasks());
      });

      expect(hasTestId(renderer, 'tasks-error')).toBe(false);
      expect(hostByTestId(renderer, 'task-card').length).toBe(2);
      expect(hasTestId(renderer, 'tasks-refresh-error')).toBe(true);
    });
  });

  describe('actions', () => {
    it('shows the Add task button in every state and calls onAddTask', async () => {
      const { renderer, onAddTask } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(1)),
      });
      expect(
        hostByTestId(renderer, 'add-task-button')[0].props.accessibilityLabel,
      ).toBe('Add task');

      await press(renderer, 'add-task-button');
      expect(onAddTask).toHaveBeenCalledTimes(1);

      const empty = await setup();
      expect(hasTestId(empty.renderer, 'add-task-button')).toBe(true);
      const failed = await setup({
        getTasks: jest.fn().mockRejectedValue(new Error('x')),
      });
      expect(hasTestId(failed.renderer, 'add-task-button')).toBe(true);
    });

    it('pull-to-refresh reloads tasks and summary from the repository', async () => {
      const { renderer, repo } = await setup({
        getTasks: jest.fn().mockResolvedValue(tasks(1)),
      });
      repo.getTasks.mockClear();
      repo.getTaskSummary.mockClear();

      await ReactTestRenderer.act(async () => {
        byTestId(renderer, 'task-list')[0].props.onRefresh();
      });

      expect(repo.getTasks).toHaveBeenCalledTimes(1);
      expect(repo.getTaskSummary).toHaveBeenCalledTimes(1);
    });
  });
});
