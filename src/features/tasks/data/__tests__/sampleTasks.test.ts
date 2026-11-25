import { TASK_PRIORITIES, TASK_STATUSES } from '../../domain/entities/Task';
import { validateNewTask } from '../../domain/rules/taskValidation';
import { buildSampleTasks } from '../seed/sampleTasks';

const NOW = '2026-11-25T00:00:00.000Z';
const samples = buildSampleTasks(NOW);

describe('buildSampleTasks', () => {
  it('provides at least 10 tasks with unique ids', () => {
    expect(samples.length).toBeGreaterThanOrEqual(10);
    expect(new Set(samples.map(t => t.id)).size).toBe(samples.length);
  });

  it('covers every status and every priority', () => {
    expect(new Set(samples.map(t => t.status))).toEqual(new Set(TASK_STATUSES));
    expect(new Set(samples.map(t => t.priority))).toEqual(
      new Set(TASK_PRIORITIES),
    );
  });

  it('produces valid, non-deleted tasks created in the past', () => {
    for (const task of samples) {
      expect(validateNewTask(task)).toEqual([]);
      expect(task.isDeleted).toBe(false);
      expect(task.createdDate < NOW).toBe(true);
      expect(task.modifiedDate).toBe(task.createdDate);
    }
  });

  it('is deterministic for a given time', () => {
    expect(buildSampleTasks(NOW)).toEqual(samples);
  });
});
