import type { Task } from '../../entities/Task';
import { applyTaskChanges, buildTask, markTaskDeleted } from '../taskRules';
import { TaskValidationError } from '../taskValidation';

const T0 = '2026-11-25T00:00:00.000Z';
const T1 = '2026-11-25T01:00:00.000Z';

const input = {
  title: '  Write report ',
  description: 'Quarterly',
  status: 'todo' as const,
  priority: 'critical' as const,
  assignedTo: ' Asha ',
};

const existing: Task = buildTask(input, 'task-1', T0);

describe('buildTask', () => {
  it('sets managed fields and trims text', () => {
    expect(existing).toEqual({
      id: 'task-1',
      title: 'Write report',
      description: 'Quarterly',
      status: 'todo',
      priority: 'critical',
      assignedTo: 'Asha',
      createdDate: T0,
      modifiedDate: T0,
      isDeleted: false,
    });
  });

  it('throws TaskValidationError with field details for invalid input', () => {
    expect.assertions(2);
    try {
      buildTask({ ...input, title: '' }, 'task-2', T0);
    } catch (e) {
      expect(e).toBeInstanceOf(TaskValidationError);
      expect((e as TaskValidationError).errors[0].field).toBe('title');
    }
  });
});

describe('applyTaskChanges', () => {
  it('changes only the provided fields and bumps modifiedDate', () => {
    const updated = applyTaskChanges(existing, { status: 'done' }, T1);
    expect(updated).toEqual({
      ...existing,
      status: 'done',
      modifiedDate: T1,
    });
  });

  it('keeps id and createdDate unchanged', () => {
    const updated = applyTaskChanges(existing, { title: 'New' }, T1);
    expect(updated.id).toBe(existing.id);
    expect(updated.createdDate).toBe(T0);
  });

  it('reassigns and trims the assignee', () => {
    expect(
      applyTaskChanges(existing, { assignedTo: ' Ravi ' }, T1).assignedTo,
    ).toBe('Ravi');
  });

  it('does not mutate the original task', () => {
    applyTaskChanges(existing, { title: 'New' }, T1);
    expect(existing.title).toBe('Write report');
  });

  it('rejects invalid changes', () => {
    expect(() => applyTaskChanges(existing, { title: ' ' }, T1)).toThrow(
      TaskValidationError,
    );
  });

  it('rejects updates to a deleted task', () => {
    const deleted = markTaskDeleted(existing, T1);
    expect(() => applyTaskChanges(deleted, { title: 'New' }, T1)).toThrow(
      'deleted',
    );
  });
});

describe('markTaskDeleted', () => {
  it('soft deletes: flags the task and bumps modifiedDate, keeping the data', () => {
    const deleted = markTaskDeleted(existing, T1);
    expect(deleted).toEqual({ ...existing, isDeleted: true, modifiedDate: T1 });
  });

  it('is a no-op for an already deleted task', () => {
    const deleted = markTaskDeleted(existing, T1);
    expect(markTaskDeleted(deleted, '2026-11-26T00:00:00.000Z')).toBe(deleted);
  });
});
