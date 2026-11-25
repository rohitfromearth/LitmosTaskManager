import { formatDate, formatDateTime } from '../formatDate';

describe('formatDate', () => {
  it('formats an ISO timestamp as a short date', () => {
    expect(formatDate('2026-11-25T12:00:00.000Z', 'en-GB')).toBe('25 Nov 2026');
    expect(formatDate('2026-11-25T12:00:00.000Z', 'en-US')).toBe(
      'Nov 25, 2026',
    );
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not a date')).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('includes the date and a time', () => {
    const text = formatDateTime('2026-11-25T12:00:00.000Z', 'en-US');
    expect(text).toContain('Nov');
    expect(text).toContain('2026');
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDateTime('not a date')).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});
