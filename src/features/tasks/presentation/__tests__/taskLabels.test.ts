import { TASK_PRIORITIES, TASK_STATUSES } from '../../domain/entities/Task';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';

describe('task labels', () => {
  it('uses the assignment wording for statuses', () => {
    expect(TASK_STATUSES.map(s => STATUS_LABELS[s])).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
  });

  it('uses the assignment wording for priorities', () => {
    expect(TASK_PRIORITIES.map(p => PRIORITY_LABELS[p])).toEqual([
      'Low',
      'Medium',
      'High',
      'Critical',
    ]);
  });
});
