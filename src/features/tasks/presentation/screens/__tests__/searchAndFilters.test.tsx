import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import { makeTask } from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  hostByTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import { createStatefulRepository } from '../../../../../test-utils/statefulRepository';
import { SEARCH_DEBOUNCE_MS } from '../../components/TaskFilterBar';
import { deleteTask, loadSummary, loadTasks } from '../../state/tasksThunks';
import { TaskListScreen } from '../TaskListScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

// SafeAreaProvider/insets need native values that don't exist in Jest.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const TASKS = [
  makeTask({
    id: 't1',
    title: 'Fix login crash',
    description: 'Happens on slow networks',
    status: 'todo',
    priority: 'high',
    modifiedDate: '2026-11-25T04:00:00.000Z',
  }),
  makeTask({
    id: 't2',
    title: 'Write report',
    description: 'Quarterly LOGIN statistics',
    status: 'in_progress',
    priority: 'low',
    modifiedDate: '2026-11-25T03:00:00.000Z',
  }),
  makeTask({
    id: 't3',
    title: 'Deploy app',
    description: '',
    status: 'done',
    priority: 'critical',
    modifiedDate: '2026-11-25T02:00:00.000Z',
  }),
  makeTask({
    id: 't4',
    title: 'Login page design',
    description: 'New layout',
    status: 'todo',
    priority: 'medium',
    modifiedDate: '2026-11-25T01:00:00.000Z',
  }),
];

const rendered: Renderer[] = [];
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
  jest.useRealTimers();
});

async function setup() {
  const { repository } = createStatefulRepository(TASKS);
  const store = createAppStore(repository);
  await store.dispatch(loadTasks());
  await store.dispatch(loadSummary());
  const renderer = await mount(store);
  repository.getTasks.mockClear();
  return { repository, store, renderer };
}

async function mount(store: ReturnType<typeof createAppStore>) {
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

const type = (renderer: Renderer, text: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, 'task-search-input')[0].props.onChangeText(text);
  });

const wait = (ms: number) =>
  ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
  });

const press = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

/** The ids of the tasks currently listed, in order. */
const listed = (store: ReturnType<typeof createAppStore>) =>
  store.getState().tasks.items.map(t => t.id);

const isSelected = (renderer: Renderer, id: string) =>
  byTestId(renderer, id)[0].props.accessibilityState.selected;

const searchText = (renderer: Renderer) =>
  byTestId(renderer, 'task-search-input')[0].props.value;

