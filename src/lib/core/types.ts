/**
 * Framework-agnostic ForeFill types.
 *
 * These mirror the React {@link ForeFillProps} surface, with the few
 * React-node-shaped fields replaced by their vanilla equivalents:
 *   - `helperText` is a `string` (not ReactNode)
 *   - `renderTouchAccept` returns an `HTMLElement` (not ReactNode)
 *
 * No React import anywhere in `core/*`.
 */

export type ForeFillVariant = 'outline' | 'filled' | 'underline';
export type ForeFillSize = 'sm' | 'md' | 'lg';
export type ForeFillMatchMode = 'startsWith' | 'substring';
export type HelperVisibility = boolean | 'idle';
export type ForeFillSurface = 'textarea' | 'input' | 'contenteditable';
export type ForeFillStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ForeFillTriggerSuggestion {
  trigger: string;
  suggestions: string[];
  minQueryLength?: number;
  caseSensitive?: boolean;
}

export type AsyncSuggestionFetcher = (
  query: string,
  context?: { signal: AbortSignal }
) => Promise<string[]>;

export interface TouchAcceptRenderProps {
  accept: () => void;
  suggestion: string;
  label: string;
}

export interface ForeFillVanillaOptions {
  /** Static suggestion list. Ignored if `asyncSuggestions` is provided. */
  suggestions?: string[];
  /** Triggered completions for symbols or words. */
  triggerSuggestions?: ForeFillTriggerSuggestion[];
  /** Async source of suggestions. Takes precedence over `suggestions`. */
  asyncSuggestions?: AsyncSuggestionFetcher;
  /** Fires when a value is finalized with Enter or Tab. */
  onCommit?: (value: string) => void;
  /** Fires on every keystroke. */
  onChange?: (value: string) => void;
  /** Fires when the user accepts an inline suggestion. */
  onAccept?: (value: string, suggestion: string) => void;
  /** Fires when the user dismisses a visible hint with Escape. */
  onDismiss?: () => void;

  /** Placeholder text. Default 'Type to search...'. */
  placeholder?: string;

  /** Classes merged onto the root container. */
  className?: string;
  /** Classes merged onto the editable surface. */
  editorClassName?: string;
  /** Classes merged onto the inline helper. */
  helperClassName?: string;
  /** Classes merged onto the accept chip. */
  touchAcceptClassName?: string;

  /** Visible rows for a created textarea. Default 3. */
  rows?: number;
  /** Input type for a created input. Default 'text'. */
  inputType?: string;

  /** Visual variant. Default 'outline'. */
  variant?: ForeFillVariant;
  /** Size preset. Default 'md'. */
  size?: ForeFillSize;
  /** Match strategy. Default 'substring'. */
  matchMode?: ForeFillMatchMode;
  /** Also match the whole field value against the static list. Default true. */
  matchWholeValue?: boolean;
  /** Disable the automatic inline ghost suggestion. */
  disableInlineFill?: boolean;
  /** Let ArrowDown/ArrowUp cycle matching hints. Default true. */
  enableArrowNavigation?: boolean;
  /** Minimum trimmed query length before suggestions activate. Default 1. */
  minQueryLength?: number;
  /** Debounce delay for async queries in ms. Default 0. */
  debounceMs?: number;

  /** aria-label. Defaults to `placeholder`. */
  ariaLabel?: string;
  /** ID of an external label element. Takes precedence over `ariaLabel`. */
  ariaLabelledBy?: string;
  /** ID of external helper/error text to merge into `aria-describedby`. */
  ariaDescribedBy?: string;

  /** Show the inline keyboard helper. Default false. */
  showHelper?: HelperVisibility;
  /** Delay before the helper appears when `showHelper` is 'idle'. Default 900. */
  helperIdleMs?: number;
  /** Helper content shown when `showHelper` is enabled (plain string). */
  helperText?: string;

  /** Force a color scheme. Omit to follow the OS. */
  theme?: 'light' | 'dark';
  /** Explicit visual status. */
  status?: ForeFillStatus;

  /** Marks the field required (input/textarea). Sets `aria-required`. */
  required?: boolean;
  /** Renders the field read-only. Suppresses the inline ghost. */
  readOnly?: boolean;
  /** Maximum character length (input/textarea). */
  maxLength?: number;
  /** Autofocus the field on attach. */
  autoFocus?: boolean;
  /** Disable the component. */
  disabled?: boolean;

  /** `name` forwarded to a created input/textarea for form submission. */
  name?: string;
  /** `id` set on the editable element (pairs with a `<label for>`). */
  id?: string;

  /** Whether Enter accepts a visible hint. Default true. */
  acceptOnEnter?: boolean;
  /** Commit the current value when focus leaves the field. Default false. */
  commitOnBlur?: boolean;
  /** Allow word-by-word accept with Ctrl/Cmd + ArrowRight. Default true. */
  partialAccept?: boolean;

  /** Show tappable touch controls. 'auto' = coarse pointers only. Default 'auto'. */
  touchAccept?: boolean | 'auto';
  /** Accessible label for the accept chip. Default 'Accept suggestion'. */
  touchAcceptLabel?: string;
  /** Render your own accept chip; call `accept()` from a preventDefault-ed pointerdown. */
  renderTouchAccept?: (api: TouchAcceptRenderProps) => HTMLElement;

  /**
   * Render the inline ghost as if focused, without stealing DOM focus.
   * Intended for showcase/preview scenarios. Default false.
   */
  active?: boolean;
}

export interface ForeFillInstance {
  focus: () => void;
  blur: () => void;
  select: () => void;
  /** Set the value programmatically (writes to the editor and reconciles). */
  setValue: (next: string) => void;
  /** Read the current editor value. */
  getValue: () => string;
  /** Update options live. Merges into the previous options. */
  setOptions: (options: Partial<ForeFillVanillaOptions>) => void;
  /** Tear down: removes the overlay, restores the original editor, drops listeners. */
  destroy: () => void;
}
