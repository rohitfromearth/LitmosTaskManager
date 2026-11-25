import { TASK_PRIORITIES, TASK_STATUSES } from '../../entities/Task';
import type { NewTask } from '../../repositories/TaskRepository';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateNewTask,
  validateTaskChanges,
} from '../taskValidation';

const valid: NewTask = {
  title: 'Write report',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignedTo: 'Asha',
};

const fieldsOf = (errors: { field: string }[]) => errors.map(e => e.field);

describe('validateNewTask', () => {
  it('accepts a valid task, including every status and priority', () => {
    expect(validateNewTask(valid)).toEqual([]);
    for (const status of TASK_STATUSES) {
      expect(validateNewTask({ ...valid, status })).toEqual([]);
    }
    for (const priority of TASK_PRIORITIES) {
      expect(validateNewTask({ ...valid, priority })).toEqual([]);
    }
  });

  it('rejects a blank or whitespace-only title', () => {
    expect(fieldsOf(validateNewTask({ ...valid, title: '   ' }))).toEqual([
      'title',
    ]);
  });

  it('enforces the title and description length limits', () => {
    const longTitle = 'a'.repeat(TITLE_MAX_LENGTH + 1);
    const longDescription = 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1);
    expect(
      fieldsOf(
        validateNewTask({
          ...valid,
          title: longTitle,
          description: longDescription,
        }),
      ),
    ).toEqual(['title', 'description']);
    expect(
      validateNewTask({ ...valid, title: 'a'.repeat(TITLE_MAX_LENGTH) }),
    ).toEqual([]);
  });

  it('rejects unknown status and priority values', () => {
    const bad = { ...valid, status: 'completed', priority: 'urgent' } as never;
    expect(fieldsOf(validateNewTask(bad))).toEqual(['status', 'priority']);
  });

  it('rejects a blank assignee', () => {
    expect(fieldsOf(validateNewTask({ ...valid, assignedTo: ' ' }))).toEqual([
      'assignedTo',
    ]);
  });

  it('reports missing required fields', () => {
    const errors = validateNewTask({
      description: '',
    } as never);
    expect(fieldsOf(errors)).toEqual([
      'title',
      'status',
      'priority',
      'assignedTo',
    ]);
  });
});

describe('validateTaskChanges', () => {
  it('accepts an empty change set and partial changes', () => {
    expect(validateTaskChanges({})).toEqual([]);
    expect(validateTaskChanges({ status: 'done' })).toEqual([]);
  });

  it('treats undefined as unchanged but still validates provided fields', () => {
    expect(validateTaskChanges({ title: undefined })).toEqual([]);
    expect(fieldsOf(validateTaskChanges({ title: '' }))).toEqual(['title']);
  });

  it('rejects a blank assignee in changes', () => {
    expect(fieldsOf(validateTaskChanges({ assignedTo: '' }))).toEqual([
      'assignedTo',
    ]);
  });
});
