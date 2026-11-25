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
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import type { Task } from '../../../domain/entities/Task';
import { applyTaskChanges } from '../../../domain/rules/taskRules';
import {
  TITLE_MAX_LENGTH,
  TaskValidationError,
} from '../../../domain/rules/taskValidation';
import { EditTaskScreen } from '../EditTaskScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

const original = makeTask({
  id: 'a',
  title: 'Fix login crash',
  description: 'Happens on slow networks',
  status: 'in_progress',
  priority: 'high',
  assignedTo: 'Meera Nair',
  createdDate: '2026-11-20T09:00:00.000Z',
  modifiedDate: '2026-11-21T09:00:00.000Z',
});

async function setup(
  overrides: Parameters<typeof createMockRepository>[0] = {},
) {
  const repo = createMockRepository({
    getTaskById: jest.fn().mockResolvedValue(original),
    updateTask: jest.fn(async (_id, changes) =>
      applyTaskChanges(original, changes, '2026-11-25T10:00:00.000Z'),
    ),
    ...overrides,
  });
  const store = createAppStore(repo);
  const onUpdated = jest.fn();
  const onBack = jest.fn();
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <EditTaskScreen taskId="a" onUpdated={onUpdated} onBack={onBack} />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return { repo, store, renderer, onUpdated, onBack };
}

const type = (renderer: Renderer, field: string, text: string) =>
  ReactTestRenderer.act(() => {
    byTestId(renderer, `${field}-input`)[0].props.onChangeText(text);
  });

const choose = (renderer: Renderer, id: string) =>
  ReactTestRenderer.act(() => {
    byTestId(renderer, id)[0].props.onPress();
  });

const submit = (renderer: Renderer) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, 'task-form-submit')[0].props.onPress();
  });

const valueOf = (renderer: Renderer, field: string) =>
  byTestId(renderer, `${field}-input`)[0].props.value;

const isSelected = (renderer: Renderer, id: string) =>
  byTestId(renderer, id)[0].props.accessibilityState.selected;

const errorOf = (renderer: Renderer, field: string): string | undefined =>
  byTestId(renderer, `${field}-error`)[0]?.props.children;

