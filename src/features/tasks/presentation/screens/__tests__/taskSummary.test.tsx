import { Text } from 'react-native';
import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  createMockRepository,
  deferred,
  emptySummary,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  hostByTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import { createStatefulRepository } from '../../../../../test-utils/statefulRepository';
import { totalTasks } from '../../components/TaskSummary';
import type { TaskSummary } from '../../../domain/repositories/TaskRepository';
import { applyFilter } from '../../state/tasksSlice';
import {
  createTask,
  deleteTask,
  loadSummary,
  loadTasks,
  updateTask,
} from '../../state/tasksThunks';
import { TaskListScreen } from '../TaskListScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

// SafeAreaProvider/insets need native values that don't exist in Jest.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

const SUMMARY: TaskSummary = {
  byStatus: { todo: 5, in_progress: 4, done: 3 },
  byPriority: { low: 3, medium: 4, high: 3, critical: 2 },
};

async function mount(
  store: ReturnType<typeof createAppStore>,
): Promise<Renderer> {
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <TaskListScreen onAddTask={jest.fn()} onOpenTask={jest.fn()} />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return renderer;
}

/** A screen over a mock repository; `preload` mimics what startup does. */
async function setup(
  overrides: Parameters<typeof createMockRepository>[0] = {},
  { preload = true } = {},
) {
  const repo = createMockRepository({
    getTasks: jest.fn().mockResolvedValue([makeTask()]),
    getTaskSummary: jest.fn().mockResolvedValue(SUMMARY),
    ...overrides,
  });
  const store = createAppStore(repo);
  if (preload) {
    await store.dispatch(loadTasks());
    await store.dispatch(loadSummary());
  }
  const renderer = await mount(store);
  return { repo, store, renderer };
}

/** The number shown in a tile (the last <Text> inside it; the first is its label). */
const tile = (renderer: Renderer, id: string) => {
  const texts = byTestId(renderer, id)[0].findAllByType(Text);
  return {
    label: [texts[0].props.children].flat().join(''),
    count: [texts[texts.length - 1].props.children].flat().join(''),
  };
};

const total = (renderer: Renderer) =>
  [byTestId(renderer, 'task-summary-total')[0].props.children].flat().join('');

const press = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

describe('totalTasks', () => {
  it('adds up the status counts', () => {
    expect(totalTasks(SUMMARY)).toBe(12);
    expect(totalTasks(emptySummary)).toBe(0);
  });
});

