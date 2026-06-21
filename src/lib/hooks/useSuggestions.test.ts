import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSuggestions } from './useSuggestions';

const SUGGESTIONS = ['Thanks a lot', 'Thanks again', 'Welcome aboard'];

describe('useSuggestions (sync)', () => {
  it('returns no matches below minQueryLength', () => {
    const { result } = renderHook(() =>
      useSuggestions('T', { suggestions: SUGGESTIONS, minQueryLength: 3 })
    );
    expect(result.current.matches).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('filters synchronously once the query is long enough', () => {
    const { result } = renderHook(() =>
      useSuggestions('Thanks', { suggestions: SUGGESTIONS, minQueryLength: 1 })
    );
    expect(result.current.matches).toEqual(['Thanks a lot', 'Thanks again']);
  });

  it('uses the trimmed query length for the gate', () => {
    const { result } = renderHook(() =>
      useSuggestions('  ab  ', { suggestions: SUGGESTIONS, minQueryLength: 3 })
    );
    // trimmed "ab" is length 2 < 3
    expect(result.current.matches).toEqual([]);
  });
});

describe('useSuggestions (async)', () => {
  it('debounces query changes, firing only for the latest value', async () => {
    const fetcher = vi.fn(async (q: string) => [`result for ${q}`]);
    // Start empty (below minQueryLength) so nothing fetches on mount; the
    // intermediate values are replaced within the debounce window, so only the
    // final "abc" should ever reach the fetcher.
    const { rerender } = renderHook(
      ({ q }) => useSuggestions(q, { asyncFetcher: fetcher, debounceMs: 50 }),
      { initialProps: { q: '' } }
    );

    rerender({ q: 'a' });
    rerender({ q: 'ab' });
    rerender({ q: 'abc' });

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('abc'));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalledWith('a');
    expect(fetcher).not.toHaveBeenCalledWith('ab');
  });

  it('ignores a stale resolution when the query changes mid-flight', async () => {
    // Real timers here so RTL's waitFor (which polls on real time) works.
    const resolvers: Array<(v: string[]) => void> = [];
    const fetcher = vi.fn(
      (_q: string) =>
        new Promise<string[]>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const { result, rerender } = renderHook(
      ({ q }) => useSuggestions(q, { asyncFetcher: fetcher, debounceMs: 0 }),
      { initialProps: { q: 'first' } }
    );

    await waitFor(() => expect(resolvers).toHaveLength(1));
    rerender({ q: 'second' });
    await waitFor(() => expect(resolvers).toHaveLength(2));

    // Resolve the FIRST (now-stale) request last; its result must be discarded.
    resolvers[1]?.(['second-result']);
    resolvers[0]?.(['first-result']);

    await waitFor(() =>
      expect(result.current.matches).toEqual(['second-result'])
    );
    expect(result.current.matches).not.toContain('first-result');
  });
});
