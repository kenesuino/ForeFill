/**
 * Pure suggestion engine — framework-agnostic twin of the inline-completion
 * logic in `ForeFill.tsx`. No DOM, no React; safe to unit-test in isolation.
 *
 * Kept deliberately parallel (rather than imported from the React file) so the
 * vanilla bundle has zero dependency on anything React-shaped, and so the two
 * surfaces can evolve independently per the chosen "parallel impl" plan.
 */

import { filterMatches, type MatchMode } from '../utils/filterMatches';
import type {
  ForeFillMatchMode,
  ForeFillTriggerSuggestion,
} from './types';

export interface SuggestionParts {
  base?: string;
  prefix: string;
  typed: string;
  suffix: string;
}

export interface CompletionContext {
  queryStart: number;
  query: string;
}

export interface ActiveTrigger {
  queryStart: number;
  query: string;
  config: ForeFillTriggerSuggestion;
}

export interface InlineCompletion {
  suggestion: string;
  finalValue: string;
  parts: SuggestionParts;
}

export function getSuggestionParts(
  suggestion: string,
  typedValue: string
): SuggestionParts | null {
  if (!suggestion || !typedValue) return null;

  const idx = suggestion.toLowerCase().indexOf(typedValue.toLowerCase());
  if (idx === -1) return null;

  return {
    prefix: suggestion.substring(0, idx),
    typed: typedValue,
    suffix: suggestion.substring(idx + typedValue.length),
  };
}

export function getCompletionContext(
  value: string,
  activeSegmentStart: number
): CompletionContext {
  const safeStart = Math.min(Math.max(activeSegmentStart, 0), value.length);
  const segment = value.slice(safeStart);
  const leading = /^\s*/.exec(segment)?.[0].length ?? 0;
  const queryStart = safeStart + leading;
  return {
    queryStart,
    query: value.slice(queryStart),
  };
}

export function getChangeStart(previousValue: string, nextValue: string): number {
  const max = Math.min(previousValue.length, nextValue.length);
  let index = 0;
  while (index < max && previousValue[index] === nextValue[index]) {
    index += 1;
  }
  return index;
}

function isWordTrigger(trigger: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(trigger);
}

function isTriggerBoundary(char: string | undefined): boolean {
  return char === undefined || !/[A-Za-z0-9_]/.test(char);
}

function startsWithMatch(
  value: string,
  query: string,
  caseSensitive = false
): boolean {
  if (caseSensitive) return value.startsWith(query);
  return value.toLowerCase().startsWith(query.toLowerCase());
}

function findLastWordTrigger(
  segment: string,
  trigger: string,
  caseSensitive: boolean
): number {
  const source = caseSensitive ? segment : segment.toLowerCase();
  const needle = caseSensitive ? trigger : trigger.toLowerCase();
  let index = -1;
  let from = 0;

  while (from <= source.length - needle.length) {
    const found = source.indexOf(needle, from);
    if (found === -1) break;
    if (isTriggerBoundary(segment[found - 1])) {
      index = found;
    }
    from = found + 1;
  }

  return index;
}

export function findActiveTrigger(
  value: string,
  activeSegmentStart: number,
  triggerSuggestions: readonly ForeFillTriggerSuggestion[]
): ActiveTrigger | null {
  const safeStart = Math.min(Math.max(activeSegmentStart, 0), value.length);
  const segment = value.slice(safeStart);
  let active: (ActiveTrigger & { triggerStart: number }) | null = null;

  for (const config of triggerSuggestions) {
    const trigger = config.trigger;
    if (!trigger || config.suggestions.length === 0) continue;

    const caseSensitive = config.caseSensitive ?? false;
    const segmentForSearch = caseSensitive ? segment : segment.toLowerCase();
    const triggerForSearch = caseSensitive ? trigger : trigger.toLowerCase();
    const localStart = isWordTrigger(trigger)
      ? findLastWordTrigger(segment, trigger, caseSensitive)
      : segmentForSearch.lastIndexOf(triggerForSearch);

    if (localStart === -1) continue;

    const triggerStart = safeStart + localStart;
    const queryStart = triggerStart + trigger.length;
    const query = value.slice(queryStart);
    const minLength = config.minQueryLength ?? 0;
    if (query.length < minLength) continue;

    if (
      !active ||
      triggerStart > active.triggerStart ||
      (triggerStart === active.triggerStart &&
        trigger.length > active.config.trigger.length)
    ) {
      active = { triggerStart, queryStart, query, config };
    }
  }

  return active
    ? {
        queryStart: active.queryStart,
        query: active.query,
        config: active.config,
      }
    : null;
}

