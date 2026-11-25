import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { formatDate } from '../../../../../shared/utils/formatDate';
import { makeTask } from '../../../../../test-utils/mockTaskRepository';
import { byTestId, textsOf } from '../../../../../test-utils/renderHelpers';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../../domain/entities/Task';
import { PRIORITY_COLORS } from '../../taskColors';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../taskLabels';
import { TaskCard } from '../TaskCard';

function render(task = makeTask()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<TaskCard task={task} />);
  });
  return renderer;
}

describe('TaskCard', () => {
  it('shows title, description, status and priority labels, assignee', () => {
    const texts = textsOf(
      render(
        makeTask({
          title: 'Fix login crash',
          description: 'Happens on slow networks',
          status: 'in_progress',
          priority: 'critical',
          assignedTo: 'Meera Nair',
        }),
      ),
    );

    expect(texts).toEqual(
      expect.arrayContaining([
        'Fix login crash',
        'Happens on slow networks',
        'In Progress',
        'Critical',
        'Meera Nair',
        'MN',
      ]),
    );
  });

  it('shows the display label for every status and priority', () => {
    for (const status of TASK_STATUSES) {
      expect(textsOf(render(makeTask({ status })))).toContain(
        STATUS_LABELS[status],
      );
    }
    for (const priority of TASK_PRIORITIES) {
      expect(textsOf(render(makeTask({ priority })))).toContain(
        PRIORITY_LABELS[priority],
      );
    }
  });

  it('truncates long text instead of growing the card', () => {
    const renderer = render(
      makeTask({ title: 'T'.repeat(300), description: 'D'.repeat(500) }),
    );
    const lines = renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.numberOfLines);
    expect(lines).toEqual(expect.arrayContaining([2, 2]));
  });

  it('omits the description line when there is none', () => {
    const texts = textsOf(
      render(makeTask({ title: 'Only title', description: '' })),
    );
    expect(texts).toContain('Only title');
    expect(texts.filter(t => t === '')).toEqual([]);
  });

  it('shows the created date for an unchanged task', () => {
    const task = makeTask();
    expect(textsOf(render(task))).toContain(
      `Created ${formatDate(task.createdDate)}`,
    );
  });

  it('shows the updated date once the task has been modified', () => {
    const task = makeTask({ modifiedDate: '2026-12-02T10:00:00.000Z' });
    const texts = textsOf(render(task));
    expect(texts).toContain(`Updated ${formatDate(task.modifiedDate)}`);
    expect(texts.some(t => t.startsWith('Created'))).toBe(false);
  });

  it('calls onPress with the task id, and is a button for accessibility', () => {
    const onPress = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TaskCard task={makeTask({ id: 'abc' })} onPress={onPress} />,
      );
    });
    const [card] = byTestId(renderer, 'task-card');
    expect(card.props.accessibilityRole).toBe('button');

    ReactTestRenderer.act(() => card.props.onPress());
    expect(onPress).toHaveBeenCalledWith('abc');
  });

  it('colors the strip by priority and exposes an accessibility summary', () => {
    const renderer = render(
      makeTask({ priority: 'high', status: 'done', assignedTo: 'Sam' }),
    );
    const [card] = byTestId(renderer, 'task-card');
    expect(card.props.accessibilityLabel).toContain(
      'Done, High priority. Assigned to Sam',
    );

    const strip = renderer.root.findAll(
      node =>
        StyleSheet.flatten(node.props.style)?.backgroundColor ===
        PRIORITY_COLORS.high.text,
    );
    expect(strip.length).toBeGreaterThan(0);
  });
});
