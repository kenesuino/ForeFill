/**
 * Public entry point for the library.
 * Consumers should import from here, never from internal files.
 */

// Component
export { ForeFill, default } from './ForeFill';
export type {
  ForeFillProps,
  ForeFillHandle,
  ForeFillVariant,
  ForeFillSize,
  ForeFillMatchMode,
  ForeFillTriggerSuggestion,
  HelperVisibility,
  ForeFillSurface,
} from './ForeFill';

// Hooks (reusable across future components)
export { useSuggestions } from './hooks/useSuggestions';
export type {
  UseSuggestionsOptions,
  UseSuggestionsResult,
} from './hooks/useSuggestions';
export { useDebouncedValue } from './hooks/useDebouncedValue';

// Utilities
export { cx } from './utils/cx';
export type { ClassValue } from './utils/cx';
export { filterMatches } from './utils/filterMatches';
export type { MatchMode } from './utils/filterMatches';
