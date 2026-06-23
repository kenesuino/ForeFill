/**
 * Overlay — owns the presentational DOM for the vanilla controller.
 *
 * Builds the `.ff-root > .ff-field` wrapper around an existing editor, plus the
 * ghost-measure span, the ghost overlay (base/prefix/typed/suffix spans, inline
 * helper, tappable ghost words), the touch accept chip, the sr-only helper
 * description, and the polite live region. `update(state)` reconciles it all.
 *
 * No React. The editor element itself (value, caret, aria attrs, form attrs,
 * event wiring) is owned by the controller; the overlay owns presentation.
 */

import { cx } from '../utils/cx';
import type { EditableElement } from './dom';
import { isInput, isTextarea, measureGhostPrefix } from './dom';
import { splitGhostWords, type InlineCompletion } from './engine';
import type {
  ForeFillSize,
  ForeFillSurface,
  ForeFillVariant,
  TouchAcceptRenderProps,
} from './types';

export interface OverlayState {
  surface: ForeFillSurface;
  variant: ForeFillVariant;
  size: ForeFillSize;
  theme?: 'light' | 'dark';
  rootClassName?: string;
  resolvedState: 'idle' | 'success' | 'error';
  isLoading: boolean;
  disabled: boolean;
  touchControlsActive: boolean;
  partialAccept: boolean;
  acceptOnEnter: boolean;
  canCycleSuggestions: boolean;
  ghost: InlineCompletion | null;
  showHelperText: boolean;
  helperText: string | null;
  helperClassName?: string;
  touchAcceptLabel: string;
  touchAcceptClassName?: string;
  renderTouchAccept?: (api: TouchAcceptRenderProps) => HTMLElement;
  ghostScroll: { left: number; top: number };
  liveMessage: string;
  accept: () => void;
  acceptUpTo: (end: number) => void;
}

export class Overlay {
  readonly helperId: string;

  private readonly root: HTMLElement;
  private readonly field: HTMLElement;
  private readonly measure: HTMLSpanElement;
  private readonly ghost: HTMLDivElement;
  private readonly ghostBase: HTMLSpanElement;
  private readonly ghostPrefix: HTMLSpanElement;
  private readonly ghostTyped: HTMLSpanElement;
  private readonly ghostSuffix: HTMLSpanElement;
  private readonly helper: HTMLSpanElement;
  private readonly helperSeparator: HTMLSpanElement;
  private readonly helperContentHost: HTMLSpanElement;
  private readonly helperSrOnly: HTMLSpanElement;
  private readonly liveRegion: HTMLSpanElement;
  private touchAccept: HTMLElement | null = null;

  private lastPrefix = '';
  private lastPrefixOffset = 0;
  private lastTouchSuggestion = '';
  private state: OverlayState | null = null;

