import { hasActiveFilter, mergeFilter } from '../taskFilter';

describe('mergeFilter', () => {
  it('adds a field to the current filter', () => {
    expect(mergeFilter({ status: 'todo' }, { priority: 'high' })).toEqual({
      status: 'todo',
      priority: 'high',
    });
  });

  it('replaces an existing field', () => {
    expect(mergeFilter({ status: 'todo' }, { status: 'done' })).toEqual({
      status: 'done',
    });
  });

  it('removes a field set to undefined', () => {
    expect(
      mergeFilter({ status: 'todo', priority: 'low' }, { status: undefined }),
    ).toEqual({ priority: 'low' });
  });

  it('trims the keyword and drops a blank one', () => {
    expect(mergeFilter({}, { keyword: '  login ' })).toEqual({
      keyword: 'login',
    });
    expect(mergeFilter({ keyword: 'login' }, { keyword: '   ' })).toEqual({});
    expect(mergeFilter({ keyword: 'login' }, { keyword: '' })).toEqual({});
  });

  it('does not change the input', () => {
    const filter = { status: 'todo' as const };
    mergeFilter(filter, { status: 'done' });
    expect(filter).toEqual({ status: 'todo' });
  });
});

describe('hasActiveFilter', () => {
  it('is false for no filter and for blank values', () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(hasActiveFilter({ keyword: '  ' })).toBe(false);
    expect(hasActiveFilter({ status: undefined })).toBe(false);
  });

  it('is true when any field narrows the list', () => {
    expect(hasActiveFilter({ status: 'done' })).toBe(true);
    expect(hasActiveFilter({ priority: 'low' })).toBe(true);
    expect(hasActiveFilter({ keyword: 'x' })).toBe(true);
  });
});
