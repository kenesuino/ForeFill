import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from './utils/cx';
import {
  useSuggestions,
  type AsyncSuggestionFetcher,
  type MatchMode,
} from './hooks/useSuggestions';

export type ForeFillVariant = 'outline' | 'filled' | 'underline';
export type ForeFillSize = 'sm' | 'md' | 'lg';
/**
 * Match modes usable by the inline ghost. `fuzzy` is intentionally excluded:
 * the ghost is built by splitting a suggestion around a *contiguous* occurrence
 * of the typed text (see `getSuggestionParts`), and a fuzzy match has no single
 * contiguous span to render around — so it could never produce a ghost. Fuzzy
 * remains available via the exported `useSuggestions` hook for list-style UIs.
 */
export type ForeFillMatchMode = Exclude<MatchMode, 'fuzzy'>;
export type HelperVisibility = boolean | 'idle';
export type ForeFillSurface = 'textarea' | 'input' | 'contenteditable';

export interface ForeFillTriggerSuggestion {
  /** Text that activates this suggestion group, such as '@', '$', or 'Happy'. */
  trigger: string;
  /** Suggestions offered after the trigger. Leading spaces are preserved. */
  suggestions: string[];
  /** Minimum query length after the trigger before suggestions appear. Default 0. */
  minQueryLength?: number;
  /** Match the trigger and query with exact casing. Default false. */
  caseSensitive?: boolean;
}

export interface ForeFillProps {
  /**
   * Editable surface to render.
   * `textarea` is multiline, `input` is single-line, and `contenteditable`
   * renders a plain-text contenteditable surface.
   */
  as?: ForeFillSurface;
  /** Static suggestion list. Ignored if `asyncSuggestions` is provided. */
  suggestions?: string[];
  /**
   * Triggered completions for symbols or words. Examples:
   * `@` -> `gmail.com`, `$` -> `total`, `Happy` -> ` Birthday!`.
   * Trigger matches take precedence over normal suggestions while active.
   */
  triggerSuggestions?: ForeFillTriggerSuggestion[];
  /** Async source of suggestions. Takes precedence over `suggestions`. */
  asyncSuggestions?: AsyncSuggestionFetcher;
  /** Fires when a value is finalized with Enter or Tab. */
  onCommit?: (value: string) => void;
  /** Fires on every keystroke. */
  onChange?: (value: string) => void;
  /**
   * Fires when the user accepts an inline suggestion (Tab, or Enter when
   * `acceptOnEnter`). Receives the resulting value and the suggestion that was
   * accepted — use it to tell "took a suggestion" apart from "kept my own text"
   * (which only fires `onCommit`).
   */
  onAccept?: (value: string, suggestion: string) => void;
  /** Fires when the user dismisses a visible hint with Escape. */
  onDismiss?: () => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Classes merged onto the root container. */
  className?: string;
  /** Classes merged onto the editable surface. */
  editorClassName?: string;
  /** Input type when `as` is `input`. Default 'text'. */
  inputType?: string;
  /** Classes merged onto the inline helper. */
  helperClassName?: string;
  /** Visible rows. Default 3. */
  rows?: number;
  /** Disable the component. */
  disabled?: boolean;
  /** Visual variant. Default 'outline'. */
  variant?: ForeFillVariant;
  /** Size preset. Default 'md'. */
  size?: ForeFillSize;
  /** Match strategy. Default 'substring'. */
  matchMode?: ForeFillMatchMode;
  /** Disable the automatic inline ghost suggestion. */
  disableInlineFill?: boolean;
  /**
   * Let ArrowDown and ArrowUp cycle through matching inline suggestions.
   * Only applies when more than one matching hint exists. Default true.
   */
  enableArrowNavigation?: boolean;
  /** Minimum trimmed query length before suggestions activate. Default 1. */
  minQueryLength?: number;
  /** Debounce delay for async queries in milliseconds. Default 0. */
  debounceMs?: number;
  /** aria-label. Defaults to `placeholder`. */
  ariaLabel?: string;
  /** ID of an external label element. Takes precedence over `ariaLabel`. */
  ariaLabelledBy?: string;
  /** ID of external helper/error text to merge into `aria-describedby`. */
  ariaDescribedBy?: string;
  /**
   * Show the inline keyboard helper next to the ghost hint.
   * `true` shows it immediately, `false` hides it, and `'idle'` shows it
   * after the user pauses typing.
   */
  showHelper?: HelperVisibility;
  /** Delay before the helper appears when `showHelper` is `'idle'`. */
  helperIdleMs?: number;
  /** Helper content shown when `showHelper` is enabled. */
  helperText?: ReactNode;
  /** Initial value (uncontrolled). */
  defaultValue?: string;
  /** Controlled value. */
  value?: string;
  /**
   * Explicit visual status. `loading` shows the
   * indeterminate progress bar (also driven automatically by async fetches).
   */
  status?: 'idle' | 'loading' | 'success' | 'error';
  /** Force a color scheme. Omit to follow the OS `prefers-color-scheme`. */
  theme?: 'light' | 'dark';

