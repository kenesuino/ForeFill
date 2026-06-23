/**
 * ForeFillController — vanilla twin of the React `ForeFill` component.
 *
 * Owns the editable element, wires its events, runs the suggestion engine, and
 * drives the overlay. The behavior mirrors `ForeFill.tsx` field-for-field so the
 * two surfaces stay consistent (parallel implementation, by design).
 *
 * No React. Public consumption is via `attachForeFill` / `createForeFill` in
 * `vanilla.ts`, not this class directly.
 */

import { SuggestionEngine } from './asyncEngine';
import {
  detectCoarsePointer,
  getEditableText,
  isCaretAtEnd,
  isInput,
  isTextarea,
  moveCaretToEnd,
  selectEditableText,
  setEditableText,
  type EditableElement,
} from './dom';
import {
  buildNormalCompletion,
  buildTriggerCompletions,
  computeWholeMatches,
  findActiveTrigger,
  getChangeStart,
  getCompletionContext,
  joinIds,
  nextWordLength,
  type ActiveTrigger,
  type InlineCompletion,
} from './engine';
import { Overlay, type OverlayState } from './overlay';
import type {
  ForeFillVanillaOptions,
  ForeFillInstance,
  ForeFillSurface,
  ForeFillVariant,
  ForeFillSize,
  ForeFillMatchMode,
  ForeFillTriggerSuggestion,
  AsyncSuggestionFetcher,
} from './types';

const DEFAULTS = {
  rows: 3,
  inputType: 'text',
  variant: 'outline' as ForeFillVariant,
  size: 'md' as ForeFillSize,
  matchMode: 'substring' as ForeFillMatchMode,
  matchWholeValue: true,
  disableInlineFill: false,
  enableArrowNavigation: true,
  minQueryLength: 1,
  debounceMs: 0,
  helperIdleMs: 900,
  touchAccept: 'auto' as boolean | 'auto',
  touchAcceptLabel: 'Accept suggestion',
  active: false,
  showHelper: false as boolean | 'idle',
  acceptOnEnter: true,
  commitOnBlur: false,
  partialAccept: true,
  status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
};

interface ResolvedOptions {
  suggestions: string[];
  triggerSuggestions: ForeFillTriggerSuggestion[];
  asyncSuggestions?: AsyncSuggestionFetcher;
  onCommit?: (value: string) => void;
  onChange?: (value: string) => void;
  onAccept?: (value: string, suggestion: string) => void;
  onDismiss?: () => void;
  className?: string;
  editorClassName?: string;
  helperClassName?: string;
  touchAcceptClassName?: string;
  rows: number;
  inputType: string;
  variant: ForeFillVariant;
  size: ForeFillSize;
  matchMode: ForeFillMatchMode;
  matchWholeValue: boolean;
  disableInlineFill: boolean;
  enableArrowNavigation: boolean;
  minQueryLength: number;
  debounceMs: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  showHelper: boolean | 'idle';
  helperIdleMs: number;
  helperText?: string;
  theme?: 'light' | 'dark';
  status: 'idle' | 'loading' | 'success' | 'error';
  required: boolean;
  readOnly: boolean;
  maxLength?: number;
  autoFocus: boolean;
  disabled: boolean;
  acceptOnEnter: boolean;
  commitOnBlur: boolean;
  partialAccept: boolean;
  touchAccept: boolean | 'auto';
  touchAcceptLabel: string;
  renderTouchAccept?: (api: {
    accept: () => void;
    suggestion: string;
    label: string;
  }) => HTMLElement;
  active: boolean;
  placeholder: string;
  name?: string;
  id?: string;
}

export class ForeFillController implements ForeFillInstance {
  private readonly editor: EditableElement;
  private readonly surface: ForeFillSurface;
  private readonly overlay: Overlay;
  private readonly engine: SuggestionEngine;

  private opts: ResolvedOptions;

  // State (mirrors the React component's useState/useRef fields).
  private value = '';
  private isFocused = false;
  private ghostCompletion: InlineCompletion | null = null;
  private activeMatchIndex = 0;
  private inlineMatches: InlineCompletion[] = [];
  private caretAtEnd = true;
  private activeSegmentStart = 0;
  private ghostScroll = { left: 0, top: 0 };
  private isCoarsePointer = false;
  private dismissedValue: string | null = null;
  private isDeleting = false;
  private helperVisible = false;

