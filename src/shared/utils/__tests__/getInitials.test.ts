import { getInitials } from '../getInitials';

describe('getInitials', () => {
  it('uses the first and last word', () => {
    expect(getInitials('Asha Verma')).toBe('AV');
    expect(getInitials('Mary Jane Watson')).toBe('MW');
  });

  it('handles single names, extra spaces and lowercase', () => {
    expect(getInitials('sam')).toBe('S');
    expect(getInitials('  ravi   kumar ')).toBe('RK');
  });

  it('falls back to ? for a blank name', () => {
    expect(getInitials('   ')).toBe('?');
  });
});