describe('TaskSummary rendering', () => {
  it('shows the total active count', async () => {
    const { renderer } = await setup();
    expect(hasTestId(renderer, 'task-summary')).toBe(true);
    expect(total(renderer)).toBe('12');
    expect(textsOf(renderer)).toContain('All tasks');
  });

  it('shows a labelled count for each status', async () => {
    const { renderer } = await setup();
    expect(tile(renderer, 'summary-status-todo')).toEqual({
      label: 'To Do',
      count: '5',
    });
    expect(tile(renderer, 'summary-status-in_progress')).toEqual({
      label: 'In Progress',
      count: '4',
    });
    expect(tile(renderer, 'summary-status-done')).toEqual({
      label: 'Done',
      count: '3',
    });
  });

  it('shows a labelled count for each priority', async () => {
    const { renderer } = await setup();
    expect(tile(renderer, 'summary-priority-low')).toEqual({
      label: 'Low',
      count: '3',
    });
    expect(tile(renderer, 'summary-priority-medium')).toEqual({
      label: 'Medium',
      count: '4',
    });
    expect(tile(renderer, 'summary-priority-high')).toEqual({
      label: 'High',
      count: '3',
    });
    expect(tile(renderer, 'summary-priority-critical')).toEqual({
      label: 'Critical',
      count: '2',
    });
  });

  it('shows zeros, not blanks, when there are no tasks', async () => {
    const { renderer } = await setup({
      getTasks: jest.fn().mockResolvedValue([]),
      getTaskSummary: jest.fn().mockResolvedValue(emptySummary),
    });
    expect(total(renderer)).toBe('0');
    expect(tile(renderer, 'summary-status-done').count).toBe('0');
    expect(tile(renderer, 'summary-priority-critical').count).toBe('0');
  });

  it('exposes accessible labels for the tiles and total', async () => {
    const { renderer } = await setup();
    expect(
      hostByTestId(renderer, 'summary-status-todo')[0].props.accessibilityLabel,
    ).toBe('To Do: 5');
    expect(
      byTestId(renderer, 'task-summary-total')[0].props.accessibilityLabel,
    ).toBe('12 active tasks');
  });

  it('wraps on narrow screens instead of squeezing the tiles', async () => {
    const { renderer } = await setup();
    const tileNode = hostByTestId(renderer, 'summary-priority-low')[0];
    const flat = (style: unknown) =>
      Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
    // Walk up to the row that holds the tiles.
    let row = tileNode.parent;
    while (row && flat(row.props.style).flexWrap !== 'wrap') {
      row = row.parent;
    }
    expect(row).not.toBeNull();
    expect(flat(tileNode.props.style).minWidth).toBeGreaterThan(0);
  });

  it('reads the summary from the repository, not from the listed tasks', async () => {
    // One task listed, but the summary says 12: the summary wins.
    const { renderer } = await setup();
    expect(hostByTestId(renderer, 'task-card')).toHaveLength(1);
    expect(total(renderer)).toBe('12');
  });
});