  // Cached active trigger (refreshed in reconcile/applyOverlay) used to decide
  // whether async loading should gate the ghost.
  private _lastActiveTrigger: ActiveTrigger | null = null;

  // Engine outputs (set by the engine listener).
  private matches: string[] = [];
  private isLoading = false;

  // Helper idle timer.
  private helperTimer: ReturnType<typeof setTimeout> | null = null;
  // Coarse-pointer media query listener.
  private coarseMql: MediaQueryList | null = null;
  // selectionchange binding (contenteditable only).
  private boundSelectionSync: () => void;
  // Bound event handlers (kept for removal).
  private boundInput: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundFocus: () => void;
  private boundBlur: () => void;
  private boundScroll: () => void;
  private boundSelect: () => void;
  private boundCoarseChange: () => void;

  private destroyed = false;
  private isReconciling = false;
  private lastEngineQuery = '';
  private lastEngineSig = '';

  constructor(editor: EditableElement, options: ForeFillVanillaOptions = {}) {
    this.editor = editor;
    this.surface = this.inferSurface(editor);
    this.opts = this.resolveOptions(options);

    this.engine = new SuggestionEngine();
    this.engine.setListener((r) => {
      this.matches = r.matches;
      this.isLoading = r.isLoading;
      this.reconcile();
    });

    this.overlay = new Overlay(editor, this.opts.editorClassName);

    // Read the initial value from the editor.
    this.value = getEditableText(editor);

    // Bind handlers.
    this.boundInput = this.handleInput.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundFocus = this.handleFocus.bind(this);
    this.boundBlur = this.handleBlur.bind(this);
    this.boundScroll = this.syncGhostScroll.bind(this);
    this.boundSelect = this.syncCaret.bind(this);
    this.boundSelectionSync = this.syncCaret.bind(this);
    this.boundCoarseChange = () => {
      this.isCoarsePointer = detectCoarsePointer();
      this.applyOverlay();
    };

    this.applyEditorAttributes();
    this.wireEvents();
    this.setupCoarsePointer();

    if (this.opts.autoFocus && !this.opts.disabled) {
      this.focus();
      moveCaretToEnd(this.editor);
      this.isFocused = true;
      this.caretAtEnd = true;
      this.syncGhostScroll();
    }

    this.reconcile();
  }

  // ----- Public API -------------------------------------------------------

  focus(): void {
    this.editor.focus();
  }

  blur(): void {
    this.editor.blur();
  }

  select(): void {
    selectEditableText(this.editor);
  }

  getValue(): string {
    return getEditableText(this.editor);
  }

  setValue(next: string): void {
    if (this.destroyed) return;
    setEditableText(this.editor, next);
    this.handleEditorChange(next);
    moveCaretToEnd(this.editor);
    this.caretAtEnd = true;
    this.syncGhostScroll();
    this.reconcile();
  }

  setOptions(options: Partial<ForeFillVanillaOptions>): void {
    if (this.destroyed) return;
    this.opts = this.resolveOptions({ ...this.opts, ...options });
    this.applyEditorAttributes();
    this.overlay.applyEditorClassName(this.opts.editorClassName);
    this.reconcile();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.editor.removeEventListener('input', this.boundInput);
    this.editor.removeEventListener('keydown', this.boundKeyDown as EventListener);
    this.editor.removeEventListener('focus', this.boundFocus);
    this.editor.removeEventListener('blur', this.boundBlur);
    this.editor.removeEventListener('scroll', this.boundScroll);
    this.editor.removeEventListener('select', this.boundSelect);
    document.removeEventListener('selectionchange', this.boundSelectionSync);
    if (this.coarseMql) {
      this.coarseMql.removeEventListener?.('change', this.boundCoarseChange);
      this.coarseMql = null;
    }
    if (this.helperTimer) {
      clearTimeout(this.helperTimer);
      this.helperTimer = null;
    }

    this.engine.destroy();
    this.overlay.destroy();
  }

  // ----- Setup ------------------------------------------------------------

