/**
 * SuggestionEngine — vanilla twin of the React `useSuggestions` hook.
 *
 * Owns the debounce + AbortController flow so the controller can stay declarative:
 * call `setOptions()` with the fetcher/debounce/min/match config, then `setQuery()`
 * on every keystroke, and the engine invokes `onResult(matches, isLoading)` when
 * the synchronous filter or the async fetch resolves. Stale requests are aborted.
 */

import { filterMatches, type MatchMode } from '../utils/filterMatches';
import type { AsyncSuggestionFetcher } from './types';

export interface SuggestionEngineOptions {
  suggestions?: readonly string[];
  asyncFetcher?: AsyncSuggestionFetcher;
  minQueryLength?: number;
  debounceMs?: number;
  matchMode?: MatchMode;
}

export interface SuggestionEngineResult {
  matches: string[];
  isLoading: boolean;
}

export type SuggestionEngineListener = (
  result: SuggestionEngineResult
) => void;

const EMPTY: string[] = [];

export class SuggestionEngine {
  private query = '';
  private options: Required<Omit<SuggestionEngineOptions, 'asyncFetcher' | 'suggestions'>> & {
    asyncFetcher?: AsyncSuggestionFetcher;
    suggestions: readonly string[];
  };
  private listener: SuggestionEngineListener | null = null;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  /** Used by the debounced async path so the listener fires even with debounceMs=0. */
  private debouncedQuery = '';
  private isLoading = false;

  constructor(options: SuggestionEngineOptions = {}) {
    this.options = {
      suggestions: options.suggestions ?? EMPTY,
      asyncFetcher: options.asyncFetcher,
      minQueryLength: options.minQueryLength ?? 1,
      debounceMs: options.debounceMs ?? 0,
      matchMode: options.matchMode ?? 'substring',
    };
  }

  setListener(listener: SuggestionEngineListener): void {
    this.listener = listener;
  }

  setOptions(options: SuggestionEngineOptions): void {
    // Overwrite every field; `asyncFetcher: undefined` is a valid value that
    // switches the engine back to synchronous filtering. The controller always
    // passes a fully-resolved options object.
    this.options = {
      suggestions: options.suggestions ?? EMPTY,
      asyncFetcher: options.asyncFetcher,
      minQueryLength: options.minQueryLength ?? 1,
      debounceMs: options.debounceMs ?? 0,
      matchMode: options.matchMode ?? 'substring',
    };
    // The controller drives re-evaluation via setQuery(); we only store here so
    // the next setQuery() uses the new config without a double emit.
  }

  setQuery(query: string): void {
    this.query = query;

    if (!this.options.asyncFetcher) {
      // Synchronous filtering — no debounce, mirrors the hook.
      this.emitSync();
      return;
    }

    const delay = this.options.debounceMs > 0 ? this.options.debounceMs : 0;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (delay > 0) {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.debouncedQuery = this.query;
        this.runAsync();
      }, delay);
    } else {
      this.debouncedQuery = this.query;
      this.runAsync();
    }
  }

  getLoading(): boolean {
    return this.isLoading;
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.abort();
    this.listener = null;
  }

  private emitSync(): void {
    const q = this.query.trim();
    if (q.length < this.options.minQueryLength) {
      this.emit({ matches: EMPTY, isLoading: false });
      return;
    }
    this.emit({
      matches: filterMatches(q, this.options.suggestions, this.options.matchMode),
      isLoading: false,
    });
  }

  private runAsync(): void {
    const q = this.debouncedQuery.trim();
    if (q.length < this.options.minQueryLength) {
      this.isLoading = false;
      this.abort();
      this.emit({ matches: EMPTY, isLoading: false });
      return;
    }

    this.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.isLoading = true;
    this.emit({ matches: EMPTY, isLoading: true });

    this.options
      .asyncFetcher!(q, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        this.isLoading = false;
        this.emit({ matches: res, isLoading: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        this.isLoading = false;
        this.emit({ matches: EMPTY, isLoading: false });
      });
  }

  private abort(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  private emit(result: SuggestionEngineResult): void {
    if (this.listener) this.listener(result);
  }
}
