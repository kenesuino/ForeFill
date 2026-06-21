/**
 * Pure string-matching primitives used by the suggestion hook and inline
 * autosuggest component.
 */
export type MatchMode = 'startsWith' | 'substring' | 'fuzzy';

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  let ti = 0;
  let qi = 0;
  let run = 0;
  let score = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      qi += 1;
      run += 1;
      score += 1 + run;
    } else {
      run = 0;
    }
    ti += 1;
  }
  return qi === q.length ? score : 0;
}

export function filterMatches(
  query: string,
  suggestions: readonly string[],
  mode: MatchMode
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (mode === 'startsWith') {
    return suggestions.filter((s) => s.toLowerCase().startsWith(q));
  }
  if (mode === 'fuzzy') {
    return suggestions
      .map((s) => ({ s, score: fuzzyScore(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
  }
  return suggestions.filter((s) => s.toLowerCase().includes(q));
}