  constructor(
    private readonly editor: EditableElement,
    editorClassName: string | undefined
  ) {
    this.helperId =
      'ff-helper-' + Math.random().toString(36).slice(2, 10);

    const doc = editor.ownerDocument;

    this.root = doc.createElement('div');
    this.field = doc.createElement('div');
    this.measure = doc.createElement('span');
    this.ghost = doc.createElement('div');
    this.ghostBase = doc.createElement('span');
    this.ghostPrefix = doc.createElement('span');
    this.ghostTyped = doc.createElement('span');
    this.ghostSuffix = doc.createElement('span');
    this.helper = doc.createElement('span');
    this.helperSeparator = doc.createElement('span');
    this.helperContentHost = doc.createElement('span');
    this.helperSrOnly = doc.createElement('span');
    this.liveRegion = doc.createElement('span');

    // Structure: root > field > [measure, ghost, editor, touchAccept?]
    //            root > [helperSrOnly, liveRegion]
    this.field.appendChild(this.measure);
    this.field.appendChild(this.ghost);
    this.ghost.appendChild(this.ghostBase);
    this.ghost.appendChild(this.ghostPrefix);
    this.ghost.appendChild(this.ghostTyped);
    this.ghost.appendChild(this.ghostSuffix);
    this.ghost.appendChild(this.helper);
    this.helper.appendChild(this.helperSeparator);
    this.helper.appendChild(this.helperContentHost);
    this.root.appendChild(this.field);
    this.root.appendChild(this.helperSrOnly);
    this.root.appendChild(this.liveRegion);

    // Classes + stable attrs.
    this.root.className = 'ff-root';
    this.field.className = 'ff-field';
    this.measure.className = 'ff-ghost-measure';
    this.measure.setAttribute('aria-hidden', 'true');
    this.ghost.className = 'ff-ghost';
    this.ghost.setAttribute('aria-hidden', 'true');
    this.ghostBase.className = 'ff-ghost-base';
    this.ghostPrefix.className = 'ff-ghost-prefix';
    this.ghostTyped.className = 'ff-ghost-typed';
    this.ghostSuffix.className = 'ff-ghost-suffix';
    this.helper.className = 'ff-helper';
    this.helperSeparator.className = 'ff-helper-separator';
    this.helperSeparator.setAttribute('aria-hidden', 'true');
    this.helperSeparator.textContent = '|';
    this.helperSrOnly.id = this.helperId;
    this.helperSrOnly.className = 'ff-sr-only';
    this.liveRegion.className = 'ff-sr-only';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');

    // Move the editor into the field. Preserve its original place by replacing
    // it with the root in its parent.
    const parent = editor.parentNode;
    if (parent) {
      parent.replaceChild(this.root, editor);
    }
    this.field.appendChild(editor);

    this.applyEditorClassName(editorClassName);
    this.ghost.style.display = 'none';
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  applyEditorClassName(editorClassName: string | undefined): void {
    const surface = this.state?.surface ?? this.inferSurface();
    this.editor.className = cx(
      'ff-editor',
      surface === 'input' && 'ff-editor--input',
      surface === 'contenteditable' && 'ff-editor--contenteditable',
      editorClassName
    );
  }

  private inferSurface(): ForeFillSurface {
    if (isInput(this.editor)) return 'input';
    if (isTextarea(this.editor)) return 'textarea';
    return 'contenteditable';
  }

  update(state: OverlayState): void {
    this.state = state;

    // Root class (ff-root + consumer class).
    this.root.className = cx('ff-root', state.rootClassName);

    // Root data attributes.
    const rootAttrs: Array<[string, string | undefined]> = [
      ['data-variant', state.variant],
      ['data-size', state.size],
      ['data-surface', state.surface],
      ['data-state', state.resolvedState],
      ['data-loading', state.isLoading ? 'true' : undefined],
      ['data-disabled', state.disabled ? 'true' : undefined],
      ['data-touch-accept', state.touchControlsActive ? 'true' : undefined],
      ['data-theme', state.theme],
    ];
    for (const [name, value] of rootAttrs) {
      if (value === undefined) this.root.removeAttribute(name);
      else this.root.setAttribute(name, value);
    }

    const ghostParts = state.ghost?.parts ?? null;
    const isComposed = ghostParts?.base !== undefined;
    if (isComposed) this.root.setAttribute('data-ghost-composed', 'true');
    else this.root.removeAttribute('data-ghost-composed');

    // Editor className (surface may have been inferred before state arrived).
    this.applyEditorClassName(undefined);

    // Ghost visibility + content.
    if (!ghostParts) {
      this.ghost.style.display = 'none';
    } else {
      this.ghost.style.display = '';
      this.ghost.toggleAttribute('data-composed', isComposed);
      this.ghostBase.textContent = isComposed ? ghostParts.base! : '';
      this.ghostPrefix.textContent = ghostParts.prefix;
      this.ghostTyped.textContent = ghostParts.typed;
      this.renderSuffix(ghostParts.suffix, state);
    }

    // Ghost scroll transform.
    if (state.ghostScroll.left !== 0 || state.ghostScroll.top !== 0) {
      this.ghost.style.transform = `translate(${-state.ghostScroll.left}px, ${-state.ghostScroll.top}px)`;
    } else {
      this.ghost.style.transform = '';
    }

    // Prefix measure → editor padding-left.
    const prefix = ghostParts?.prefix ?? '';
    if (prefix !== this.lastPrefix) {
      this.lastPrefix = prefix;
      this.measure.textContent = prefix;
      const offset = measureGhostPrefix(this.editor, this.measure, prefix);
      if (Math.abs(offset - this.lastPrefixOffset) >= 1) {
        this.lastPrefixOffset = offset;
      }
    }
    this.applyEditorPadding();

    // Helper.
    if (state.showHelperText && ghostParts) {
      this.helper.style.display = '';
      this.helper.className = cx('ff-helper', state.helperClassName);
      this.renderHelperContent(state);
      this.helperSrOnly.textContent = this.buildHelperDescription(state);
    } else {
      this.helper.style.display = 'none';
      this.helperSrOnly.textContent = '';
    }

    // Touch accept chip.
    this.renderTouchAccept(state, ghostParts);

    // Live region.
    this.liveRegion.textContent = state.liveMessage;
  }

  private applyEditorPadding(): void {
    if (this.lastPrefixOffset > 0) {
      this.editor.style.paddingLeft = `calc(var(--ff-padding-x) + ${this.lastPrefixOffset}px)`;
    } else {
      this.editor.style.paddingLeft = '';
    }
  }

  private renderSuffix(suffix: string, state: OverlayState): void {
    // Clear previous content (tappable words may have added child spans).
    this.ghostSuffix.textContent = '';

    const tappableWords =
      state.touchControlsActive &&
      state.partialAccept &&
      state.ghost?.parts.prefix === '';

    if (!state.touchControlsActive) {
      this.ghostSuffix.textContent = suffix;
      return;
    }

    if (tappableWords) {
      const words = splitGhostWords(suffix);
      for (const word of words) {
        const span = this.ghostSuffix.ownerDocument.createElement('span');
        span.className = 'ff-ghost-word';
        span.textContent = word.text;
        span.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.acceptUpTo(word.end);
        });
        span.addEventListener('mousedown', (e) => e.preventDefault());
        span.addEventListener('click', (e) => e.preventDefault());
        this.ghostSuffix.appendChild(span);
      }
      if (words.length === 0) this.ghostSuffix.textContent = suffix;
      return;
    }