  private inferSurface(node: EditableElement): ForeFillSurface {
    if (isInput(node)) return 'input';
    if (isTextarea(node)) return 'textarea';
    return 'contenteditable';
  }

  private resolveOptions(options: ForeFillVanillaOptions): ResolvedOptions {
    return {
      suggestions: options.suggestions ?? [],
      triggerSuggestions: options.triggerSuggestions ?? [],
      asyncSuggestions: options.asyncSuggestions,
      onCommit: options.onCommit,
      onChange: options.onChange,
      onAccept: options.onAccept,
      onDismiss: options.onDismiss,
      className: options.className,
      editorClassName: options.editorClassName,
      helperClassName: options.helperClassName,
      touchAcceptClassName: options.touchAcceptClassName,
      rows: options.rows ?? DEFAULTS.rows,
      inputType: options.inputType ?? DEFAULTS.inputType,
      variant: options.variant ?? DEFAULTS.variant,
      size: options.size ?? DEFAULTS.size,
      matchMode: options.matchMode ?? DEFAULTS.matchMode,
      matchWholeValue: options.matchWholeValue ?? DEFAULTS.matchWholeValue,
      disableInlineFill: options.disableInlineFill ?? DEFAULTS.disableInlineFill,
      enableArrowNavigation:
        options.enableArrowNavigation ?? DEFAULTS.enableArrowNavigation,
      minQueryLength: options.minQueryLength ?? DEFAULTS.minQueryLength,
      debounceMs: options.debounceMs ?? DEFAULTS.debounceMs,
      ariaLabel: options.ariaLabel,
      ariaLabelledBy: options.ariaLabelledBy,
      ariaDescribedBy: options.ariaDescribedBy,
      showHelper: options.showHelper ?? DEFAULTS.showHelper,
      helperIdleMs: options.helperIdleMs ?? DEFAULTS.helperIdleMs,
      helperText: options.helperText,
      theme: options.theme,
      status: options.status ?? DEFAULTS.status,
      required: options.required ?? false,
      readOnly: options.readOnly ?? false,
      maxLength: options.maxLength,
      autoFocus: options.autoFocus ?? false,
      disabled: options.disabled ?? false,
      acceptOnEnter: options.acceptOnEnter ?? DEFAULTS.acceptOnEnter,
      commitOnBlur: options.commitOnBlur ?? DEFAULTS.commitOnBlur,
      partialAccept: options.partialAccept ?? DEFAULTS.partialAccept,
      touchAccept: options.touchAccept ?? DEFAULTS.touchAccept,
      touchAcceptLabel: options.touchAcceptLabel ?? DEFAULTS.touchAcceptLabel,
      renderTouchAccept: options.renderTouchAccept,
      active: options.active ?? DEFAULTS.active,
      placeholder: options.placeholder ?? 'Type to search...',
      name: options.name,
      id: options.id,
    };
  }

  private applyEditorAttributes(): void {
    const { opts, editor, surface } = this;
    const isFormEl = surface === 'input' || surface === 'textarea';

    if (opts.id) editor.id = opts.id;
    else editor.removeAttribute('id');

    if (isFormEl) {
      const el = editor as HTMLInputElement | HTMLTextAreaElement;
      if (opts.name) el.name = opts.name;
      else el.removeAttribute('name');
      el.required = opts.required;
      el.readOnly = opts.readOnly;
      if (typeof opts.maxLength === 'number') el.maxLength = opts.maxLength;
      else el.removeAttribute('maxlength');
      el.spellcheck = false;
      el.autocomplete = 'off';
      if (surface === 'textarea') {
        (el as HTMLTextAreaElement).rows = opts.rows;
        (el as HTMLTextAreaElement).placeholder = opts.placeholder;
      } else {
        (el as HTMLInputElement).type = opts.inputType;
        (el as HTMLInputElement).placeholder = opts.placeholder;
      }
      if (opts.disabled) {
        el.disabled = true;
      } else {
        el.disabled = false;
      }
    } else {
      const div = editor as HTMLDivElement;
      div.contentEditable = String(!opts.disabled && !opts.readOnly);
      div.setAttribute('role', 'textbox');
      div.setAttribute('aria-multiline', 'true');
      if (opts.disabled) {
        div.setAttribute('aria-disabled', 'true');
        div.tabIndex = -1;
      } else {
        div.removeAttribute('aria-disabled');
        div.tabIndex = 0;
      }
      div.setAttribute('data-placeholder', opts.placeholder);
      div.setAttribute('spellcheck', 'false');
      div.toggleAttribute('data-empty', this.value.length === 0);
    }

    // aria-* (applied to all surfaces).
    if (opts.ariaLabelledBy) {
      editor.setAttribute('aria-labelledby', opts.ariaLabelledBy);
      editor.removeAttribute('aria-label');
    } else {
      editor.setAttribute('aria-label', opts.ariaLabel ?? opts.placeholder);
      editor.removeAttribute('aria-labelledby');
    }
    editor.setAttribute('aria-autocomplete', 'inline');
  }

