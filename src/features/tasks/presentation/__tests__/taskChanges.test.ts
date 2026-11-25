import { makeTask } from '../../../../test-utils/mockTaskRepository';
import { toFormValues } from '../components/TaskForm';
import { diffTaskChanges } from '../taskChanges';

const task = makeTask({
  title: 'Write report',
  description: 'Quarterly',
  assignedTo: 'Asha',
  status: 'todo',
  priority: 'medium',
});

describe('diffTaskChanges', () => {
  it('is empty when nothing changed', () => {
    expect(diffTaskChanges(task, toFormValues(task))).toEqual({});
  });

  it('ignores surrounding whitespace on title and assignee', () => {
    expect(
      diffTaskChanges(task, {
        ...toFormValues(task),
        title: '  Write report ',
        assignedTo: ' Asha  ',
      }),
    ).toEqual({});
  });

  it('includes only the fields that changed', () => {
    expect(
      diffTaskChanges(task, {
        ...toFormValues(task),
        title: 'Write the report',
        status: 'done',
      }),
    ).toEqual({ title: 'Write the report', status: 'done' });
  });

  it('can change every field', () => {
    expect(
      diffTaskChanges(task, {
        title: 'A',
        description: '',
        assignedTo: 'B',
        status: 'in_progress',
        priority: 'critical',
      }),
    ).toEqual({
      title: 'A',
      description: '',
      assignedTo: 'B',
      status: 'in_progress',
      priority: 'critical',
    });
  });
});

describe('toFormValues', () => {
  it('copies only the editable fields', () => {
    expect(toFormValues(task)).toEqual({
      title: 'Write report',
      description: 'Quarterly',
      assignedTo: 'Asha',
      status: 'todo',
      priority: 'medium',
    });
  });
});