export function buildTriggerCompletions(
  value: string,
  trigger: ActiveTrigger
): InlineCompletion[] {
  const { query, queryStart, config } = trigger;
  return config.suggestions
    .filter((suggestion) =>
      startsWithMatch(suggestion, query, config.caseSensitive ?? false)
    )
    .map((suggestion) => ({
      suggestion,
      finalValue: `${value.slice(0, queryStart)}${suggestion}`,
      parts: {
        prefix: '',
        typed: value,
        suffix: suggestion.slice(query.length),
      },
    }));
}

export function buildNormalCompletion(
  value: string,
  context: CompletionContext,
  suggestion: string
): InlineCompletion | null {
  const parts = getSuggestionParts(suggestion, context.query);
  if (!parts) return null;

  const valuePrefix = value.slice(0, context.queryStart);
  const finalSegment = `${parts.prefix}${context.query}${parts.suffix}`;

  if (context.queryStart > 0) {
    return {
      suggestion,
      finalValue: `${valuePrefix}${finalSegment}`,
      parts:
        parts.prefix === ''
          ? {
              prefix: '',
              typed: value,
              suffix: parts.suffix,
            }
          : {
              base: valuePrefix,
              prefix: parts.prefix,
              typed: context.query,
              suffix: parts.suffix,
            },
    };
  }

  return {
    suggestion,
    finalValue: `${valuePrefix}${finalSegment}`,
    parts,
  };
}

/**
 * Length of the next "word" at the start of a ghost suffix: any leading
 * whitespace plus the following run of non-whitespace. Returns 0 when there's
 * nothing left to accept.
 */
export function nextWordLength(suffix: string): number {
  if (!suffix) return 0;
  const match = /^\s*\S+/.exec(suffix);
  return match ? match[0].length : suffix.length;
}

/**
 * Splits a ghost suffix into word segments for tappable word-by-word accept.
 * Each segment carries its cumulative end offset within the suffix.
 */
export function splitGhostWords(
  suffix: string
): { text: string; end: number }[] {
  const words: { text: string; end: number }[] = [];
  let start = 0;
  while (start < suffix.length) {
    const len = nextWordLength(suffix.slice(start));
    if (len <= 0) break;
    const end = start + len;
    words.push({ text: suffix.slice(start, end), end });
    start = end;
  }
  return words;
}

/**
 * Whole-value substring matches: when the field already holds text, match the
 * *entire* value against the static list so a suggestion that contains the
 * whole value renders the full left+right ghost. Mirrors the `wholeMatches`
 * memo in the React component.
 */
export function computeWholeMatches(
  value: string,
  activeSegmentStart: number,
  matchWholeValue: boolean,
  hasAsync: boolean,
  activeTrigger: ActiveTrigger | null,
  suggestions: readonly string[] | undefined,
  matchMode: ForeFillMatchMode,
  minQueryLength: number
): string[] {
  if (!matchWholeValue || hasAsync || activeTrigger || !suggestions) {
    return [];
  }
  if (activeSegmentStart === 0) return [];
  const wholeContext = getCompletionContext(value, 0);
  if (wholeContext.query.trim().length < minQueryLength) return [];
  return filterMatches(wholeContext.query, suggestions, matchMode as MatchMode);
}

export function joinIds(
  ...ids: Array<string | false | null | undefined>
): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}
