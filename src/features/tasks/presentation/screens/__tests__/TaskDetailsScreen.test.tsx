import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import { formatDateTime } from '../../../../../shared/utils/formatDate';
import {
  createMockRepository,
  deferred,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import type { Task } from '../../../domain/entities/Task';
import { loadTask } from '../../state/tasksThunks';
import { TaskDetailsScreen } from '../TaskDetailsScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

const full = makeTask({
  id: 'a',
  title: 'Fix login crash',
  description: 'Happens on slow networks',
  status: 'in_progress',
  priority: 'critical',
  assignedTo: 'Meera Nair',
  createdDate: '2026-11-20T09:00:00.000Z',
  modifiedDate: '2026-11-24T15:30:00.000Z',
});

async function setup(
  overrides: Parameters<typeof createMockRepository>[0] = {},
  { taskId = 'a', preload = false } = {},
) {
  const repo = createMockRepository({
    getTaskById: jest.fn().mockResolvedValue(full),
    ...overrides,
  });
  const store = createAppStore(repo);
  if (preload) {
    await store.dispatch(loadTask(taskId));
  }
  const handlers = {
    onEdit: jest.fn(),
    onDeleted: jest.fn(),
    onBack: jest.fn(),
  };
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <TaskDetailsScreen taskId={taskId} {...handlers} />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return { repo, store, renderer, ...handlers };
}

const press = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, id)[0].props.onPress();
  });

describe('TaskDetailsScreen', () => {
  it('loads the task by id and shows every field', async () => {
    const { renderer, repo } = await setup();

    expect(repo.getTaskById).toHaveBeenCalledWith('a');
    const texts = textsOf(renderer);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Fix login crash',
        'Happens on slow networks',
        'In Progress',
        'Critical',
        'Meera Nair',
        'MN',
        formatDateTime(full.createdDate),
        formatDateTime(full.modifiedDate),
        'Created',
        'Last modified',
        'Assigned to',
      ]),
    );
  });

  it('shows a placeholder line when there is no description', async () => {
    const { renderer } = await setup({
      getTaskById: jest.fn().mockResolvedValue({ ...full, description: '' }),
    });
    expect(textsOf(renderer)).toContain('No description');
  });

  it('shows a loading state until the task arrives', async () => {
    const gate = deferred<Task | null>();
    const { renderer } = await setup({
      getTaskById: jest.fn().mockReturnValue(gate.promise),
    });
    expect(hasTestId(renderer, 'task-detail-loading')).toBe(true);
    expect(hasTestId(renderer, 'task-details')).toBe(false);

    await ReactTestRenderer.act(async () => gate.resolve(full));
    expect(hasTestId(renderer, 'task-detail-loading')).toBe(false);
    expect(hasTestId(renderer, 'task-details')).toBe(true);
  });

  it('shows a not-found state with a way back when the task is missing', async () => {
    const { renderer, onBack } = await setup({
      getTaskById: jest.fn().mockResolvedValue(null),
    });
    expect(hasTestId(renderer, 'task-detail-missing')).toBe(true);
    expect(textsOf(renderer)).toContain('Task not found');
    expect(hasTestId(renderer, 'task-details-edit')).toBe(false);

    await press(renderer, 'task-detail-missing-action');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error state and retries when the load fails', async () => {
    const getTaskById = jest
      .fn()
      .mockRejectedValueOnce(new Error('db locked'))
      .mockResolvedValueOnce(full);
    const { renderer } = await setup({ getTaskById });

    expect(hasTestId(renderer, 'task-detail-error')).toBe(true);
    expect(textsOf(renderer)).toContain('db locked');

    await press(renderer, 'task-detail-error-action');
    expect(getTaskById).toHaveBeenCalledTimes(2);
    expect(hasTestId(renderer, 'task-detail-error')).toBe(false);
    expect(hasTestId(renderer, 'task-details')).toBe(true);
  });

  it('keeps showing the task with a banner when a refresh fails', async () => {
    const getTaskById = jest
      .fn()
      .mockResolvedValueOnce(full)
      .mockRejectedValueOnce(new Error('db locked'));
    const { renderer, store } = await setup({ getTaskById });

    await ReactTestRenderer.act(async () => {
      await store.dispatch(loadTask('a'));
    });

    expect(hasTestId(renderer, 'task-details')).toBe(true);
    expect(hasTestId(renderer, 'task-details-refresh-error')).toBe(true);
    expect(hasTestId(renderer, 'task-detail-error')).toBe(false);
  });

  it('does not show another task that was loaded before', async () => {
    const other = makeTask({ id: 'other', title: 'Other task' });
    const gate = deferred<Task | null>();
    const repo = createMockRepository({
      getTaskById: jest
        .fn()
        .mockResolvedValueOnce(other)
        .mockReturnValueOnce(gate.promise),
    });
    const store = createAppStore(repo);
    await store.dispatch(loadTask('other'));

    let renderer!: Renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <TaskDetailsScreen
            taskId="a"
            onEdit={jest.fn()}
            onDeleted={jest.fn()}
            onBack={jest.fn()}
          />
        </Provider>,
      );
    });
    rendered.push(renderer);

    expect(textsOf(renderer)).not.toContain('Other task');
    expect(hasTestId(renderer, 'task-detail-loading')).toBe(true);
    await ReactTestRenderer.act(async () => gate.resolve(null));
  });

  it('calls onEdit from the Edit button', async () => {
    const { renderer, onEdit } = await setup();
    await press(renderer, 'task-details-edit');
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
