import { Alert, type AlertButton } from 'react-native';
import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import { createAppStore } from '../../../../../app/store/createAppStore';
import {
  deferred,
  makeTask,
} from '../../../../../test-utils/mockTaskRepository';
import {
  byTestId,
  hasTestId,
  textsOf,
} from '../../../../../test-utils/renderHelpers';
import { createStatefulRepository } from '../../../../../test-utils/statefulRepository';
import { applyFilter } from '../../state/tasksSlice';
import {
  deleteTask,
  loadSummary,
  loadTasks,
  updateTask,
} from '../../state/tasksThunks';
import { EditTaskScreen } from '../EditTaskScreen';
import { TaskDetailsScreen } from '../TaskDetailsScreen';

type Renderer = ReactTestRenderer.ReactTestRenderer;

const rendered: Renderer[] = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    rendered.splice(0).forEach(r => r.unmount());
  });
  jest.restoreAllMocks();
});

const target = makeTask({
  id: 'a',
  title: 'Fix login crash',
  status: 'todo',
  priority: 'high',
});
const other = makeTask({
  id: 'b',
  title: 'Other task',
  status: 'done',
  priority: 'low',
});

async function setup() {
  const { repository, records } = createStatefulRepository([target, other]);
  const store = createAppStore(repository);
  await store.dispatch(loadTasks());
  await store.dispatch(loadSummary());

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onDeleted = jest.fn();
  const onEdit = jest.fn();
  const onBack = jest.fn();
  let renderer!: Renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <TaskDetailsScreen
          taskId="a"
          onEdit={onEdit}
          onDeleted={onDeleted}
          onBack={onBack}
        />
      </Provider>,
    );
  });
  rendered.push(renderer);
  return { repository, records, store, renderer, alert, onDeleted, onEdit };
}

const pressDelete = (renderer: Renderer) =>
  ReactTestRenderer.act(async () => {
    byTestId(renderer, 'task-details-delete')[0].props.onPress();
  });

/** The buttons of the most recent confirmation dialog. */
const dialog = (alert: jest.SpyInstance) => {
  const [title, message, buttons] = alert.mock.calls.at(-1) as [
    string,
    string,
    AlertButton[],
  ];
  return { title, message, buttons };
};

const tapDialog = (alert: jest.SpyInstance, text: string) =>
  ReactTestRenderer.act(async () => {
    dialog(alert).buttons.find(b => b.text === text)!.onPress!();
  });