  // ----- Form integration -------------------------------------------------
  /** `name` forwarded to the underlying input/textarea for form submission. */
  name?: string;
  /** `id` forwarded to the editable element (pairs with a `<label htmlFor>`). */
  id?: string;
  /** Marks the field required (input/textarea). Sets `aria-required`. */
  required?: boolean;
  /** Renders the field read-only. Suppresses the inline ghost. */
  readOnly?: boolean;
  /** Maximum character length (input/textarea). */
  maxLength?: number;
  /** Autofocus the field on mount. */
  autoFocus?: boolean;

  // ----- Accept / commit behavior ----------------------------------------
  /**
   * Whether Enter accepts a visible hint. Default `true`. When `false`, Enter
   * only commits the typed value and Tab remains the way to accept a hint.
   */
  acceptOnEnter?: boolean;
  /** Commit the current value when focus leaves the field. Default `false`. */
  commitOnBlur?: boolean;
  /**
   * Allow accepting one word of the hint at a time with `Ctrl`/`Cmd` +
   * `ArrowRight`. Default `true`. Only applies to start-anchored hints (an
   * empty ghost prefix); substring hints with a prefix fall through to the
   * browser's normal word navigation.
   */
  partialAccept?: boolean;
}

export interface ForeFillHandle {
  focus: () => void;
  blur: () => void;
  select: () => void;
}

interface SuggestionParts {
  prefix: string;
  typed: string;
  suffix: string;
}

interface CompletionContext {
  queryStart: number;
  query: string;
}

interface ActiveTrigger {
  queryStart: number;
  query: string;
  config: ForeFillTriggerSuggestion;
}

interface InlineCompletion {
  suggestion: string;
  finalValue: string;
  parts: SuggestionParts;
}

const DEFAULTS = {
  as: 'textarea' as ForeFillSurface,
  placeholder: 'Type to search...',
  rows: 3,
  variant: 'outline' as ForeFillVariant,
  size: 'md' as ForeFillSize,
  matchMode: 'substring' as ForeFillMatchMode,
  disableInlineFill: false,
  enableArrowNavigation: true,
  minQueryLength: 1,
  debounceMs: 0,
  helperIdleMs: 900,
};

const DEFAULT_TRIGGER_SUGGESTIONS: ForeFillTriggerSuggestion[] = [];