describe('search', () => {
  it('shows a search box and every filter option', async () => {
    const { renderer } = await setup();
    expect(hasTestId(renderer, 'task-search-input')).toBe(true);
    for (const id of [
      'filter-status-all',
      'filter-status-todo',
      'filter-status-in_progress',
      'filter-status-done',
      'filter-priority-all',
      'filter-priority-low',
      'filter-priority-medium',
      'filter-priority-high',
      'filter-priority-critical',
    ]) {
      expect(hasTestId(renderer, id)).toBe(true);
    }
    expect(isSelected(renderer, 'filter-status-all')).toBe(true);
    expect(isSelected(renderer, 'filter-priority-all')).toBe(true);
  });

  it('does not query on each keystroke; queries once after typing pauses', async () => {
    const { renderer, repository, store } = await setup();

    await type(renderer, 'l');
    await wait(100);
    await type(renderer, 'lo');
    await wait(100);
    await type(renderer, 'login');
    await wait(SEARCH_DEBOUNCE_MS - 1);
    expect(repository.getTasks).not.toHaveBeenCalled();
    expect(listed(store)).toHaveLength(4);

    await wait(1);
    expect(repository.getTasks).toHaveBeenCalledTimes(1);
    expect(repository.getTasks).toHaveBeenCalledWith({ keyword: 'login' });
    expect(listed(store)).toEqual(['t1', 't2', 't4']);
  });

  it('keeps the typed text in the box while debouncing', async () => {
    const { renderer } = await setup();
    await type(renderer, 'log');
    expect(searchText(renderer)).toBe('log');
  });

  it('searches the title and the description, ignoring case', async () => {
    const { renderer, store } = await setup();

    await type(renderer, 'LOGIN');
    await wait(SEARCH_DEBOUNCE_MS);
    // t2 matches only through its description ("Quarterly LOGIN statistics").
    expect(listed(store)).toEqual(['t1', 't2', 't4']);

    await type(renderer, 'slow NETWORKS');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(listed(store)).toEqual(['t1']);
  });

  it('trims the keyword and does not query for blank input', async () => {
    const { renderer, repository, store } = await setup();

    await type(renderer, '   ');
    await wait(SEARCH_DEBOUNCE_MS * 2);
    expect(repository.getTasks).not.toHaveBeenCalled();

    await type(renderer, '  deploy  ');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(repository.getTasks).toHaveBeenCalledWith({ keyword: 'deploy' });
    expect(store.getState().tasks.filter).toEqual({ keyword: 'deploy' });
  });

  it('applies immediately when the keyboard search key is pressed', async () => {
    const { renderer, repository } = await setup();
    await type(renderer, 'report');
    await ReactTestRenderer.act(async () => {
      byTestId(renderer, 'task-search-input')[0].props.onSubmitEditing();
    });
    expect(repository.getTasks).toHaveBeenCalledWith({ keyword: 'report' });
  });

  it('does not query again after the debounce when it was already applied', async () => {
    const { renderer, repository } = await setup();
    await type(renderer, 'report');
    await ReactTestRenderer.act(async () => {
      byTestId(renderer, 'task-search-input')[0].props.onSubmitEditing();
    });
    await wait(SEARCH_DEBOUNCE_MS * 2);
    expect(repository.getTasks).toHaveBeenCalledTimes(1);
  });

  it('shows a clear button only when there is text, and it resets the search', async () => {
    const { renderer, store } = await setup();
    expect(hasTestId(renderer, 'task-search-clear')).toBe(false);

    await type(renderer, 'deploy');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(listed(store)).toEqual(['t3']);
    expect(hasTestId(renderer, 'task-search-clear')).toBe(true);

    await press(renderer, 'task-search-clear');

    expect(searchText(renderer)).toBe('');
    expect(listed(store)).toHaveLength(4); // immediately, no debounce wait
    expect(store.getState().tasks.filter).toEqual({});
    expect(hasTestId(renderer, 'task-search-clear')).toBe(false);
  });

  it('clearing before the debounce fires cancels the pending query', async () => {
    const { renderer, repository } = await setup();
    await type(renderer, 'deploy');
    await press(renderer, 'task-search-clear');
    await wait(SEARCH_DEBOUNCE_MS * 2);

    expect(repository.getTasks).not.toHaveBeenCalled();
  });

  it('shows the no-match empty state and recovers when the search is cleared', async () => {
    const { renderer, store } = await setup();
    await type(renderer, 'zzz');
    await wait(SEARCH_DEBOUNCE_MS);

    expect(hasTestId(renderer, 'tasks-empty')).toBe(true);
    expect(textsOf(renderer)).toContain('No matching tasks');
    expect(hasTestId(renderer, 'task-count')).toBe(false);
    // The controls stay available so the user can change the search.
    expect(hasTestId(renderer, 'task-search-input')).toBe(true);

    await press(renderer, 'task-search-clear');
    expect(hasTestId(renderer, 'tasks-empty')).toBe(false);
    expect(listed(store)).toHaveLength(4);
  });
});

