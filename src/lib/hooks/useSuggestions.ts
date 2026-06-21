import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import { filterMatches, type MatchMode } from '../utils/filterMatches';

export type { MatchMode };

export interface AsyncSuggestionContext {
  /** Abort signal for the current async request. */
  signal: AbortSignal;
}

export type AsyncSuggestionFetcher = (
  query: string,
  context?: AsyncSuggestionContext
) => Promise<string[]>;

export interface UseSuggestionsOptions {
  /** Static suggestion list. Ignored when `asyncFetcher` is set. */
  suggestions?: string[];
  /** Async fetcher. Takes precedence over `suggestions`. */
  asyncFetcher?: AsyncSuggestionFetcher;
  /** Minimum trimmed query length before matches are computed. Default 1. */
  minQueryLength?: number;
  /** Debounce delay in ms (applied to async queries). Default 0. */
  debounceMs?: number;
  /** Match strategy. Default 'substring'. */
  matchMode?: MatchMode;
}

export interface UseSuggestionsResult {
  matches: string[];
  isLoading: boolean;
}

const EMPTY_SUGGESTIONS: string[] = [];

/**
 * Core suggestion engine. Shared by every autocomplete component
 * in the library. Supports sync lists, async fetchers, debouncing,
 * and three match modes.
 */
export function useSuggestions(
  query: string,
  options: UseSuggestionsOptions = {}
): UseSuggestionsResult {
  const {
    suggestions = EMPTY_SUGGESTIONS,
    asyncFetcher,
    minQueryLength = 1,
    debounceMs = 0,
    matchMode = 'substring',
  } = options;

  const debouncedQuery = useDebouncedValue(query, asyncFetcher ? debounceMs : 0);
  const [asyncMatches, setAsyncMatches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!asyncFetcher) {
      setAsyncMatches([]);
      setIsLoading(false);
      return;
    }
    const q = debouncedQuery.trim();
    if (q.length < minQueryLength) {
      setAsyncMatches([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setAsyncMatches([]);
    setIsLoading(true);
    asyncFetcher(q, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setAsyncMatches(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAsyncMatches([]);
          setIsLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
  }, [asyncFetcher, debouncedQuery, minQueryLength]);

  return useMemo<UseSuggestionsResult>(() => {
    if (asyncFetcher) {
      const q = debouncedQuery.trim();
      if (q.length < minQueryLength) {
        return { matches: [], isLoading: false };
      }
      return { matches: asyncMatches, isLoading };
    }

    const q = query.trim();
    if (q.length < minQueryLength) {
      return { matches: [], isLoading: false };
    }

    return {
      matches: filterMatches(q, suggestions, matchMode),
      isLoading: false,
    };
  }, [
    query,
    debouncedQuery,
    minQueryLength,
    asyncFetcher,
    asyncMatches,
    isLoading,
    suggestions,
    matchMode,
  ]);
}