describe('EditTaskScreen', () => {
  describe('loading', () => {
    it('shows a loading state, then the form', async () => {
      const gate = deferred<Task | null>();
      const { renderer } = await setup({
        getTaskById: jest.fn().mockReturnValue(gate.promise),
      });
      expect(hasTestId(renderer, 'task-detail-loading')).toBe(true);
      expect(hasTestId(renderer, 'task-form')).toBe(false);

      await ReactTestRenderer.act(async () => gate.resolve(original));
      expect(hasTestId(renderer, 'task-form')).toBe(true);
    });

    it('shows not-found with a way back when the task is missing', async () => {
      const { renderer, onBack } = await setup({
        getTaskById: jest.fn().mockResolvedValue(null),
      });
      expect(hasTestId(renderer, 'task-detail-missing')).toBe(true);
      expect(hasTestId(renderer, 'task-form')).toBe(false);

      await ReactTestRenderer.act(async () => {
        byTestId(renderer, 'task-detail-missing-action')[0].props.onPress();
      });
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('shows an error state when the load fails', async () => {
      const { renderer } = await setup({
        getTaskById: jest.fn().mockRejectedValue(new Error('db locked')),
      });
      expect(hasTestId(renderer, 'task-detail-error')).toBe(true);
      expect(textsOf(renderer)).toContain('db locked');
    });
  });

  describe('prefill', () => {
    it('fills every editable field from the task', async () => {
      const { renderer } = await setup();

      expect(valueOf(renderer, 'field-title')).toBe('Fix login crash');
      expect(valueOf(renderer, 'field-description')).toBe(
        'Happens on slow networks',
      );
      expect(valueOf(renderer, 'field-assignedTo')).toBe('Meera Nair');
      expect(isSelected(renderer, 'field-status-in_progress')).toBe(true);
      expect(isSelected(renderer, 'field-priority-high')).toBe(true);
      expect(textsOf(renderer)).toContain('Save changes');
    });
  });

  describe('validation', () => {
    it('blocks saving with the same rules as create', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', '   ');
      await type(renderer, 'field-assignedTo', '');
      await submit(renderer);

      expect(errorOf(renderer, 'field-title')).toBe('Title is required');
      expect(errorOf(renderer, 'field-assignedTo')).toBe(
        'Assigned to is required',
      );
      expect(repo.updateTask).not.toHaveBeenCalled();
    });

    it('rejects a title over the limit', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', 'a'.repeat(TITLE_MAX_LENGTH + 1));
      await submit(renderer);

      expect(errorOf(renderer, 'field-title')).toContain(
        `at most ${TITLE_MAX_LENGTH}`,
      );
      expect(repo.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('updates the same task with only the changed fields, then reports success', async () => {
      const { renderer, repo, onUpdated } = await setup();
      await type(renderer, 'field-title', 'Fix the login crash');
      await choose(renderer, 'field-status-done');

      await submit(renderer);

      expect(repo.updateTask).toHaveBeenCalledTimes(1);
      expect(repo.updateTask).toHaveBeenCalledWith('a', {
        title: 'Fix the login crash',
        status: 'done',
      });
      expect(repo.createTask).not.toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    it('the saved task keeps its id and created date and gets a new modified date', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', 'Renamed');
      await submit(renderer);

      const saved = (await repo.updateTask.mock.results[0].value) as Task;
      expect(saved.id).toBe('a');
      expect(saved.createdDate).toBe(original.createdDate);
      expect(saved.modifiedDate).not.toBe(original.modifiedDate);
      expect(saved.title).toBe('Renamed');
    });

    it('re-reads the list, summary and this task after saving', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', 'Renamed');
      await submit(renderer);

      expect(repo.getTasks).toHaveBeenCalled();
      expect(repo.getTaskSummary).toHaveBeenCalled();
      expect(repo.getTaskById).toHaveBeenCalledTimes(2); // open + after save
    });

    it('writes nothing when no field changed, and still returns', async () => {
      const { renderer, repo, onUpdated } = await setup();
      await submit(renderer);

      expect(repo.updateTask).not.toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    it('does not count surrounding spaces as a change', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', '  Fix login crash  ');
      await submit(renderer);
      expect(repo.updateTask).not.toHaveBeenCalled();
    });

    it('shows a saving state and ignores a second press while saving', async () => {
      const gate = deferred<Task>();
      const { renderer, repo, onUpdated } = await setup({
        updateTask: jest.fn().mockReturnValue(gate.promise),
      });
      await type(renderer, 'field-title', 'Renamed');

      await submit(renderer);
      expect(textsOf(renderer)).toContain('Saving…');
      expect(byTestId(renderer, 'task-form-submit')[0].props.loading).toBe(
        true,
      );
      expect(byTestId(renderer, 'field-title-input')[0].props.editable).toBe(
        false,
      );

      await submit(renderer);
      expect(repo.updateTask).toHaveBeenCalledTimes(1);
      expect(onUpdated).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => gate.resolve(original));
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    it('does not navigate if the screen was closed while saving', async () => {
      const gate = deferred<Task>();
      const { renderer, onUpdated } = await setup({
        updateTask: jest.fn().mockReturnValue(gate.promise),
      });
      await type(renderer, 'field-title', 'Renamed');
      await submit(renderer);

      await ReactTestRenderer.act(async () => {
        renderer.unmount();
        gate.resolve(original);
      });
      expect(onUpdated).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('shows the error, keeps the input and stays on the form', async () => {
      const { renderer, onUpdated } = await setup({
        updateTask: jest.fn().mockRejectedValue(new Error('disk full')),
      });
      await type(renderer, 'field-title', 'Renamed');
      await choose(renderer, 'field-priority-low');
      await submit(renderer);

      expect(hasTestId(renderer, 'task-form-error')).toBe(true);
      expect(textsOf(renderer).join(' ')).toContain('disk full');
      expect(valueOf(renderer, 'field-title')).toBe('Renamed');
      expect(isSelected(renderer, 'field-priority-low')).toBe(true);
      expect(byTestId(renderer, 'task-form-submit')[0].props.loading).toBe(
        false,
      );
      expect(onUpdated).not.toHaveBeenCalled();
    });

    it('can be retried after a failure', async () => {
      const updateTask = jest
        .fn()
        .mockRejectedValueOnce(new Error('disk full'))
        .mockResolvedValueOnce(original);
      const { renderer, onUpdated } = await setup({ updateTask });
      await type(renderer, 'field-title', 'Renamed');

      await submit(renderer);
      await submit(renderer);

      expect(updateTask).toHaveBeenCalledTimes(2);
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    it('shows field errors from the repository next to the right field', async () => {
      const { renderer, onUpdated } = await setup({
        updateTask: jest
          .fn()
          .mockRejectedValue(
            new TaskValidationError([
              { field: 'title', message: 'Title is required' },
            ]),
          ),
      });
      await type(renderer, 'field-title', 'Renamed');
      await submit(renderer);

      expect(errorOf(renderer, 'field-title')).toBe('Title is required');
      expect(hasTestId(renderer, 'task-form-error')).toBe(false);
      expect(onUpdated).not.toHaveBeenCalled();
    });

    it('reports a task that was deleted meanwhile and keeps the input', async () => {
      const { renderer, onUpdated } = await setup({
        updateTask: jest.fn().mockRejectedValue(new Error('Task not found: a')),
      });
      await type(renderer, 'field-title', 'Renamed');
      await submit(renderer);

      expect(textsOf(renderer).join(' ')).toContain('Task not found: a');
      expect(valueOf(renderer, 'field-title')).toBe('Renamed');
      expect(onUpdated).not.toHaveBeenCalled();
    });
  });
});