describe('filters', () => {
  it('filters by each status', async () => {
    const { renderer, repository, store } = await setup();

    await press(renderer, 'filter-status-todo');
    expect(repository.getTasks).toHaveBeenLastCalledWith({ status: 'todo' });
    expect(listed(store)).toEqual(['t1', 't4']);

    await press(renderer, 'filter-status-in_progress');
    expect(listed(store)).toEqual(['t2']);

    await press(renderer, 'filter-status-done');
    expect(listed(store)).toEqual(['t3']);
  });

  it('filters by each priority', async () => {
    const { renderer, repository, store } = await setup();

    await press(renderer, 'filter-priority-low');
    expect(repository.getTasks).toHaveBeenLastCalledWith({ priority: 'low' });
    expect(listed(store)).toEqual(['t2']);

    await press(renderer, 'filter-priority-medium');
    expect(listed(store)).toEqual(['t4']);
    await press(renderer, 'filter-priority-high');
    expect(listed(store)).toEqual(['t1']);
    await press(renderer, 'filter-priority-critical');
    expect(listed(store)).toEqual(['t3']);
  });

  it('shows which filters are active, and All turns one off', async () => {
    const { renderer, store } = await setup();
    await press(renderer, 'filter-status-todo');
    await press(renderer, 'filter-priority-high');

    expect(isSelected(renderer, 'filter-status-todo')).toBe(true);
    expect(isSelected(renderer, 'filter-status-all')).toBe(false);
    expect(isSelected(renderer, 'filter-priority-high')).toBe(true);
    expect(isSelected(renderer, 'filter-priority-all')).toBe(false);

    await press(renderer, 'filter-status-all');
    expect(isSelected(renderer, 'filter-status-all')).toBe(true);
    expect(store.getState().tasks.filter).toEqual({ priority: 'high' });
    expect(listed(store)).toEqual(['t1']);
  });

  it('combines status and priority', async () => {
    const { renderer, store } = await setup();
    await press(renderer, 'filter-status-todo');
    await press(renderer, 'filter-priority-medium');

    expect(store.getState().tasks.filter).toEqual({
      status: 'todo',
      priority: 'medium',
    });
    expect(listed(store)).toEqual(['t4']);
  });

  it('combines status, priority and keyword', async () => {
    const { renderer, repository, store } = await setup();
    await press(renderer, 'filter-status-todo');
    await type(renderer, 'login');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(repository.getTasks).toHaveBeenLastCalledWith({
      status: 'todo',
      keyword: 'login',
    });
    expect(listed(store)).toEqual(['t1', 't4']);

    await press(renderer, 'filter-priority-high');
    expect(repository.getTasks).toHaveBeenLastCalledWith({
      status: 'todo',
      priority: 'high',
      keyword: 'login',
    });
    expect(listed(store)).toEqual(['t1']);
  });

  it('keeps the keyword when a chip changes, and a chip change includes pending text', async () => {
    const { renderer, repository } = await setup();
    await type(renderer, 'login');
    // Chip pressed before the debounce fired: one query carries both.
    await press(renderer, 'filter-priority-high');
    expect(repository.getTasks).toHaveBeenCalledTimes(1);
    expect(repository.getTasks).toHaveBeenCalledWith({
      priority: 'high',
      keyword: 'login',
    });

    await wait(SEARCH_DEBOUNCE_MS * 2);
    expect(repository.getTasks).toHaveBeenCalledTimes(1);
  });

  it('shows no-match guidance when the combination matches nothing', async () => {
    const { renderer } = await setup();
    await press(renderer, 'filter-status-done');
    await press(renderer, 'filter-priority-low');

    expect(hasTestId(renderer, 'tasks-empty')).toBe(true);
    expect(textsOf(renderer)).toContain('No matching tasks');
    expect(textsOf(renderer)).toContain('Clear filters');
  });
});

describe('count and filtered indicator', () => {
  it('shows an accurate count and the filtered marker only while filtering', async () => {
    const { renderer } = await setup();
    expect(textsOf(renderer)).toContain('4 tasks');

    await press(renderer, 'filter-status-todo');
    expect(textsOf(renderer)).toContain('2 tasks (filtered)');
    expect(hostByTestId(renderer, 'task-card')).toHaveLength(2);

    await press(renderer, 'filter-priority-high');
    expect(textsOf(renderer)).toContain('1 task (filtered)');

    await press(renderer, 'clear-filters');
    expect(textsOf(renderer)).toContain('4 tasks');
    expect(textsOf(renderer).some(t => t.includes('filtered'))).toBe(false);
  });
});

describe('clearing', () => {
  it('shows Clear all filters only when something is active', async () => {
    const { renderer } = await setup();
    expect(hasTestId(renderer, 'clear-filters')).toBe(false);

    await press(renderer, 'filter-status-done');
    expect(hasTestId(renderer, 'clear-filters')).toBe(true);
  });

  it('Clear all filters resets status, priority and keyword together', async () => {
    const { renderer, store } = await setup();
    await press(renderer, 'filter-status-todo');
    await press(renderer, 'filter-priority-high');
    await type(renderer, 'login');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(listed(store)).toEqual(['t1']);

    await press(renderer, 'clear-filters');

    expect(store.getState().tasks.filter).toEqual({});
    expect(searchText(renderer)).toBe('');
    expect(isSelected(renderer, 'filter-status-all')).toBe(true);
    expect(isSelected(renderer, 'filter-priority-all')).toBe(true);
    expect(listed(store)).toHaveLength(4);
    expect(hasTestId(renderer, 'clear-filters')).toBe(false);
  });

  it('cancels a pending search when everything is cleared', async () => {
    const { renderer, repository } = await setup();
    await type(renderer, 'login');
    expect(hasTestId(renderer, 'clear-filters')).toBe(true);

    await press(renderer, 'clear-filters');
    repository.getTasks.mockClear();
    await wait(SEARCH_DEBOUNCE_MS * 2);

    expect(repository.getTasks).not.toHaveBeenCalled();
    expect(searchText(renderer)).toBe('');
  });

  it('the empty state offers Clear filters, which also empties the search box', async () => {
    const { renderer, store } = await setup();
    await type(renderer, 'zzz');
    await wait(SEARCH_DEBOUNCE_MS);
    expect(hasTestId(renderer, 'tasks-empty')).toBe(true);

    await press(renderer, 'tasks-empty-action');

    expect(store.getState().tasks.filter).toEqual({});
    expect(searchText(renderer)).toBe('');
    expect(listed(store)).toHaveLength(4);
    expect(hasTestId(renderer, 'tasks-empty')).toBe(false);
  });

  it('has no Clear filters action on the plain empty state', async () => {
    const { repository, store } = createStatefulRepositoryEmpty();
    await store.dispatch(loadTasks());
    const renderer = await mount(store);
    expect(textsOf(renderer)).toContain('No tasks yet');
    expect(hasTestId(renderer, 'tasks-empty-action')).toBe(false);
    expect(repository.getTasks).toHaveBeenCalled();
  });
});

