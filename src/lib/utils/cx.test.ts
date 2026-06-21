import { describe, it, expect } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('joins truthy strings and drops falsy values', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('flattens nested arrays', () => {
    expect(cx('a', ['b', ['c', false], 'd'])).toBe('a b c d');
  });

  it('includes object keys whose values are truthy', () => {
    expect(cx('base', { active: true, disabled: false, open: 1 as never })).toBe(
      'base active open'
    );
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null, undefined, '')).toBe('');
  });
});
