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
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  TaskValidationError,
} from '../../../domain/rules/taskValidation';
import { deleteTask } from '../../state/tasksThunks';
import { CreateTaskScreen } from '../CreateTaskScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
});

async function setup(
  overrides: Parameters<typeof createMockRepository>[0] = {},
) {
  const repo = createMockRepository(overrides);
  const store = createAppStore(repo);
  const onCreated = jest.fn();
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <CreateTaskScreen onCreated={onCreated} />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return { repo, store, renderer, onCreated };
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

const isSelected = (renderer: Renderer, id: string) =>
  byTestId(renderer, id)[0].props.accessibilityState.selected;

const errorOf = (renderer: Renderer, field: string): string | undefined =>
  byTestId(renderer, `${field}-error`)[0]?.props.children;

async function fillValid(renderer: Renderer) {
  await type(renderer, 'field-title', 'Prepare demo');
  await type(renderer, 'field-assignedTo', 'Asha Verma');
}

describe('CreateTaskScreen', () => {
  describe('form', () => {
    it('has all five fields with sensible defaults', async () => {
      const { renderer } = await setup();

      for (const id of [
        'field-title',
        'field-description',
        'field-assignedTo',
      ]) {
        expect(hasTestId(renderer, `${id}-input`)).toBe(true);
      }
      expect(isSelected(renderer, 'field-status-todo')).toBe(true);
      expect(isSelected(renderer, 'field-priority-medium')).toBe(true);
    });

    it('offers every supported status and priority with display labels', async () => {
      const { renderer } = await setup();
      expect(textsOf(renderer)).toEqual(
        expect.arrayContaining([
          'To Do',
          'In Progress',
          'Done',
          'Low',
          'Medium',
          'High',
          'Critical',
        ]),
      );
    });

    it('selecting a status or priority moves the selection', async () => {
      const { renderer } = await setup();
      await choose(renderer, 'field-status-in_progress');
      await choose(renderer, 'field-priority-critical');

      expect(isSelected(renderer, 'field-status-in_progress')).toBe(true);
      expect(isSelected(renderer, 'field-status-todo')).toBe(false);
      expect(isSelected(renderer, 'field-priority-critical')).toBe(true);
      expect(isSelected(renderer, 'field-priority-medium')).toBe(false);
    });

    it('shows character counters', async () => {
      const { renderer } = await setup();
      await type(renderer, 'field-title', 'Hello');
      expect(textsOf(renderer)).toEqual(
        expect.arrayContaining([
          `5/${TITLE_MAX_LENGTH}`,
          `0/${DESCRIPTION_MAX_LENGTH}`,
        ]),
      );
    });
  });

  describe('validation', () => {
    it('requires a title and an assignee, and does not save', async () => {
      const { renderer, repo, onCreated } = await setup();
      await submit(renderer);

      expect(errorOf(renderer, 'field-title')).toBe('Title is required');
      expect(errorOf(renderer, 'field-assignedTo')).toBe(
        'Assigned to is required',
      );
      expect(repo.createTask).not.toHaveBeenCalled();
      expect(onCreated).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only title or assignee as missing', async () => {
      const { renderer, repo } = await setup();
      await type(renderer, 'field-title', '   ');
      await type(renderer, 'field-assignedTo', '  ');
      await submit(renderer);

      expect(errorOf(renderer, 'field-title')).toBeDefined();
      expect(errorOf(renderer, 'field-assignedTo')).toBeDefined();
      expect(repo.createTask).not.toHaveBeenCalled();
    });

    it('rejects a title over the limit but accepts exactly the limit', async () => {
      const { renderer, repo } = await setup();
      await fillValid(renderer);

      await type(renderer, 'field-title', 'a'.repeat(TITLE_MAX_LENGTH + 1));
      await submit(renderer);
      expect(errorOf(renderer, 'field-title')).toContain(
        `at most ${TITLE_MAX_LENGTH}`,
      );
      expect(repo.createTask).not.toHaveBeenCalled();

      await type(renderer, 'field-title', 'a'.repeat(TITLE_MAX_LENGTH));
      await submit(renderer);
      expect(repo.createTask).toHaveBeenCalledTimes(1);
    });

    it('rejects a description over the limit', async () => {
      const { renderer, repo } = await setup();
      await fillValid(renderer);
      await type(
        renderer,
        'field-description',
        'a'.repeat(DESCRIPTION_MAX_LENGTH + 1),
      );
      await submit(renderer);

      expect(errorOf(renderer, 'field-description')).toContain(
        `at most ${DESCRIPTION_MAX_LENGTH}`,
      );
      expect(errorOf(renderer, 'field-title')).toBeUndefined();
      expect(repo.createTask).not.toHaveBeenCalled();
    });

    it('clears a field error when that field is edited, leaving the others', async () => {
      const { renderer } = await setup();
      await submit(renderer);
      expect(errorOf(renderer, 'field-title')).toBeDefined();

      await type(renderer, 'field-title', 'Now valid');

      expect(errorOf(renderer, 'field-title')).toBeUndefined();
      expect(errorOf(renderer, 'field-assignedTo')).toBeDefined();
    });
  });

  describe('submission', () => {
    it('sends the entered values to the repository and reports success once', async () => {
      const { renderer, repo, onCreated } = await setup();
      await type(renderer, 'field-title', 'Prepare demo');
      await type(renderer, 'field-description', 'Slides and walkthrough');
      await type(renderer, 'field-assignedTo', 'Asha Verma');
      await choose(renderer, 'field-status-in_progress');
      await choose(renderer, 'field-priority-critical');

      await submit(renderer);

      expect(repo.createTask).toHaveBeenCalledWith({
        title: 'Prepare demo',
        description: 'Slides and walkthrough',
        assignedTo: 'Asha Verma',
        status: 'in_progress',
        priority: 'critical',
      });
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('uses the defaults and an empty description when only required fields are filled', async () => {
      const { renderer, repo } = await setup();
      await fillValid(renderer);
      await submit(renderer);

      expect(repo.createTask).toHaveBeenCalledWith({
        title: 'Prepare demo',
        description: '',
        assignedTo: 'Asha Verma',
        status: 'todo',
        priority: 'medium',
      });
    });

    it('re-reads the list and summary from the repository after saving', async () => {
      const { renderer, repo } = await setup();
      await fillValid(renderer);
      await submit(renderer);

      expect(repo.getTasks).toHaveBeenCalled();
      expect(repo.getTaskSummary).toHaveBeenCalled();
    });

    it('shows a saving state and ignores a second press while saving', async () => {
      const gate = deferred<Task>();
      const { renderer, repo, onCreated } = await setup({
        createTask: jest.fn().mockReturnValue(gate.promise),
      });
      await fillValid(renderer);

      await submit(renderer);

      expect(textsOf(renderer)).toContain('Saving…');
      expect(byTestId(renderer, 'task-form-submit')[0].props.loading).toBe(
        true,
      );
      expect(byTestId(renderer, 'field-title-input')[0].props.editable).toBe(
        false,
      );
      expect(isSelected(renderer, 'field-status-todo')).toBe(true);
      expect(
        byTestId(renderer, 'field-status-done')[0].props.accessibilityState
          .disabled,
      ).toBe(true);

      await submit(renderer);
      expect(repo.createTask).toHaveBeenCalledTimes(1);
      expect(onCreated).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => gate.resolve(makeTask()));
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('does not navigate if the screen was closed while saving', async () => {
      const gate = deferred<Task>();
      const { renderer, onCreated } = await setup({
        createTask: jest.fn().mockReturnValue(gate.promise),
      });
      await fillValid(renderer);
      await submit(renderer);

      await ReactTestRenderer.act(async () => {
        renderer.unmount();
        gate.resolve(makeTask());
      });

      expect(onCreated).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('shows the repository error, keeps the input and stays on the form', async () => {
      const { renderer, onCreated } = await setup({
        createTask: jest.fn().mockRejectedValue(new Error('disk full')),
      });
      await fillValid(renderer);
      await submit(renderer);

      expect(hasTestId(renderer, 'task-form-error')).toBe(true);
      const texts = textsOf(renderer).join(' ');
      expect(texts).toContain("Couldn't save the task");
      expect(texts).toContain('disk full');
      expect(byTestId(renderer, 'field-title-input')[0].props.value).toBe(
        'Prepare demo',
      );
      expect(byTestId(renderer, 'field-assignedTo-input')[0].props.value).toBe(
        'Asha Verma',
      );
      expect(onCreated).not.toHaveBeenCalled();
    });

    it('is usable again after a failure: saving is re-enabled and a retry can succeed', async () => {
      const createTask = jest
        .fn()
        .mockRejectedValueOnce(new Error('disk full'))
        .mockResolvedValueOnce(makeTask());
      const { renderer, onCreated } = await setup({ createTask });
      await fillValid(renderer);

      await submit(renderer);
      expect(byTestId(renderer, 'task-form-submit')[0].props.loading).toBe(
        false,
      );
      expect(byTestId(renderer, 'field-title-input')[0].props.editable).toBe(
        true,
      );

      await submit(renderer);
      expect(createTask).toHaveBeenCalledTimes(2);
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('clears the error banner when the user edits a field', async () => {
      const { renderer } = await setup({
        createTask: jest.fn().mockRejectedValue(new Error('disk full')),
      });
      await fillValid(renderer);
      await submit(renderer);
      expect(hasTestId(renderer, 'task-form-error')).toBe(true);

      await type(renderer, 'field-title', 'Prepare demo v2');
      expect(hasTestId(renderer, 'task-form-error')).toBe(false);
    });

    it('shows field errors returned by the repository next to the right fields', async () => {
      const error = new TaskValidationError([
        { field: 'assignedTo', message: 'Assigned to is required' },
      ]);
      const { renderer, onCreated } = await setup({
        createTask: jest.fn().mockRejectedValue(error),
      });
      await fillValid(renderer);
      await submit(renderer);

      expect(errorOf(renderer, 'field-assignedTo')).toBe(
        'Assigned to is required',
      );
      expect(hasTestId(renderer, 'task-form-error')).toBe(false);
      expect(onCreated).not.toHaveBeenCalled();
    });

    it("doesn't show an error left over from an earlier write", async () => {
      const repo = createMockRepository({
        deleteTask: jest.fn().mockRejectedValue(new Error('stale')),
      });
      const store = createAppStore(repo);
      await store.dispatch(deleteTask('x'));
      expect(store.getState().tasks.mutation.status).toBe('failed');

      let renderer!: Renderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <CreateTaskScreen onCreated={jest.fn()} />
          </Provider>,
        );
      });
      rendered.push(renderer);

      expect(store.getState().tasks.mutation.status).toBe('idle');
      expect(hasTestId(renderer, 'task-form-error')).toBe(false);
    });
  });
});
