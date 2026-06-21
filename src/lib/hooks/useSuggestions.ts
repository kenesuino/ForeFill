import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import { filterMatches, type MatchMode } from '../utils/filterMatches';

export type { MatchMode };

export interface UseSuggestionsOptions {
  /** Static suggestion list. Ignored when `asyncFetcher` is set. */
  suggestions?: string[];
  /** Async fetcher. Takes precedence over `suggestions`. */
  asyncFetcher?: (query: string) => Promise<string[]>;
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

  const debouncedQuery = useDebouncedValue(query, debounceMs);
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
    let cancelled = false;
    setIsLoading(true);
    asyncFetcher(q)
      .then((res) => {
        if (!cancelled) {
          setAsyncMatches(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [asyncFetcher, debouncedQuery, minQueryLength]);

  return useMemo<UseSuggestionsResult>(() => {
    const q = debouncedQuery.trim();
    if (q.length < minQueryLength) {
      return { matches: [], isLoading: false };
    }
    if (asyncFetcher) {
      return { matches: asyncMatches, isLoading };
    }
    return {
      matches: filterMatches(q, suggestions, matchMode),
      isLoading: false,
    };
  }, [
    debouncedQuery,
    minQueryLength,
    asyncFetcher,
    asyncMatches,
    isLoading,
    suggestions,
    matchMode,
  ]);
}
