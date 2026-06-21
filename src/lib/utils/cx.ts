/**
 * cx - tiny class-name combiner.
 * Accepts strings, numbers, arrays, and objects (clsx-style).
 * No external dependency.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cx(...input);
      if (inner) out.push(inner);
    } else if (typeof input === 'object') {
      for (const key of Object.keys(input)) {
        if (input[key]) out.push(key);
      }
    }
  }
  return out.join(' ');
}
