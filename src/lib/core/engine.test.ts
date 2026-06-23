import { describe, it, expect } from 'vitest';
import {
  getSuggestionParts,
  getCompletionContext,
  getChangeStart,
  findActiveTrigger,
  buildTriggerCompletions,
  buildNormalCompletion,
  nextWordLength,
  splitGhostWords,
  computeWholeMatches,
  joinIds,
} from './engine';

const REPLIES = [
  'Thanks so much for reaching out!',
  'Thanks for the quick turnaround.',
  'Happy to help — let me take a look.',
  'Looking forward to hearing from you.',
  'Hope you have a great rest of your week!',
];

describe('engine — getSuggestionParts', () => {
  it('splits a suggestion around the typed text (case-insensitive)', () => {
    expect(getSuggestionParts('Hope you have a great week!', 'week')).toEqual({
      prefix: 'Hope you have a great ',
      typed: 'week',
      suffix: '!',
    });
  });

  it('returns null when the typed text is absent', () => {
    expect(getSuggestionParts('Hello', 'xyz')).toBeNull();
  });

  it('returns null for empty inputs', () => {
    expect(getSuggestionParts('', 'x')).toBeNull();
    expect(getSuggestionParts('x', '')).toBeNull();
  });
});

describe('engine — getCompletionContext', () => {
  it('starts the query after leading whitespace in the active segment', () => {
    const ctx = getCompletionContext('Hello.  Thanks', 6);
    expect(ctx.queryStart).toBe(8);
    expect(ctx.query).toBe('Thanks');
  });

  it('clamps an out-of-range segment start', () => {
    const ctx = getCompletionContext('abc', 99);
    expect(ctx.queryStart).toBe(3);
    expect(ctx.query).toBe('');
  });
});

describe('engine — getChangeStart', () => {
  it('finds the first differing index', () => {
    expect(getChangeStart('abc', 'abX')).toBe(2);
    expect(getChangeStart('abc', 'abc')).toBe(3);
    expect(getChangeStart('', 'a')).toBe(0);
  });
});

describe('engine — findActiveTrigger / buildTriggerCompletions', () => {
  it('activates a symbol trigger anywhere in the segment', () => {
    const active = findActiveTrigger('john@g', 0, [
      { trigger: '@', suggestions: ['gmail.com', 'outlook.com'] },
    ]);
    expect(active).not.toBeNull();
    expect(active!.query).toBe('g');
    expect(active!.queryStart).toBe(5);
  });

  it('activates a word trigger only at a boundary', () => {
    const active = findActiveTrigger('Happy', 0, [
      { trigger: 'Happy', suggestions: [' Birthday!'] },
    ]);
    expect(active).not.toBeNull();
    expect(active!.query).toBe('');
  });

  it('respects minQueryLength after the trigger', () => {
    const active = findActiveTrigger('john@', 0, [
      { trigger: '@', suggestions: ['gmail.com'], minQueryLength: 1 },
    ]);
    expect(active).toBeNull();
  });

  it('builds starts-with completions and trims the trigger from the suffix', () => {
    const active = findActiveTrigger('john@g', 0, [
      { trigger: '@', suggestions: ['gmail.com', 'outlook.com'] },
    ])!;
    const completions = buildTriggerCompletions('john@g', active);
    expect(completions.map((c) => c.suggestion)).toEqual(['gmail.com']);
    expect(completions[0].finalValue).toBe('john@gmail.com');
    expect(completions[0].parts).toEqual({
      prefix: '',
      typed: 'john@g',
      suffix: 'mail.com',
    });
  });

  it('picks the latest, longest trigger when several match', () => {
    const active = findActiveTrigger('a$b', 0, [
      { trigger: '$', suggestions: ['x'] },
    ]);
    expect(active!.queryStart).toBe(2);
  });
});

describe('engine — buildNormalCompletion', () => {
  it('anchors a start match with a trailing ghost suffix', () => {
    const ctx = getCompletionContext('Thanks', 0);
    const c = buildNormalCompletion('Thanks', ctx, 'Thanks so much for reaching out!')!;
    expect(c.finalValue).toBe('Thanks so much for reaching out!');
    expect(c.parts).toEqual({
      prefix: '',
      typed: 'Thanks',
      suffix: ' so much for reaching out!',
    });
  });

  it('composes a left+right ghost when text precedes a mid-suggestion match', () => {
    // Saved text "Hello. " precedes the active segment "have a great", which
    // matches mid-suggestion — so the ghost must render the saved base, the
    // suggestion's left side, the typed text, and the right side.
    const value = 'Hello. have a great';
    const ctx = getCompletionContext(value, 7);
    expect(ctx.query).toBe('have a great');
    const c = buildNormalCompletion(
      value,
      ctx,
      'Hope you have a great rest of your week!'
    )!;
    expect(c.finalValue).toBe('Hello. Hope you have a great rest of your week!');
    expect(c.parts).toEqual({
      base: 'Hello. ',
      prefix: 'Hope you ',
      typed: 'have a great',
      suffix: ' rest of your week!',
    });
  });

  it('returns null when the suggestion does not contain the query', () => {
    const ctx = getCompletionContext('xyz', 0);
    expect(buildNormalCompletion('xyz', ctx, 'Thanks a lot')).toBeNull();
  });
});

describe('engine — nextWordLength / splitGhostWords', () => {
  it('counts leading whitespace plus the next non-whitespace run', () => {
    expect(nextWordLength(' to help')).toBe(3);
    expect(nextWordLength('help')).toBe(4);
    expect(nextWordLength('')).toBe(0);
  });

  it('splits a suffix into cumulative word segments', () => {
    expect(splitGhostWords(' to help')).toEqual([
      { text: ' to', end: 3 },
      { text: ' help', end: 8 },
    ]);
  });
});

describe('engine — computeWholeMatches', () => {
  it('matches the whole field value when text already exists', () => {
    expect(computeWholeMatches('have a great', 12, true, false, null, REPLIES, 'substring', 1)).toEqual([
      'Hope you have a great rest of your week!',
    ]);
  });

  it('skips the whole pass when async is active', () => {
    expect(computeWholeMatches('have a great', 12, true, true, null, REPLIES, 'substring', 1)).toEqual([]);
  });

  it('skips when the whole value already is the active query (segmentStart 0)', () => {
    expect(computeWholeMatches('Thanks', 0, true, false, null, REPLIES, 'substring', 1)).toEqual([]);
  });
});

describe('engine — joinIds', () => {
  it('joins truthy ids and drops falsy ones', () => {
    expect(joinIds('a', false, null, 'b')).toBe('a b');
    expect(joinIds(false, null, undefined)).toBeUndefined();
  });
});
