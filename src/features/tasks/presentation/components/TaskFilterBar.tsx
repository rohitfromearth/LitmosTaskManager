import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ChoiceGroup,
  type ChoiceOption,
} from '../../../../shared/components/ChoiceGroup';
import { colors, radius, spacing } from '../../../../shared/theme/theme';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '../../domain/entities/Task';
import { useTasksDispatch, useTasksSelector } from '../state/hooks';
import { applyFilter, selectTaskFilter } from '../state/tasksSlice';
import { hasActiveFilter, mergeFilter } from '../taskFilter';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';

/** How long typing must pause before the keyword is sent to the repository. */
export const SEARCH_DEBOUNCE_MS = 300;

type Choice<T extends string> = T | 'all';

const STATUS_OPTIONS: ChoiceOption<Choice<TaskStatus>>[] = [
  { value: 'all', label: 'All' },
  ...TASK_STATUSES.map(value => ({ value, label: STATUS_LABELS[value] })),
];
const PRIORITY_OPTIONS: ChoiceOption<Choice<TaskPriority>>[] = [
  { value: 'all', label: 'All' },
  ...TASK_PRIORITIES.map(value => ({ value, label: PRIORITY_LABELS[value] })),
];

/**
 * Search box and status/priority filters. It only edits the Redux `filter`
 * (through `applyFilter`); the repository query does the filtering. The typed
 * text is local so the keyword can be debounced; everything else is read from
 * the store, so filters survive leaving and returning to the list.
 */
export function TaskFilterBar() {
  const dispatch = useTasksDispatch();
  const filter = useTasksSelector(selectTaskFilter);
  const [text, setText] = useState(filter.keyword ?? '');

  // Debounce: send the keyword once typing pauses. Every keystroke cancels the
  // pending timer; a change to the filter restarts it with the latest filter.
  useEffect(() => {
    const keyword = text.trim();
    if (keyword === (filter.keyword ?? '')) {
      return;
    }
    const timer = setTimeout(() => {
      dispatch(applyFilter(mergeFilter(filter, { keyword })));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, filter, dispatch]);

  // If the keyword is changed elsewhere (for example "Clear filters" on the
  // empty state), show it in the box. Typing doesn't trigger this: the stored
  // keyword only changes after the debounce, when the text already matches.
  useEffect(() => {
    setText(current =>
      current.trim() === (filter.keyword ?? '')
        ? current
        : filter.keyword ?? '',
    );
  }, [filter.keyword]);

  const applyNow = (patch: Parameters<typeof mergeFilter>[1]) => {
    // Include what's typed so one query covers a pending keyword too.
    dispatch(applyFilter(mergeFilter(filter, { keyword: text, ...patch })));
  };

  const clearSearch = () => {
    setText('');
    if (filter.keyword) {
      dispatch(applyFilter(mergeFilter(filter, { keyword: '' })));
    }
  };

  const clearAll = () => {
    setText('');
    dispatch(applyFilter({}));
  };

  const isActive = hasActiveFilter(filter) || text.trim() !== '';

  return (
    <View style={styles.container} testID="task-filter-bar">
      <View style={[styles.search, text.length > 0 && styles.searchActive]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => applyNow({})}
          placeholder="Search title or description"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search tasks"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          testID="task-search-input"
        />
        {text.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={clearSearch}
            style={styles.clearSearch}
            testID="task-search-clear"
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <ChoiceGroup
        label="Status"
        options={STATUS_OPTIONS}
        value={filter.status ?? 'all'}
        onChange={value =>
          applyNow({ status: value === 'all' ? undefined : value })
        }
        testID="filter-status"
      />
      <ChoiceGroup
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={filter.priority ?? 'all'}
        onChange={value =>
          applyNow({ priority: value === 'all' ? undefined : value })
        }
        testID="filter-priority"
      />

      {isActive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
          onPress={clearAll}
          style={styles.clearAll}
          testID="clear-filters"
        >
          <Text style={styles.clearAllText}>Clear all filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.md - 4,
    backgroundColor: colors.surface,
  },
  searchActive: { borderColor: colors.primary },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearSearch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: { fontSize: 16, color: colors.textMuted },
  clearAll: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  clearAllText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