describe('persistence and refresh', () => {
  it('pull-to-refresh keeps the active filters', async () => {
    const { renderer, repository, store } = await setup();
    await press(renderer, 'filter-status-todo');
    await type(renderer, 'login');
    await wait(SEARCH_DEBOUNCE_MS);
    repository.getTasks.mockClear();

    await ReactTestRenderer.act(async () => {
      byTestId(renderer, 'task-list')[0].props.onRefresh();
    });

    expect(repository.getTasks).toHaveBeenCalledWith({
      status: 'todo',
      keyword: 'login',
    });
    expect(listed(store)).toEqual(['t1', 't4']);
    expect(store.getState().tasks.filter).toEqual({
      status: 'todo',
      keyword: 'login',
    });
  });

  it('a screen mounted again shows the stored filters, search text and results', async () => {
    const { renderer, store } = await setup();
    await press(renderer, 'filter-priority-high');
    await type(renderer, 'login');
    await wait(SEARCH_DEBOUNCE_MS);
    await ReactTestRenderer.act(async () => renderer.unmount());
    rendered.length = 0;

    const again = await mount(store);

    expect(searchText(again)).toBe('login');
    expect(isSelected(again, 'filter-priority-high')).toBe(true);
    expect(textsOf(again)).toContain('1 task (filtered)');
    expect(hasTestId(again, 'clear-filters')).toBe(true);
  });

  it('writes elsewhere (an edit or delete) refresh the list with the filters still applied', async () => {
    const { renderer, repository, store } = await setup();
    await press(renderer, 'filter-status-todo');
    expect(listed(store)).toEqual(['t1', 't4']);

    // Soft-delete t1 through the repository and the thunk, as the details screen does.
    await ReactTestRenderer.act(async () => {
      await store.dispatch(deleteTask('t1'));
    });

    expect(repository.getTasks).toHaveBeenLastCalledWith({ status: 'todo' });
    expect(listed(store)).toEqual(['t4']);
    expect(textsOf(renderer)).toContain('1 task (filtered)');
  });
});

describe('stale results', () => {
  it('shows only the latest filter even if an earlier query answers late', async () => {
    const { renderer, repository, store } = await setup();
    let releaseSlow!: (tasks: typeof TASKS) => void;
    const real = repository.getTasks.getMockImplementation()!;
    repository.getTasks.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          releaseSlow = resolve;
        }),
    );
    repository.getTasks.mockImplementation(real);

    await press(renderer, 'filter-status-todo'); // slow, still pending
    await press(renderer, 'filter-status-done'); // fast
    expect(listed(store)).toEqual(['t3']);

    await ReactTestRenderer.act(async () => releaseSlow([TASKS[0], TASKS[3]]));
    expect(listed(store)).toEqual(['t3']);
  });

  it('warns that results may not match when a filtered reload fails', async () => {
    const { renderer, repository } = await setup();
    repository.getTasks.mockRejectedValueOnce(new Error('boom'));
    await press(renderer, 'filter-status-todo');

    expect(hasTestId(renderer, 'tasks-refresh-error')).toBe(true);
    expect(textsOf(renderer).join(' ')).toContain('may not match your filters');
  });
});

function createStatefulRepositoryEmpty() {
  const { repository } = createStatefulRepository([]);
  return { repository, store: createAppStore(repository) };
}
