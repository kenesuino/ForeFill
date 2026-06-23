import { describe, it, expect, vi } from 'vitest';
import { SuggestionEngine } from './asyncEngine';

const SUGGESTIONS = ['Thanks a lot', 'Thanks again', 'Welcome aboard'];

describe('SuggestionEngine (sync)', () => {
  it('returns no matches below minQueryLength', () => {
    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({
      suggestions: SUGGESTIONS,
      minQueryLength: 3,
    });
    engine.setListener((r) => results.push(r));
    engine.setQuery('T');
    expect(results[results.length - 1]).toEqual({ matches: [], isLoading: false });
    engine.destroy();
  });

  it('filters synchronously once the query is long enough', () => {
    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({
      suggestions: SUGGESTIONS,
      minQueryLength: 1,
    });
    engine.setListener((r) => results.push(r));
    engine.setQuery('Thanks');
    expect(results[results.length - 1]!.matches).toEqual(['Thanks a lot', 'Thanks again']);
    engine.destroy();
  });

  it('uses the trimmed query length for the gate', () => {
    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({
      suggestions: SUGGESTIONS,
      minQueryLength: 3,
    });
    engine.setListener((r) => results.push(r));
    engine.setQuery('  ab  ');
    expect(results[results.length - 1]).toEqual({ matches: [], isLoading: false });
    engine.destroy();
  });

  it('does not debounce static suggestion filtering', async () => {
    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({
      suggestions: SUGGESTIONS,
      debounceMs: 1000,
    });
    engine.setListener((r) => results.push(r));
    engine.setQuery('Thanks');
    expect(results[results.length - 1]!.matches).toEqual(['Thanks a lot', 'Thanks again']);
    engine.destroy();
  });
});

describe('SuggestionEngine (async)', () => {
  it('debounces query changes, firing only for the latest value', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async (q: string) => [`result for ${q}`]);
      const engine = new SuggestionEngine({
        asyncFetcher: fetcher,
        debounceMs: 50,
      });
      engine.setListener(() => {});
      engine.setQuery('a');
      engine.setQuery('ab');
      engine.setQuery('abc');
      vi.advanceTimersByTime(50);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith('abc', expect.any(Object));
      engine.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a stale resolution when the query changes mid-flight', async () => {
    const resolvers: Array<(v: string[]) => void> = [];
    const fetcher = vi.fn(
      (_q: string) =>
        new Promise<string[]>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({ asyncFetcher: fetcher, debounceMs: 0 });
    engine.setListener((r) => results.push(r));

    engine.setQuery('first');
    await vi.waitFor(() => expect(resolvers).toHaveLength(1));
    engine.setQuery('second');
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));

    resolvers[1]?.(['second-result']);
    resolvers[0]?.(['first-result']);

    await vi.waitFor(() =>
      expect(results[results.length - 1]!.matches).toEqual(['second-result'])
    );
    expect(results[results.length - 1]!.matches).not.toContain('first-result');
    engine.destroy();
  });

  it('clears matches when the latest request fails', async () => {
    const fetcher = vi.fn((q: string) =>
      q === 'ok'
        ? Promise.resolve(['ok-result'])
        : Promise.reject(new Error('network down'))
    );

    const results: { matches: string[]; isLoading: boolean }[] = [];
    const engine = new SuggestionEngine({ asyncFetcher: fetcher, debounceMs: 0 });
    engine.setListener((r) => results.push(r));

    engine.setQuery('ok');
    await vi.waitFor(() =>
      expect(results[results.length - 1]!.matches).toEqual(['ok-result'])
    );

    engine.setQuery('fail');
    await vi.waitFor(() => {
      expect(results[results.length - 1]!.isLoading).toBe(false);
      expect(results[results.length - 1]!.matches).toEqual([]);
    });
    engine.destroy();
  });

  it('passes an AbortSignal and aborts stale requests', async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(
      (_q: string, context?: { signal: AbortSignal }) =>
        new Promise<string[]>(() => {
          if (context) signals.push(context.signal);
        })
    );

    const engine = new SuggestionEngine({ asyncFetcher: fetcher, debounceMs: 0 });
    engine.setListener(() => {});

    engine.setQuery('first');
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0].aborted).toBe(false);

    engine.setQuery('second');
    await vi.waitFor(() => expect(signals[0].aborted).toBe(true));
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[1].aborted).toBe(false);
    engine.destroy();
  });
});