  private wireEvents(): void {
    this.editor.addEventListener('input', this.boundInput);
    this.editor.addEventListener('keydown', this.boundKeyDown as EventListener);
    this.editor.addEventListener('focus', this.boundFocus);
    this.editor.addEventListener('blur', this.boundBlur);
    this.editor.addEventListener('scroll', this.boundScroll);
    this.editor.addEventListener('select', this.boundSelect);
    // selectionchange is document-level (contenteditable caret moves).
    document.addEventListener('selectionchange', this.boundSelectionSync);
  }

  private setupCoarsePointer(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    this.coarseMql = window.matchMedia('(pointer: coarse)');
    this.isCoarsePointer = this.coarseMql.matches;
    this.coarseMql.addEventListener?.('change', this.boundCoarseChange);
  }

  // ----- Event handlers ---------------------------------------------------

  private handleInput(): void {
    const next = getEditableText(this.editor);
    this.handleEditorChange(next);
    this.reconcile();
  }

  private handleEditorChange(nextValue: string): void {
    const nextCaretAtEnd = isCaretAtEnd(this.editor);
    const changeStart = getChangeStart(this.value, nextValue);

    this.value = nextValue;
    this.opts.onChange?.(nextValue);

    if (changeStart < this.activeSegmentStart) {
      this.activeSegmentStart = nextValue.length;
    }

    this.caretAtEnd = nextCaretAtEnd;
    this.syncGhostScroll();

    if (this.dismissedValue !== nextValue) {
      this.dismissedValue = null;
    }
    this.activeMatchIndex = 0;

    if (
      this.isDeleting ||
      this.opts.disableInlineFill ||
      this.opts.readOnly ||
      nextValue.trim().length < this.opts.minQueryLength
    ) {
      this.ghostCompletion = null;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.isDeleting = e.key === 'Backspace' || e.key === 'Delete';

    if (e.key === 'Escape') {
      if (this.ghostCompletion) {
        e.preventDefault();
        this.opts.onDismiss?.();
      }
      this.dismissedValue = this.value;
      this.ghostCompletion = null;
      this.activeMatchIndex = 0;
      this.applyOverlay();
      return;
    }

    if (
      this.opts.enableArrowNavigation &&
      this.inlineMatches.length > 1 &&
      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
    ) {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      this.activeMatchIndex =
        (this.activeMatchIndex + direction + this.inlineMatches.length) %
        this.inlineMatches.length;
      this.reconcile();
      return;
    }

    const ghostParts = this.ghostCompletion?.parts ?? null;

    if (
      this.opts.partialAccept &&
      ghostParts &&
      ghostParts.prefix === '' &&
      e.key === 'ArrowRight' &&
      (e.ctrlKey || e.metaKey)
    ) {
      const wordLen = nextWordLength(ghostParts.suffix);
      if (wordLen > 0) {
        e.preventDefault();
        this.extendValue(this.value + ghostParts.suffix.slice(0, wordLen));
        return;
      }
    }

    const acceptsHint =
      e.key === 'Tab' ||
      (this.opts.acceptOnEnter && e.key === 'Enter' && !e.shiftKey);

    if (this.ghostCompletion && acceptsHint) {
      e.preventDefault();
      this.acceptGhost();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      // Matches the React component: plain Enter commits typed text (and is
      // prevented) on every surface; Shift+Enter inserts a newline on
      // textarea/contenteditable.
      e.preventDefault();
      this.commitValue(this.value);
    }
  }

  private handleFocus(): void {
    this.isFocused = true;
    this.activeSegmentStart = this.value.length > 0 ? this.value.length : 0;
    this.syncCaret();
    this.syncGhostScroll();
    this.reconcile();
  }

  private handleBlur(): void {
    if (this.opts.commitOnBlur) this.commitValue(this.value);
    this.isFocused = false;
    this.ghostCompletion = null;
    this.inlineMatches = [];
    this.activeMatchIndex = 0;
    this.activeSegmentStart = this.value.length;
    this.reconcile();
  }

  private syncCaret(): void {
    this.caretAtEnd = isCaretAtEnd(this.editor);
    // Caret moves can change whether the ghost should show; re-evaluate fully
    // (the suppression condition depends on caretAtEnd).
    this.reconcile();
  }

  private syncGhostScroll(): void {
    const left = this.editor.scrollLeft ?? 0;
    const top = this.editor.scrollTop ?? 0;
    if (this.ghostScroll.left !== left || this.ghostScroll.top !== top) {
      this.ghostScroll = { left, top };
      this.applyOverlay();
    }
  }

  // ----- Value mutation ---------------------------------------------------

  private commitValue(finalValue: string): void {
    this.value = finalValue;
    this.opts.onChange?.(finalValue);
    this.opts.onCommit?.(finalValue);

    this.ghostCompletion = null;
    this.inlineMatches = [];
    this.activeMatchIndex = 0;
    this.activeSegmentStart = finalValue.length;
    this.dismissedValue = null;

    // Write to the editor (contenteditable is always uncontrolled; for
    // input/textarea a hint accept needs the final value written too).
    if (
      this.surface === 'contenteditable' ||
      this.value !== getEditableText(this.editor)
    ) {
      setEditableText(this.editor, finalValue);
    }
    moveCaretToEnd(this.editor);
    this.syncGhostScroll();
    this.reconcile();
  }

  private extendValue(nextValue: string): void {
    this.isDeleting = false;
    this.dismissedValue = null;
    this.value = nextValue;
    this.opts.onChange?.(nextValue);
    setEditableText(this.editor, nextValue);
    moveCaretToEnd(this.editor);
    this.caretAtEnd = true;
    this.syncGhostScroll();
    this.reconcile();
  }

  private acceptGhost(): void {
    const completion = this.ghostCompletion;
    if (!completion) return;
    this.opts.onAccept?.(completion.finalValue, completion.suggestion);
    this.commitValue(completion.finalValue);
    this.editor.focus();
  }

  private acceptGhostUpTo(endOffset: number): void {
    const completion = this.ghostCompletion;
    if (!completion) return;
    const { prefix, suffix } = completion.parts;
    if (
      !this.opts.partialAccept ||
      prefix !== '' ||
      endOffset >= suffix.length
    ) {
      this.acceptGhost();
      return;
    }
    this.extendValue(this.value + suffix.slice(0, endOffset));
    this.editor.focus();
  }

  // ----- Reconcile --------------------------------------------------------

  private reconcile(): void {
    if (this.destroyed || this.isReconciling) return;
    this.isReconciling = true;
    try {
      this.reconcileInner();
    } finally {
      this.isReconciling = false;
    }
  }

  private reconcileInner(): void {
    const { opts, surface } = this;
    const value = this.value;

    // contenteditable data-empty reflects current value.
    if (surface === 'contenteditable') {
      (this.editor as HTMLDivElement).toggleAttribute(
        'data-empty',
        value.length === 0
      );
    }

    const completionContext = getCompletionContext(value, this.activeSegmentStart);
    const activeTrigger = findActiveTrigger(
      value,
      this.activeSegmentStart,
      opts.triggerSuggestions
    );
    this._lastActiveTrigger = activeTrigger;
    const effectiveAsync = activeTrigger ? undefined : opts.asyncSuggestions;

    // Drive the engine only when the query or effective config changed, so an
    // async resolution (which calls reconcile via the listener) doesn't kick
    // off a duplicate fetch. The listener's re-entrant reconcile call is
    // guarded by isReconciling, so the matches it just set are read below.
    const engineSig =
      `${effectiveAsync ? 'a' : 's'}|${opts.minQueryLength}|${opts.debounceMs}|${opts.matchMode}|${opts.suggestions.join('\u0001')}`;
    if (
      completionContext.query !== this.lastEngineQuery ||
      engineSig !== this.lastEngineSig
    ) {
      this.lastEngineQuery = completionContext.query;
      this.lastEngineSig = engineSig;
      this.engine.setOptions({
        suggestions: opts.suggestions,
        asyncFetcher: effectiveAsync,
        minQueryLength: opts.minQueryLength,
        debounceMs: opts.debounceMs,
        matchMode: opts.matchMode,
      });
      this.engine.setQuery(completionContext.query);
    }

    // matches/isLoading were refreshed by the engine listener (synchronously
    // for static mode); for async they reflect the latest in-flight state.

    const hasAsync = !!effectiveAsync;
    const wholeMatches = computeWholeMatches(
      value,
      this.activeSegmentStart,
      opts.matchWholeValue,
      hasAsync,
      activeTrigger,
      opts.suggestions.length ? opts.suggestions : undefined,
      opts.matchMode,
      opts.minQueryLength
    );

    // Mirror the React effect's suppression conditions.
    if (
      (!this.isFocused && !opts.active) ||
      opts.disableInlineFill ||
      opts.readOnly ||
      this.isDeleting ||
      !this.caretAtEnd ||
      this.dismissedValue === value ||
      (hasAsync && this.isLoading)
    ) {
      this.ghostCompletion = null;
      this.inlineMatches = [];
      this.syncHelper(false);
      this.applyOverlay();
      return;
    }

    const nativeMaxLength =
      (surface === 'input' || surface === 'textarea') &&
      typeof opts.maxLength === 'number'
        ? opts.maxLength
        : undefined;

    const segmentInlineMatches =
      completionContext.query.trim().length < opts.minQueryLength
        ? []
        : this.matches
            .map((match) =>
              buildNormalCompletion(value, completionContext, match)
            )
            .filter((m): m is InlineCompletion => m !== null);

    const wholeInlineMatches = wholeMatches
      .map((match) =>
        buildNormalCompletion(value, getCompletionContext(value, 0), match)
      )
      .filter((m): m is InlineCompletion => m !== null);

    const nextInlineMatches = activeTrigger
      ? buildTriggerCompletions(value, activeTrigger)
      : wholeInlineMatches.length > 0
        ? wholeInlineMatches
        : segmentInlineMatches;

    const nextAvailableMatches =
      nativeMaxLength === undefined
        ? nextInlineMatches
        : nextInlineMatches.filter(
            (m) => m.finalValue.length <= nativeMaxLength
          );

    this.inlineMatches = nextAvailableMatches;

    if (nextAvailableMatches.length === 0) {
      this.ghostCompletion = null;
      if (
        !activeTrigger &&
        completionContext.queryStart < value.length &&
        /\s$/.test(completionContext.query) &&
        completionContext.query.trim().length >= opts.minQueryLength
      ) {
        this.activeSegmentStart = value.length;
      }
      this.syncHelper(false);
      this.applyOverlay();
      return;
    }

    const safeIndex =
      this.activeMatchIndex >= nextAvailableMatches.length
        ? 0
        : this.activeMatchIndex;
    this.activeMatchIndex = safeIndex;
    this.ghostCompletion = nextAvailableMatches[safeIndex];

    this.syncHelper(true);
    this.applyOverlay();
  }

  // ----- Helper visibility (timer) ----------------------------------------

  private syncHelper(hasGhost: boolean): void {
    const { opts } = this;
    if (this.helperTimer) {
      clearTimeout(this.helperTimer);
      this.helperTimer = null;
    }

    if (!hasGhost || opts.showHelper === false) {
      this.helperVisible = false;
      return;
    }
    if (opts.showHelper === true) {
      this.helperVisible = true;
      return;
    }
    // 'idle': hide while typing, show after helperIdleMs of stillness.
    this.helperVisible = false;
    this.helperTimer = setTimeout(() => {
      this.helperTimer = null;
      this.helperVisible = true;
      this.applyOverlay();
    }, opts.helperIdleMs);
  }

  // ----- Overlay projection ----------------------------------------------

  private touchControlsActive(): boolean {
    return (
      this.opts.touchAccept === true ||
      (this.opts.touchAccept === 'auto' && this.isCoarsePointer)
    );
  }

  private buildOverlayState(): OverlayState {
    const { opts } = this;
    const ghostParts = this.ghostCompletion?.parts ?? null;
    const hasGhost = ghostParts !== null;
    const canCycle =
      opts.enableArrowNavigation && this.inlineMatches.length > 1;
    const tappableWords =
      this.touchControlsActive() &&
      opts.partialAccept &&
      ghostParts?.prefix === '';

    // async loading only gates the ghost when no trigger is active (mirrors
    // `normalAsyncSuggestions && isLoading` in the React effect).
    const asyncGating = !!opts.asyncSuggestions && !this._lastActiveTrigger && this.isLoading;
    const isLoadingState = opts.status === 'loading' || asyncGating;
    const resolvedState: 'idle' | 'success' | 'error' =
      opts.status === 'error' || opts.status === 'success' ? opts.status : 'idle';

    const acceptHintText = this.touchControlsActive()
      ? tappableWords
        ? 'Tap a word to accept it, or tap accept to take the whole hint.'
        : 'Tap accept to take the hint.'
      : opts.acceptOnEnter
        ? 'Tab or Enter accepts the hint.'
        : 'Tab accepts the hint. Enter commits typed text.';

    const liveMessage = isLoadingState
      ? 'Loading suggestions…'
      : hasGhost && this.ghostCompletion
        ? canCycle
          ? `${this.inlineMatches.length} suggestions available. Current: ${this.ghostCompletion.suggestion}. Use Up and Down arrows to cycle. ${acceptHintText}`
          : `Suggestion available: ${this.ghostCompletion.suggestion}. ${acceptHintText}`
        : '';

    // Helper shows when enabled, visible (idle timer elapsed), and a ghost is
    // present. `helperText` is a plain string; when omitted the default
    // keyboard helper renders.
    const showHelperText =
      opts.showHelper !== false && this.helperVisible && hasGhost;

    // aria-describedby merges any external id with the internal helper id.
    const describedBy = joinIds(
      opts.ariaDescribedBy,
      showHelperText ? this.overlay.helperId : undefined
    );
    this.setAria('aria-describedby', describedBy);
    this.setBooleanAria('aria-invalid', resolvedState === 'error');
    this.setBooleanAria('aria-busy', isLoadingState);
    this.setBooleanAria('aria-required', opts.required);
    this.setBooleanAria('aria-readonly', opts.readOnly);

    return {
      surface: this.surface,
      variant: opts.variant,
      size: opts.size,
      theme: opts.theme,
      rootClassName: opts.className,
      resolvedState,
      isLoading: isLoadingState,
      disabled: opts.disabled,
      touchControlsActive: this.touchControlsActive(),
      partialAccept: opts.partialAccept,
      acceptOnEnter: opts.acceptOnEnter,
      canCycleSuggestions: canCycle,
      ghost: this.ghostCompletion,
      showHelperText,
      helperText: opts.helperText ?? null,
      helperClassName: opts.helperClassName,
      touchAcceptLabel: opts.touchAcceptLabel,
      touchAcceptClassName: opts.touchAcceptClassName,
      renderTouchAccept: opts.renderTouchAccept,
      ghostScroll: this.ghostScroll,
      liveMessage,
      accept: () => this.acceptGhost(),
      acceptUpTo: (end: number) => this.acceptGhostUpTo(end),
    };
  }

  private setAria(name: string, value: string | undefined): void {
    if (value) this.editor.setAttribute(name, value);
    else this.editor.removeAttribute(name);
  }

  private setBooleanAria(name: string, active: boolean): void {
    if (active) this.editor.setAttribute(name, 'true');
    else this.editor.removeAttribute(name);
  }

  private applyOverlay(): void {
    if (this.destroyed) return;
    // Refresh the cached active trigger used by the loading-state check.
    this._lastActiveTrigger = findActiveTrigger(
      this.value,
      this.activeSegmentStart,
      this.opts.triggerSuggestions
    );
    this.overlay.update(this.buildOverlayState());
  }
}