const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type EditableElement = HTMLTextAreaElement | HTMLInputElement | HTMLDivElement;
function getSuggestionParts(
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

function getCompletionContext(
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

function findActiveTrigger(
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

function buildTriggerCompletions(
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

function buildNormalCompletion(
  value: string,
  context: CompletionContext,
  suggestion: string
): InlineCompletion | null {
  const parts = getSuggestionParts(suggestion, context.query);
  if (!parts) return null;

  const valuePrefix = value.slice(0, context.queryStart);
  const finalSegment = `${parts.prefix}${context.query}${parts.suffix}`;

  if (context.queryStart > 0 && parts.prefix !== '') {
    return null;
  }

  return {
    suggestion,
    finalValue: `${valuePrefix}${finalSegment}`,
    parts:
      context.queryStart > 0
        ? {
            prefix: '',
            typed: value,
            suffix: parts.suffix,
          }
        : parts,
  };
}

/**
 * Length of the next "word" at the start of a ghost suffix: any leading
 * whitespace plus the following run of non-whitespace. Used by word-by-word
 * accept so `" to help"` accepts `" to"` and leaves `" help"` as the next hint.
 * Returns 0 when there's nothing left to accept.
 */
function nextWordLength(suffix: string): number {
  if (!suffix) return 0;
  const match = /^\s*\S+/.exec(suffix);
  return match ? match[0].length : suffix.length;
}

function getEditableText(node: EditableElement): string {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    return node.value;
  }
  return node.textContent ?? '';
}

function setEditableText(node: EditableElement, nextValue: string) {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    node.value = nextValue;
    return;
  }
  if (node.textContent !== nextValue) {
    node.textContent = nextValue;
  }
}

function moveCaretToEnd(node: EditableElement) {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    node.setSelectionRange(node.value.length, node.value.length);
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectEditableText(node: EditableElement) {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    node.select();
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

function joinIds(
  ...ids: Array<string | false | null | undefined>
): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

/**
 * Whether the caret sits collapsed at the very end of the editable content.
 * The inline ghost is only meaningful when the user is appending — typing in
 * the middle of the value would render the hint at the wrong place — so the
 * ghost is suppressed unless this is true. When the caret position can't be
 * read (e.g. `selectionStart` is null on number/email inputs), we don't
 * suppress, since there's nothing to misalign.
 */
function isCaretAtEnd(node: EditableElement): boolean {
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = node;
    if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') {
      return true;
    }
    return selectionStart === selectionEnd && selectionEnd === value.length;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return true;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;

  const end = document.createRange();
  end.selectNodeContents(node);
  end.collapse(false);
  // The collapsed caret is at the end iff its start boundary equals the
  // content-end boundary.
  return range.compareBoundaryPoints(Range.START_TO_START, end) === 0;
}

export const ForeFill = forwardRef(function ForeFill(
  props: ForeFillProps,
  ref: Ref<ForeFillHandle>
) {
  const {
    as = DEFAULTS.as,
    suggestions,
    triggerSuggestions = DEFAULT_TRIGGER_SUGGESTIONS,
    asyncSuggestions,
    onCommit,
    onChange,
    onAccept,
    onDismiss,
    placeholder = DEFAULTS.placeholder,
    className,
    editorClassName,
    inputType = 'text',
    helperClassName,
    rows = DEFAULTS.rows,
    disabled = false,
    variant = DEFAULTS.variant,
    size = DEFAULTS.size,
    matchMode = DEFAULTS.matchMode,
    disableInlineFill = DEFAULTS.disableInlineFill,
    enableArrowNavigation = DEFAULTS.enableArrowNavigation,
    minQueryLength = DEFAULTS.minQueryLength,
    debounceMs = DEFAULTS.debounceMs,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    showHelper = false,
    helperIdleMs = DEFAULTS.helperIdleMs,
    helperText,
    defaultValue = '',
    value,
    status,
    theme,
    name,
    id,
    required = false,
    readOnly = false,
    maxLength,
    autoFocus = false,
    acceptOnEnter = true,
    commitOnBlur = false,
    partialAccept = true,
  } = props;

  const isControlled = value !== undefined;
  const surface = as;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? (value as string) : internalValue;

  const [isFocused, setIsFocused] = useState(false);
  const [ghostCompletion, setGhostCompletion] =
    useState<InlineCompletion | null>(null);
  const [ghostPrefixOffset, setGhostPrefixOffset] = useState(0);
  const [isHelperVisible, setIsHelperVisible] = useState(showHelper === true);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [inlineMatches, setInlineMatches] = useState<InlineCompletion[]>([]);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [activeSegmentStart, setActiveSegmentStart] = useState(0);

  const editorRef = useRef<EditableElement | null>(null);
  const ghostMeasureRef = useRef<HTMLSpanElement | null>(null);
  const isDeletingRef = useRef(false);
  const dismissedValueRef = useRef<string | null>(null);
  // Set when a programmatic value change (word-by-word accept) must land the
  // caret at the end after React re-renders the new value, so the next ghost
  // keeps rendering instead of being suppressed by a mid-string caret.
  const forceCaretEndRef = useRef(false);
  const helperId = useId();

  const completionContext = useMemo(
    () => getCompletionContext(currentValue, activeSegmentStart),
    [activeSegmentStart, currentValue]
  );
  const activeTrigger = useMemo(
    () =>
      findActiveTrigger(currentValue, activeSegmentStart, triggerSuggestions),
    [activeSegmentStart, currentValue, triggerSuggestions]
  );
  const normalAsyncSuggestions = activeTrigger ? undefined : asyncSuggestions;

  const { matches, isLoading } = useSuggestions(completionContext.query, {
    suggestions,
    asyncFetcher: normalAsyncSuggestions,
    minQueryLength,
    debounceMs,
    matchMode,
  });
  const ghostText = ghostCompletion?.suggestion ?? null;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
      select: () => {
        if (editorRef.current) selectEditableText(editorRef.current);
      },
    }),
    []
  );

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const syncCaret = useCallback(() => {
    const node = editorRef.current;
    setCaretAtEnd(node ? isCaretAtEnd(node) : true);
  }, []);

  const commitValue = useCallback(
    (finalValue: string) => {
      setValue(finalValue);
      setGhostCompletion(null);
      setInlineMatches([]);
      setActiveMatchIndex(0);
      setActiveSegmentStart(finalValue.length);
      dismissedValueRef.current = null;

      const node = editorRef.current;
      if (node) {
        // `contenteditable` is uncontrolled, so its DOM must be
        // written directly. For input/textarea we only touch the DOM in the
        // uncontrolled case — writing to a controlled element's `.value`
        // fights React's own render and is reverted on the next commit.
        if (surface === 'contenteditable' || !isControlled) {
          setEditableText(node, finalValue);
        }
        moveCaretToEnd(node);
      }

      onCommit?.(finalValue);
    },
    [isControlled, onCommit, setValue, surface]
  );

  // Grows the value toward the suggestion without finalizing it — used by
  // word-by-word accept. The ghost is left in place (the effect recomputes it
  // for the longer value); the caret is forced back to the end post-render.
  const extendValue = useCallback(
    (nextValue: string) => {
      forceCaretEndRef.current = true;
      isDeletingRef.current = false;
      dismissedValueRef.current = null;
      setValue(nextValue);
    },
    [setValue]
  );

  const handleEditorChange = (nextValue: string) => {
    setValue(nextValue);
    setActiveSegmentStart((start) => (nextValue.length < start ? 0 : start));
    syncCaret();

    if (dismissedValueRef.current !== nextValue) {
      dismissedValueRef.current = null;
    }
    setActiveMatchIndex(0);

    if (
      isDeletingRef.current ||
      disableInlineFill ||
      readOnly ||
      nextValue.trim().length < minQueryLength
    ) {
      setGhostCompletion(null);
    }
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    handleEditorChange(e.target.value);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleEditorChange(e.target.value);
  };

  const handleContentEditableInput = (e: FormEvent<HTMLDivElement>) => {
    handleEditorChange(getEditableText(e.currentTarget));
  };

  const handleKeyDown = (e: KeyboardEvent<EditableElement>) => {
    isDeletingRef.current = e.key === 'Backspace' || e.key === 'Delete';

    if (e.key === 'Escape') {
      if (ghostText) {
        e.preventDefault();
        onDismiss?.();
      }
      dismissedValueRef.current = currentValue;
      setGhostCompletion(null);
      setActiveMatchIndex(0);
      return;
    }

    if (
      enableArrowNavigation &&
      inlineMatches.length > 1 &&
      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
    ) {
      e.preventDefault();
      setActiveMatchIndex((prev) => {
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        return (prev + direction + inlineMatches.length) % inlineMatches.length;
      });
      return;
    }

    const ghostParts = ghostCompletion?.parts ?? null;

    // Word-by-word accept: Ctrl/Cmd + ArrowRight pulls in the next word of the
    // hint. Only for start-anchored hints (empty prefix); substring hints with
    // a prefix fall through to the browser's normal word navigation.
    if (
      partialAccept &&
      ghostParts &&
      ghostParts.prefix === '' &&
      e.key === 'ArrowRight' &&
      (e.ctrlKey || e.metaKey)
    ) {
      const wordLen = nextWordLength(ghostParts.suffix);
      if (wordLen > 0) {
        e.preventDefault();
        extendValue(currentValue + ghostParts.suffix.slice(0, wordLen));
        return;
      }
    }

    const acceptsHint =
      e.key === 'Tab' || (acceptOnEnter && e.key === 'Enter' && !e.shiftKey);

    if (ghostCompletion && acceptsHint) {
      e.preventDefault();
      const finalValue = ghostCompletion.finalValue;
      onAccept?.(finalValue, ghostCompletion.suggestion);
      commitValue(finalValue);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitValue(currentValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setActiveSegmentStart(currentValue.length > 0 ? currentValue.length : 0);
    syncCaret();
  };

  const handleBlur = () => {
    if (commitOnBlur) commitValue(currentValue);
    setIsFocused(false);
    setGhostCompletion(null);
    setInlineMatches([]);
    setActiveMatchIndex(0);
    setActiveSegmentStart(currentValue.length);
  };

  useEffect(() => {
    if (surface !== 'contenteditable') return;

    const node = editorRef.current;
    if (!node || getEditableText(node) === currentValue) return;

    setEditableText(node, currentValue);
    if (isFocused) moveCaretToEnd(node);
  }, [currentValue, isFocused, surface]);

  useBrowserLayoutEffect(() => {
    if (surface !== 'contenteditable' || !autoFocus || disabled) return;
    const node = editorRef.current;
    if (!node) return;

    node.focus();
    moveCaretToEnd(node);
    setIsFocused(true);
    setCaretAtEnd(true);
  }, [autoFocus, disabled, surface]);

  // After a programmatic value growth (word-by-word accept) React re-renders the
  // longer value but may keep the caret at its old offset (now mid-string).
  // Restore it to the end so the running ghost isn't suppressed.
  useBrowserLayoutEffect(() => {
    if (!forceCaretEndRef.current) return;
    forceCaretEndRef.current = false;
    const node = editorRef.current;
    if (node) {
      moveCaretToEnd(node);
      setCaretAtEnd(true);
    }
  }, [currentValue]);

  // contenteditable doesn't emit `onSelect`, so caret moves (click, arrows)
  // are observed via the document-level `selectionchange` event while focused.
  useEffect(() => {
    if (surface !== 'contenteditable' || !isFocused) return;
    if (typeof document === 'undefined') return;

    document.addEventListener('selectionchange', syncCaret);
    return () => document.removeEventListener('selectionchange', syncCaret);
  }, [surface, isFocused, syncCaret]);

  useEffect(() => {
    if (
      !isFocused ||
      disableInlineFill ||
      readOnly ||
      isDeletingRef.current ||
      !caretAtEnd ||
      dismissedValueRef.current === currentValue ||
      (normalAsyncSuggestions && isLoading)
    ) {
      setGhostCompletion(null);
      setInlineMatches([]);
      return;
    }

    const nativeMaxLength =
      (surface === 'input' || surface === 'textarea') &&
      typeof maxLength === 'number'
        ? maxLength
        : undefined;

    const nextInlineMatches = activeTrigger
      ? buildTriggerCompletions(currentValue, activeTrigger)
      : completionContext.query.trim().length < minQueryLength
        ? []
        : matches
            .map((match) =>
              buildNormalCompletion(currentValue, completionContext, match)
            )
            .filter((match): match is InlineCompletion => match !== null);

    const nextAvailableMatches =
      nativeMaxLength === undefined
        ? nextInlineMatches
        : nextInlineMatches.filter(
            (match) => match.finalValue.length <= nativeMaxLength
          );

    setInlineMatches(nextAvailableMatches);

    if (nextAvailableMatches.length === 0) {
      setGhostCompletion(null);
      return;
    }

    const safeIndex =
      activeMatchIndex >= nextAvailableMatches.length ? 0 : activeMatchIndex;
    if (safeIndex !== activeMatchIndex) {
      setActiveMatchIndex(safeIndex);
    }

    setGhostCompletion(nextAvailableMatches[safeIndex]);
  }, [
    activeMatchIndex,
    activeTrigger,
    caretAtEnd,
    completionContext,
    currentValue,
    disableInlineFill,
    isFocused,
    isLoading,
    matches,
    maxLength,
    minQueryLength,
    normalAsyncSuggestions,
    readOnly,
    surface,
  ]);

  const ghostTextParts = ghostCompletion?.parts ?? null;
  const ghostPrefix = ghostTextParts?.prefix ?? '';
  const hasGhostTextParts = ghostTextParts !== null;
  const canCycleSuggestions = enableArrowNavigation && inlineMatches.length > 1;

  const showHelperText =
    showHelper !== false &&
    isHelperVisible &&
    hasGhostTextParts &&
    helperText !== null &&
    helperText !== false;

  useEffect(() => {
    if (!hasGhostTextParts || showHelper === false) {
      setIsHelperVisible(false);
      return;
    }

    if (showHelper === true) {
      setIsHelperVisible(true);
      return;
    }

    setIsHelperVisible(false);
    const timer = window.setTimeout(() => {
      setIsHelperVisible(true);
    }, helperIdleMs);

    return () => window.clearTimeout(timer);
  }, [currentValue, hasGhostTextParts, helperIdleMs, showHelper]);

  // Aligns the typed text over the ghost by measuring the rendered width of the
  // ghost prefix and shifting the editor's left padding by that amount. This is
  // exact for prefixes that stay on a single visual line. For a `substring`
  // match whose prefix wraps across lines in a multiline textarea/contenteditable, the
  // single-span measurement can't model the wrap, so alignment is approximate —
  // `startsWith` (empty prefix) is always pixel-exact.
  useBrowserLayoutEffect(() => {
    const measure = ghostMeasureRef.current;
    const editor = editorRef.current;

    if (!ghostPrefix || !measure || !editor) {
      setGhostPrefixOffset((current) => (current === 0 ? current : 0));
      return;
    }

    const editorStyle = window.getComputedStyle(editor);
    measure.style.font = editorStyle.font;
    measure.style.letterSpacing = editorStyle.letterSpacing;
    measure.style.wordSpacing = editorStyle.wordSpacing;
    measure.style.textTransform = editorStyle.textTransform;

    const nextOffset = Math.ceil(measure.getBoundingClientRect().width);
    setGhostPrefixOffset((current) =>
      Math.abs(current - nextOffset) < 1 ? current : nextOffset
    );
  }, [className, editorClassName, ghostPrefix, size, surface]);

  const editorPrefixStyle: CSSProperties | undefined =
    ghostTextParts && ghostPrefixOffset > 0
      ? { paddingLeft: `calc(var(--ff-padding-x) + ${ghostPrefixOffset}px)` }
      : undefined;

  const acceptHintText = acceptOnEnter
    ? 'Tab or Enter accepts the hint.'
    : 'Tab accepts the hint. Enter commits typed text.';
  const defaultHelperText = canCycleSuggestions
    ? `Arrow up or arrow down changes the hint. ${acceptHintText} Esc hides it.`
    : `${acceptHintText} Esc hides it.`;

  const defaultHelper = (
    <>
      {canCycleSuggestions && (
        <>
          <kbd className="ff-key">Up</kbd>
          <span>or</span>
          <kbd className="ff-key">Down</kbd>
          <span>changes hint.</span>
        </>
      )}
      <kbd className="ff-key">Tab</kbd>
      {acceptOnEnter ? (
        <>
          <span>or</span>
          <kbd className="ff-key">Enter</kbd>
          <span>accepts the hint.</span>
        </>
      ) : (
        <>
          <span>accepts the hint.</span>
          <kbd className="ff-key">Enter</kbd>
          <span>commits typed text.</span>
        </>
      )}
      <kbd className="ff-key">Esc</kbd>
      <span>hides it.</span>
    </>
  );
  // Effective visual status. `loading` is also inferred from async fetches so
  // callers get the progress bar for free; explicit `status` always wins.
  const isLoadingState =
    status === 'loading' || (!!normalAsyncSuggestions && isLoading);
  const resolvedState: 'idle' | 'success' | 'error' =
    status === 'error' || status === 'success'
      ? status
      : 'idle';

  // Single polite announcement for assistive tech. The ghost overlay is
  // `aria-hidden`, so without this a screen-reader user never learns a
  // suggestion exists.
  const liveMessage = isLoadingState
    ? 'Loading suggestions…'
    : hasGhostTextParts && ghostText
      ? canCycleSuggestions
        ? `${inlineMatches.length} suggestions available. Current: ${ghostText}. Use Up and Down arrows to cycle. ${acceptHintText}`
        : `Suggestion available: ${ghostText}. ${acceptHintText}`
      : '';

  const describedBy = joinIds(ariaDescribedBy, showHelperText && helperId);

  const editableClassName = cx(
    'ff-editor',
    surface === 'input' && 'ff-editor--input',
    surface === 'contenteditable' && 'ff-editor--contenteditable',
    editorClassName
  );

  const editorAriaProps = {
    'aria-label': ariaLabelledBy ? undefined : (ariaLabel ?? placeholder),
    'aria-labelledby': ariaLabelledBy,
    'aria-autocomplete': 'inline' as const,
    'aria-describedby': describedBy,
    'aria-invalid': resolvedState === 'error' || undefined,
    'aria-busy': isLoadingState || undefined,
    'aria-required': required || undefined,
    'aria-readonly': readOnly || undefined,
  };

  // Native form attributes, spread onto input/textarea only (a contenteditable
  // div must not receive `name`/`required`/`maxLength`, which React rejects on
  // a non-form element). The component's own value/handlers always win because
  // these are spread before them.
  const nativeFormProps = {
    name,
    required,
    readOnly,
    maxLength,
    autoFocus,
  };

  return (
    <div
      className={cx('ff-root', className)}
      data-variant={variant}
      data-size={size}
      data-surface={surface}
      data-state={resolvedState}
      data-loading={isLoadingState ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-theme={theme}
    >
      <div className="ff-field">
        <span
          ref={ghostMeasureRef}
          className="ff-ghost-measure"
          aria-hidden="true"
        >
          {ghostPrefix}
        </span>

        {ghostTextParts && (
          <div className="ff-ghost" aria-hidden="true">
            <span className="ff-ghost-prefix">{ghostTextParts.prefix}</span>
            <span className="ff-ghost-typed">{ghostTextParts.typed}</span>
            <span className="ff-ghost-suffix">{ghostTextParts.suffix}</span>
            {showHelperText && (
              <span
                className={cx('ff-helper', helperClassName)}
              >
                <span className="ff-helper-separator" aria-hidden="true">
                  |
                </span>
                {helperText ?? defaultHelper}
              </span>
            )}
          </div>
        )}

        {surface === 'textarea' && (
          <textarea
            ref={(node) => {
              editorRef.current = node;
            }}
            id={id}
            value={currentValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onSelect={syncCaret}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            {...nativeFormProps}
            {...editorAriaProps}
            className={editableClassName}
            style={editorPrefixStyle}
          />
        )}

        {surface === 'input' && (
          <input
            ref={(node) => {
              editorRef.current = node;
            }}
            id={id}
            value={currentValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={syncCaret}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            type={inputType}
            spellCheck={false}
            autoComplete="off"
            {...nativeFormProps}
            {...editorAriaProps}
            className={editableClassName}
            style={editorPrefixStyle}
          />
        )}

        {surface === 'contenteditable' && (
          <div
            ref={(node) => {
              editorRef.current = node;
            }}
            id={id}
            contentEditable={!disabled && !readOnly}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-disabled={disabled || undefined}
            {...editorAriaProps}
            data-placeholder={placeholder}
            data-empty={currentValue.length === 0}
            spellCheck={false}
            tabIndex={disabled ? -1 : 0}
            onInput={handleContentEditableInput}
            onKeyDown={handleKeyDown}
            onSelect={syncCaret}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={editableClassName}
            style={editorPrefixStyle}
          />
        )}
      </div>

      {showHelperText && (
        <span id={helperId} className="ff-sr-only">
          {defaultHelperText}
        </span>
      )}

      {/* Single polite live region: announces loading + inline suggestions
          that are otherwise visually-only (the ghost overlay is aria-hidden). */}
      <span className="ff-sr-only" role="status" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
});

export default ForeFill;
