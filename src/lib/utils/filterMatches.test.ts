import { describe, it, expect } from 'vitest';
import { filterMatches } from './filterMatches';

const REPLIES = [
  'Thanks so much for reaching out!',
  'Thanks for the quick turnaround.',
  'Happy to help — let me take a look.',
  'Looking forward to hearing from you.',
  'Hope you have a great rest of your week!',
];

describe('filterMatches', () => {
  it('returns nothing for an empty / whitespace query', () => {
    expect(filterMatches('', REPLIES, 'substring')).toEqual([]);
    expect(filterMatches('   ', REPLIES, 'substring')).toEqual([]);
  });

  describe('substring mode', () => {
    it('matches the query anywhere in the suggestion, case-insensitively', () => {
      expect(filterMatches('week', REPLIES, 'substring')).toEqual([
        'Hope you have a great rest of your week!',
      ]);
      expect(filterMatches('HELP', REPLIES, 'substring')).toEqual([
        'Happy to help — let me take a look.',
      ]);
    });

    it('returns every suggestion that contains the query', () => {
      expect(filterMatches('Thanks', REPLIES, 'substring')).toEqual([
        'Thanks so much for reaching out!',
        'Thanks for the quick turnaround.',
      ]);
    });

    it('preserves the original ordering of the source list', () => {
      const matches = filterMatches('o', REPLIES, 'substring');
      expect(matches).toEqual(REPLIES.filter((s) => s.toLowerCase().includes('o')));
    });
  });

  describe('startsWith mode', () => {
    it('only matches from the beginning of the suggestion', () => {
      expect(filterMatches('Thanks', REPLIES, 'startsWith')).toEqual([
        'Thanks so much for reaching out!',
        'Thanks for the quick turnaround.',
      ]);
      // "week" appears mid-sentence, so startsWith finds nothing.
      expect(filterMatches('week', REPLIES, 'startsWith')).toEqual([]);
    });

    it('is case-insensitive', () => {
      expect(filterMatches('happy', REPLIES, 'startsWith')).toEqual([
        'Happy to help — let me take a look.',
      ]);
    });
  });

  describe('fuzzy mode', () => {
    it('matches non-contiguous character runs', () => {
      // "hpy" -> H..a..ppy
      expect(filterMatches('hpy', REPLIES, 'fuzzy')).toContain(
        'Happy to help — let me take a look.'
      );
    });

    it('ranks a contiguous run ahead of a scattered one (run-length scoring)', () => {
      // "ha" contiguous beats "h" + gap + "a": the unbroken run scores higher.
      const matches = filterMatches('ha', ['hxa', 'ha'], 'fuzzy');
      expect(matches[0]).toBe('ha');
    });

    it('falls back to source order when two matches score equally', () => {
      // Both contain a contiguous "ha", so scores tie and original order holds.
      const matches = filterMatches('ha', ['ZZha', 'ha start'], 'fuzzy');
      expect(matches).toEqual(['ZZha', 'ha start']);
    });

    it('drops suggestions that do not contain all query chars in order', () => {
      expect(filterMatches('zzz', REPLIES, 'fuzzy')).toEqual([]);
    });
  });
});