describe('independence from search and filters', () => {
  it('keeps the counts when filters narrow the list', async () => {
    const { renderer, repo, store } = await setup({
      getTasks: jest.fn(async filter =>
        filter?.status
          ? [makeTask({ id: 'only' })]
          : [makeTask({ id: 'x1' }), makeTask({ id: 'x2' })],
      ),
    });
    repo.getTaskSummary.mockClear();

    await ReactTestRenderer.act(async () => {
      await store.dispatch(
        applyFilter({ status: 'todo', priority: 'high', keyword: 'x' }),
      );
    });

    expect(textsOf(renderer)).toContain('1 task (filtered)');
    expect(total(renderer)).toBe('12');
    expect(tile(renderer, 'summary-status-todo').count).toBe('5');
    expect(tile(renderer, 'summary-priority-high').count).toBe('3');
    // Filtering doesn't touch the summary query, and it never takes a filter.
    expect(repo.getTaskSummary).not.toHaveBeenCalled();
  });

  it('asks the repository for the summary without any filter', async () => {
    const { repo, store } = await setup();
    await ReactTestRenderer.act(async () => {
      await store.dispatch(applyFilter({ status: 'done' }));
      await store.dispatch(loadSummary());
    });
    for (const call of repo.getTaskSummary.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it('is still shown when the filters match nothing', async () => {
    const { renderer, store } = await setup({
      getTasks: jest.fn(async filter => (filter?.keyword ? [] : [makeTask()])),
    });
    await ReactTestRenderer.act(async () => {
      await store.dispatch(applyFilter({ keyword: 'zzz' }));
    });

    expect(hasTestId(renderer, 'tasks-empty')).toBe(true);
    expect(hasTestId(renderer, 'task-summary')).toBe(true);
    expect(total(renderer)).toBe('12');
  });
});

describe('loading', () => {
  it('shows placeholders without blocking the task list', async () => {
    const gate = deferred<TaskSummary>();
    const { renderer, store } = await setup(
      { getTaskSummary: jest.fn().mockReturnValue(gate.promise) },
      { preload: false },
    );
    await ReactTestRenderer.act(async () => {
      await store.dispatch(loadTasks());
      store.dispatch(loadSummary());
    });

    // The list is usable while the summary is still loading.
    expect(hostByTestId(renderer, 'task-card')).toHaveLength(1);
    expect(hasTestId(renderer, 'task-summary-loading')).toBe(true);
    expect(hasTestId(renderer, 'task-summary')).toBe(false);
    expect(hasTestId(renderer, 'task-summary-total')).toBe(false);
    expect(tile(renderer, 'summary-status-todo').count).toBe('–');
    expect(tile(renderer, 'summary-priority-low').count).toBe('–');

    await ReactTestRenderer.act(async () => gate.resolve(SUMMARY));
    expect(hasTestId(renderer, 'task-summary-loading')).toBe(false);
    expect(total(renderer)).toBe('12');
  });

  it('shows placeholders above the loading state of the list too', async () => {
    const { renderer } = await setup(
      { getTasks: jest.fn().mockReturnValue(new Promise(() => {})) },
      { preload: false },
    );
    expect(hasTestId(renderer, 'tasks-loading')).toBe(true);
    expect(hasTestId(renderer, 'task-summary-loading')).toBe(true);
  });

  it('keeps showing the old counts while the summary reloads', async () => {
    const gate = deferred<TaskSummary>();
    const { renderer, repo, store } = await setup();
    repo.getTaskSummary.mockReturnValueOnce(gate.promise);

    ReactTestRenderer.act(() => {
      store.dispatch(loadSummary());
    });
    expect(hasTestId(renderer, 'task-summary')).toBe(true);
    expect(total(renderer)).toBe('12');

    await ReactTestRenderer.act(async () => gate.resolve(SUMMARY));
  });
});

describe('errors', () => {
  it('shows a compact error with Retry and leaves the list working', async () => {
    const getTaskSummary = jest
      .fn()
      .mockRejectedValueOnce(new Error('db locked'))
      .mockResolvedValue(SUMMARY);
    const { renderer } = await setup({ getTaskSummary });

    expect(hasTestId(renderer, 'task-summary-error')).toBe(true);
    expect(textsOf(renderer)).toContain("Couldn't load the summary.");
    expect(hasTestId(renderer, 'task-summary')).toBe(false);
    // Not blocking: the tasks are still listed and the screen has no error state.
    expect(hostByTestId(renderer, 'task-card')).toHaveLength(1);
    expect(hasTestId(renderer, 'tasks-error')).toBe(false);

    await press(renderer, 'task-summary-error-action');

    expect(getTaskSummary).toHaveBeenCalledTimes(2);
    expect(hasTestId(renderer, 'task-summary-error')).toBe(false);
    expect(total(renderer)).toBe('12');
  });

  it('keeps the old counts with a notice when a refresh fails', async () => {
    const getTaskSummary = jest
      .fn()
      .mockResolvedValueOnce(SUMMARY)
      .mockRejectedValueOnce(new Error('db locked'))
      .mockResolvedValue({
        ...SUMMARY,
        byStatus: { todo: 6, in_progress: 4, done: 3 },
      });
    const { renderer, store } = await setup({ getTaskSummary });

    await ReactTestRenderer.act(async () => {
      await store.dispatch(loadSummary());
    });

    expect(total(renderer)).toBe('12');
    expect(hasTestId(renderer, 'task-summary-refresh-error')).toBe(true);
    expect(hasTestId(renderer, 'task-summary-error')).toBe(false);

    await press(renderer, 'task-summary-refresh-error-action');

    expect(total(renderer)).toBe('13');
    expect(hasTestId(renderer, 'task-summary-refresh-error')).toBe(false);
  });

  it('a task-list error does not hide the summary, and vice versa', async () => {
    const { renderer } = await setup({
      getTasks: jest.fn().mockRejectedValue(new Error('x')),
    });
    expect(hasTestId(renderer, 'tasks-error')).toBe(true);
    expect(hasTestId(renderer, 'task-summary')).toBe(true);
  });
});

describe('refreshing', () => {
  it('pull-to-refresh reloads the summary along with the tasks', async () => {
    const getTaskSummary = jest
      .fn()
      .mockResolvedValueOnce(SUMMARY)
      .mockResolvedValue({
        ...SUMMARY,
        byStatus: { todo: 5, in_progress: 4, done: 10 },
      });
    const { renderer } = await setup({ getTaskSummary });
    expect(total(renderer)).toBe('12');

    await ReactTestRenderer.act(async () => {
      byTestId(renderer, 'task-list')[0].props.onRefresh();
    });

    expect(getTaskSummary).toHaveBeenCalledTimes(2);
    expect(total(renderer)).toBe('19');
    expect(tile(renderer, 'summary-status-done').count).toBe('10');
  });
});

describe('counts after create, edit and delete', () => {
  const base = [
    makeTask({ id: 'a', status: 'todo', priority: 'high' }),
    makeTask({ id: 'b', status: 'todo', priority: 'low' }),
    makeTask({ id: 'c', status: 'done', priority: 'low' }),
  ];

  async function setupStateful() {
    const { repository, records } = createStatefulRepository(base);
    const store = createAppStore(repository);
    await store.dispatch(loadTasks());
    await store.dispatch(loadSummary());
    const renderer = await mount(store);
    return { repository, records, store, renderer };
  }

  it('starts from the repository counts', async () => {
    const { renderer } = await setupStateful();
    expect(total(renderer)).toBe('3');
    expect(tile(renderer, 'summary-status-todo').count).toBe('2');
    expect(tile(renderer, 'summary-priority-low').count).toBe('2');
  });

  it('updates after a task is created', async () => {
    const { renderer, store } = await setupStateful();
    await ReactTestRenderer.act(async () => {
      await store.dispatch(
        createTask({
          title: 'Brand new',
          description: '',
          assignedTo: 'Asha',
          status: 'in_progress',
          priority: 'critical',
        }),
      );
    });

    expect(total(renderer)).toBe('4');
    expect(tile(renderer, 'summary-status-in_progress').count).toBe('1');
    expect(tile(renderer, 'summary-priority-critical').count).toBe('1');
    expect(tile(renderer, 'summary-status-todo').count).toBe('2');
  });

  it('updates after a task is edited: counts move between groups, total stays', async () => {
    const { renderer, store } = await setupStateful();
    await ReactTestRenderer.act(async () => {
      await store.dispatch(
        updateTask({
          id: 'a',
          changes: { status: 'done', priority: 'critical' },
        }),
      );
    });

    expect(total(renderer)).toBe('3');
    expect(tile(renderer, 'summary-status-todo').count).toBe('1');
    expect(tile(renderer, 'summary-status-done').count).toBe('2');
    expect(tile(renderer, 'summary-priority-high').count).toBe('0');
    expect(tile(renderer, 'summary-priority-critical').count).toBe('1');
  });

  it('updates after a task is deleted, and the record is only soft-deleted', async () => {
    const { renderer, store, records } = await setupStateful();
    await ReactTestRenderer.act(async () => {
      await store.dispatch(deleteTask('c'));
    });

    expect(total(renderer)).toBe('2');
    expect(tile(renderer, 'summary-status-done').count).toBe('0');
    expect(tile(renderer, 'summary-priority-low').count).toBe('1');
    expect(records()).toHaveLength(3);
  });

  it('stays correct after mutations while a filter is active', async () => {
    const { renderer, store } = await setupStateful();
    await ReactTestRenderer.act(async () => {
      await store.dispatch(applyFilter({ status: 'done' }));
    });
    expect(textsOf(renderer)).toContain('1 task (filtered)');
    expect(total(renderer)).toBe('3');

    await ReactTestRenderer.act(async () => {
      await store.dispatch(deleteTask('a')); // not in the filtered list
    });

    expect(total(renderer)).toBe('2'); // counts everything, not just "Done"
    expect(textsOf(renderer)).toContain('1 task (filtered)');
  });
});