    // Touch active but not tappable: a single full-accept word span.
    const span = this.ghostSuffix.ownerDocument.createElement('span');
    span.className = 'ff-ghost-word';
    span.textContent = suffix;
    span.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.accept();
    });
    span.addEventListener('mousedown', (e) => e.preventDefault());
    span.addEventListener('click', (e) => e.preventDefault());
    this.ghostSuffix.appendChild(span);
  }

  private renderHelperContent(state: OverlayState): void {
    const host = this.helperContentHost;
    host.textContent = '';

    if (state.helperText != null) {
      host.textContent = state.helperText;
      return;
    }

    if (state.touchControlsActive) {
      const tappable =
        state.partialAccept && state.ghost?.parts.prefix === '';
      host.textContent = tappable
        ? 'Tap a word or accept to take the hint.'
        : 'Tap to accept.';
      return;
    }

    const doc = host.ownerDocument;
    const kbd = (label: string) => {
      const el = doc.createElement('kbd');
      el.className = 'ff-key';
      el.textContent = label;
      return el;
    };
    const txt = (s: string) => {
      const el = doc.createElement('span');
      el.textContent = s;
      return el;
    };

    if (state.canCycleSuggestions) {
      host.appendChild(kbd('Up'));
      host.appendChild(txt('or'));
      host.appendChild(kbd('Down'));
      host.appendChild(txt('changes hint.'));
    }
    host.appendChild(kbd('Tab'));
    if (state.acceptOnEnter) {
      host.appendChild(txt('or'));
      host.appendChild(kbd('Enter'));
      host.appendChild(txt('accepts the hint.'));
    } else {
      host.appendChild(txt('accepts the hint.'));
      host.appendChild(kbd('Enter'));
      host.appendChild(txt('commits typed text.'));
    }
    host.appendChild(kbd('Esc'));
    host.appendChild(txt('hides it.'));
  }

  private buildHelperDescription(state: OverlayState): string {
    const acceptHintText = state.touchControlsActive
      ? state.partialAccept && state.ghost?.parts.prefix === ''
        ? 'Tap a word to accept it, or tap accept to take the whole hint.'
        : 'Tap accept to take the hint.'
      : state.acceptOnEnter
        ? 'Tab or Enter accepts the hint.'
        : 'Tab accepts the hint. Enter commits typed text.';
    return state.canCycleSuggestions
      ? `Arrow up or arrow down changes the hint. ${acceptHintText} Esc hides it.`
      : `${acceptHintText} Esc hides it.`;
  }

  private renderTouchAccept(
    state: OverlayState,
    ghostParts: InlineCompletion['parts'] | null
  ): void {
    const shouldShow = !!ghostParts && state.touchControlsActive;
    if (!shouldShow) {
      if (this.touchAccept) {
        this.touchAccept.remove();
        this.touchAccept = null;
        this.lastTouchSuggestion = '';
      }
      return;
    }

    const suggestion = state.ghost?.suggestion ?? '';

    if (state.renderTouchAccept) {
      // Rebuild the custom node only when the suggestion changes, to avoid
      // stealing focus on every keystroke.
      if (this.touchAccept && this.lastTouchSuggestion === suggestion) return;
      if (this.touchAccept) this.touchAccept.remove();
      const api: TouchAcceptRenderProps = {
        accept: state.accept,
        suggestion,
        label: state.touchAcceptLabel,
      };
      const node = state.renderTouchAccept(api);
      this.touchAccept = node;
      this.lastTouchSuggestion = suggestion;
      this.field.appendChild(node);
      return;
    }

    // Default chip: rebuild only when it doesn't exist yet.
    if (this.touchAccept && this.lastTouchSuggestion === suggestion) {
      // keep; the label/suggestion don't appear inside the default chip body
      // (only the ↵ glyph), so nothing to update.
      return;
    }
    if (this.touchAccept) this.touchAccept.remove();
    const doc = this.field.ownerDocument;
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.tabIndex = -1;
    btn.className = cx('ff-touch-accept', state.touchAcceptClassName);
    btn.setAttribute('aria-label', state.touchAcceptLabel);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.accept();
    });
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => e.preventDefault());
    const glyph = doc.createElement('span');
    glyph.className = 'ff-touch-accept-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = '↵';
    btn.appendChild(glyph);

    // For input surfaces the chip is vertically centered via CSS; nothing
    // extra needed here.
    this.touchAccept = btn;
    this.lastTouchSuggestion = suggestion;
    this.field.appendChild(btn);
  }

  destroy(): void {
    // Restore the editor to its original place (where the root now sits).
    const parent = this.root.parentNode;
    if (parent) {
      parent.replaceChild(this.editor, this.root);
    }
    this.editor.className = '';
    this.editor.style.paddingLeft = '';
    this.touchAccept = null;
  }
}
