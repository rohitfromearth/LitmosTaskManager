import type { IsoDateString, Task } from '../../domain/entities/Task';
import type { NewTask } from '../../domain/repositories/TaskRepository';
import { buildTask } from '../../domain/rules/taskRules';

const SAMPLES: NewTask[] = [
  {
    title: 'Set up project repository',
    description:
      'Create the repo, add the README and agree the branching approach.',
    status: 'done',
    priority: 'high',
    assignedTo: 'Asha Verma',
  },
  {
    title: 'Design task list screen',
    description:
      'Sketch the list with status and priority filters and a search box.',
    status: 'done',
    priority: 'medium',
    assignedTo: 'Ravi Kumar',
  },
  {
    title: 'Fix crash on login timeout',
    description:
      'The app closes when the auth request times out on a slow network.',
    status: 'in_progress',
    priority: 'critical',
    assignedTo: 'Meera Nair',
  },
  {
    title: 'Write API integration tests',
    description: 'Cover create, update and delete against the staging backend.',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'Asha Verma',
  },
  {
    title: 'Update onboarding copy',
    description: 'Replace placeholder text on the welcome screens.',
    status: 'todo',
    priority: 'low',
    assignedTo: 'Sam Patel',
  },
  {
    title: 'Prepare sprint demo',
    description:
      'Collect screenshots and a short walkthrough of finished work.',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'Ravi Kumar',
  },
  {
    title: 'Investigate slow startup',
    description: 'Profile the cold start and list the three biggest costs.',
    status: 'in_progress',
    priority: 'medium',
    assignedTo: 'Meera Nair',
  },
  {
    title: 'Security review of data storage',
    description:
      'Check what is stored on the device and whether it needs encryption.',
    status: 'todo',
    priority: 'critical',
    assignedTo: 'Sam Patel',
  },
  {
    title: 'Add dark mode colours',
    description: 'Define the dark palette and check contrast.',
    status: 'todo',
    priority: 'low',
    assignedTo: 'Asha Verma',
  },
  {
    title: 'Archive old project documents',
    description: 'Move last quarter documents to the shared archive.',
    status: 'done',
    priority: 'low',
    assignedTo: 'Sam Patel',
  },
  {
    title: 'Review pull request backlog',
    description: 'Clear the open pull requests older than a week.',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'Ravi Kumar',
  },
  {
    title: 'Plan release checklist',
    description: 'List the steps and owners for the first release build.',
    status: 'todo',
    priority: 'high',
    assignedTo: 'Meera Nair',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Builds the sample tasks with fixed ids (sample-1 ...). Dates are spread over
 * the past days, first sample oldest, so the list has a realistic order.
 */
export function buildSampleTasks(now: IsoDateString): Task[] {
  const base = new Date(now).getTime();
  return SAMPLES.map((sample, index) => {
    const when = new Date(
      base - (SAMPLES.length - index) * DAY_MS,
    ).toISOString();
    return buildTask(sample, `sample-${index + 1}`, when);
  });
}