describe('deleting a task', () => {
  describe('confirmation', () => {
    it('asks first, naming the task and explaining the effect, and deletes nothing yet', async () => {
      const { renderer, alert, repository } = await setup();
      await pressDelete(renderer);

      expect(alert).toHaveBeenCalledTimes(1);
      const { title, message, buttons } = dialog(alert);
      expect(title).toBe('Delete task?');
      expect(message).toContain('Fix login crash');
      expect(message).toContain('removed from your active task list');
      expect(buttons.map(b => b.text)).toEqual(['Cancel', 'Delete']);
      expect(buttons[0].style).toBe('cancel');
      expect(buttons[1].style).toBe('destructive');
      expect(repository.deleteTask).not.toHaveBeenCalled();
    });

    it('Cancel leaves the task unchanged and the screen as it was', async () => {
      const { renderer, alert, repository, records, onDeleted } = await setup();
      await pressDelete(renderer);
      await tapDialog(alert, 'Cancel');

      expect(repository.deleteTask).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
      expect(records().find(t => t.id === 'a')?.isDeleted).toBe(false);
      expect(hasTestId(renderer, 'task-details')).toBe(true);
      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(false);
      expect(byTestId(renderer, 'task-details-delete')[0].props.loading).toBe(
        false,
      );
    });

    it('can be asked again after cancelling, but not twice at once', async () => {
      const { renderer, alert } = await setup();
      await pressDelete(renderer);
      await pressDelete(renderer); // dialog still open
      expect(alert).toHaveBeenCalledTimes(1);

      await tapDialog(alert, 'Cancel');
      await pressDelete(renderer);
      expect(alert).toHaveBeenCalledTimes(2);
    });

    it('can be asked again after the dialog is dismissed', async () => {
      const { renderer, alert } = await setup();
      await pressDelete(renderer);
      const options = alert.mock.calls[0][3] as { onDismiss: () => void };
      await ReactTestRenderer.act(async () => options.onDismiss());

      await pressDelete(renderer);
      expect(alert).toHaveBeenCalledTimes(2);
    });
  });

  describe('confirming', () => {
    it('dispatches the delete thunk, soft-deletes, and reports success once', async () => {
      const { renderer, alert, repository, records, onDeleted } = await setup();
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(repository.deleteTask).toHaveBeenCalledTimes(1);
      expect(repository.deleteTask).toHaveBeenCalledWith('a');
      expect(onDeleted).toHaveBeenCalledTimes(1);

      // Soft delete: the record is kept and flagged, never removed.
      const record = records().find(t => t.id === 'a');
      expect(record).toBeDefined();
      expect(record?.isDeleted).toBe(true);
      expect(records()).toHaveLength(2);
    });

    it('refreshes the list and the summary so counts stay accurate', async () => {
      const { store, renderer, alert } = await setup();
      expect(store.getState().tasks.items.map(t => t.id)).toEqual(['a', 'b']);
      expect(store.getState().tasks.summary?.byStatus.todo).toBe(1);

      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(store.getState().tasks.items.map(t => t.id)).toEqual(['b']);
      expect(store.getState().tasks.summary?.byStatus).toEqual({
        todo: 0,
        in_progress: 0,
        done: 1,
      });
      expect(store.getState().tasks.summary?.byPriority.high).toBe(0);
    });

    it('keeps the active filter and leaves other tasks alone', async () => {
      const { store, renderer, alert, records } = await setup();
      await ReactTestRenderer.act(async () => {
        await store.dispatch(applyFilter({ status: 'done' }));
      });
      expect(store.getState().tasks.items.map(t => t.id)).toEqual(['b']);

      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(store.getState().tasks.filter).toEqual({ status: 'done' });
      expect(store.getState().tasks.items.map(t => t.id)).toEqual(['b']);
      expect(records().find(t => t.id === 'b')).toEqual(other);
    });

    it('clears the loaded task from the store', async () => {
      const { store, renderer, alert } = await setup();
      expect(store.getState().tasks.detail.task?.id).toBe('a');

      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(store.getState().tasks.detail).toMatchObject({
        taskId: null,
        task: null,
      });
    });

    it('keeps showing the task while the screen leaves, instead of a spinner', async () => {
      const { renderer, alert } = await setup();
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(hasTestId(renderer, 'task-details')).toBe(true);
      expect(hasTestId(renderer, 'task-detail-loading')).toBe(false);
      expect(hasTestId(renderer, 'task-detail-missing')).toBe(false);
      expect(byTestId(renderer, 'task-details-delete')[0].props.disabled).toBe(
        true,
      );
    });
  });

  describe('while deleting', () => {
    it('shows progress, locks Edit and Delete, and ignores repeated presses', async () => {
      const { renderer, alert, repository, onDeleted } = await setup();
      const gate = deferred<void>();
      repository.deleteTask.mockReturnValueOnce(gate.promise);

      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(textsOf(renderer)).toContain('Deleting…');
      expect(byTestId(renderer, 'task-details-delete')[0].props.loading).toBe(
        true,
      );
      expect(byTestId(renderer, 'task-details-edit')[0].props.disabled).toBe(
        true,
      );

      // Another press must not open a new dialog, and a stale confirm must not delete again.
      const firstDialog = dialog(alert);
      await pressDelete(renderer);
      expect(alert).toHaveBeenCalledTimes(1);
      await ReactTestRenderer.act(async () =>
        firstDialog.buttons.find(b => b.text === 'Delete')!.onPress!(),
      );
      expect(repository.deleteTask).toHaveBeenCalledTimes(1);
      expect(onDeleted).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => gate.resolve());
      expect(repository.deleteTask).toHaveBeenCalledTimes(1);
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    it('does not navigate if the screen was closed mid-delete', async () => {
      const { renderer, alert, repository, onDeleted } = await setup();
      const gate = deferred<void>();
      repository.deleteTask.mockReturnValueOnce(gate.promise);
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      await ReactTestRenderer.act(async () => {
        renderer.unmount();
        gate.resolve();
      });
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });

  describe('failure and retry', () => {
    it('shows the error, keeps the task, and stays on the screen', async () => {
      const { renderer, alert, repository, records, onDeleted, store } =
        await setup();
      repository.deleteTask.mockRejectedValueOnce(new Error('disk full'));
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(true);
      expect(textsOf(renderer).join(' ')).toContain(
        "Couldn't delete the task. disk full",
      );
      expect(onDeleted).not.toHaveBeenCalled();
      expect(hasTestId(renderer, 'task-details')).toBe(true);
      expect(records().find(t => t.id === 'a')?.isDeleted).toBe(false);
      expect(store.getState().tasks.items.map(t => t.id)).toEqual(['a', 'b']);
      // Buttons are usable again.
      expect(byTestId(renderer, 'task-details-delete')[0].props.loading).toBe(
        false,
      );
      expect(byTestId(renderer, 'task-details-edit')[0].props.disabled).toBe(
        false,
      );
    });

    it('Try again deletes without asking twice, then succeeds', async () => {
      const { renderer, alert, repository, records, onDeleted } = await setup();
      repository.deleteTask.mockRejectedValueOnce(new Error('disk full'));
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');

      await ReactTestRenderer.act(async () => {
        byTestId(
          renderer,
          'task-details-delete-error-action',
        )[0].props.onPress();
      });

      expect(alert).toHaveBeenCalledTimes(1);
      expect(repository.deleteTask).toHaveBeenCalledTimes(2);
      expect(onDeleted).toHaveBeenCalledTimes(1);
      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(false);
      expect(records().find(t => t.id === 'a')?.isDeleted).toBe(true);
    });

    it('clears the error when a new delete is started from the dialog', async () => {
      const { renderer, alert, repository } = await setup();
      const gate = deferred<void>();
      repository.deleteTask
        .mockRejectedValueOnce(new Error('disk full'))
        .mockReturnValueOnce(gate.promise);
      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');
      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(true);

      await pressDelete(renderer);
      await tapDialog(alert, 'Delete');
      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(false);

      await ReactTestRenderer.act(async () => gate.resolve());
    });

    it("isn't affected by an error from an unrelated edit save", async () => {
      const { renderer, store, repository } = await setup();
      repository.updateTask.mockRejectedValueOnce(new Error('edit failed'));
      await ReactTestRenderer.act(async () => {
        await store.dispatch(updateTask({ id: 'a', changes: { title: 'x' } }));
      });
      expect(store.getState().tasks.mutation.status).toBe('failed');
      expect(hasTestId(renderer, 'task-details-delete-error')).toBe(false);
    });
  });

  describe('deleted tasks cannot be opened', () => {
    async function openAfterDelete(screen: 'details' | 'edit') {
      const { repository, store } = await setup();
      await ReactTestRenderer.act(async () => {
        await store.dispatch(deleteTask('a'));
      });
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      let renderer!: Renderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            {screen === 'details' ? (
              <TaskDetailsScreen
                taskId="a"
                onEdit={jest.fn()}
                onDeleted={jest.fn()}
                onBack={jest.fn()}
              />
            ) : (
              <EditTaskScreen
                taskId="a"
                onUpdated={jest.fn()}
                onBack={jest.fn()}
              />
            )}
          </Provider>,
        );
      });
      rendered.push(renderer);
      return { repository, renderer };
    }

    it('Task Details shows not-found for a deleted task', async () => {
      const { renderer } = await openAfterDelete('details');
      expect(hasTestId(renderer, 'task-detail-missing')).toBe(true);
      expect(hasTestId(renderer, 'task-details')).toBe(false);
      expect(hasTestId(renderer, 'task-details-delete')).toBe(false);
    });

    it('Edit shows not-found for a deleted task and offers no form', async () => {
      const { renderer } = await openAfterDelete('edit');
      expect(hasTestId(renderer, 'task-detail-missing')).toBe(true);
      expect(hasTestId(renderer, 'task-form')).toBe(false);
    });

    it('the repository refuses to update a deleted task', async () => {
      const { repository } = await openAfterDelete('details');
      await expect(
        repository.updateTask('a', { title: 'Zombie' }),
      ).rejects.toThrow('Task not found');
    });
  });
});
