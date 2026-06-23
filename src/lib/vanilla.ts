/**
 * ForeFill — framework-agnostic entry point.
 *
 * `attachForeFill` enhances an existing `<textarea>`, `<input>`, or
 * `[contenteditable]` element with inline ghost-text autocomplete. The surface
 * is inferred from the element. `createForeFill` builds the editor element too.
 *
 * No React import anywhere in this graph — safe to bundle for non-React apps.
 *
 *   import { attachForeFill } from 'forefill/vanilla';
 *   import 'forefill/styles.css';
 *
 *   const ff = attachForeFill(document.querySelector('#reply'), {
 *     suggestions: ['Thanks so much for reaching out!'],
 *     onCommit: (v) => save(v),
 *   });
 *   ff.focus();
 *   ff.destroy();
 */

import { ForeFillController } from './core/controller';
import type {
  ForeFillVanillaOptions,
  ForeFillInstance,
  ForeFillSurface,
} from './core/types';

export type {
  ForeFillVanillaOptions,
  ForeFillInstance,
  ForeFillTriggerSuggestion,
  ForeFillSurface,
  ForeFillVariant,
  ForeFillSize,
  ForeFillMatchMode,
  HelperVisibility,
  ForeFillStatus,
  TouchAcceptRenderProps,
  AsyncSuggestionFetcher,
} from './core/types';
export { filterMatches } from './utils/filterMatches';
export type { MatchMode } from './utils/filterMatches';
export { cx } from './utils/cx';
export type { ClassValue } from './utils/cx';

/** Options for {@link createForeFill}; adds the surface selector to the base options. */
export interface CreateForeFillOptions extends ForeFillVanillaOptions {
  /** Which editable surface to build. Default 'textarea'. */
  as?: ForeFillSurface;
}

export function attachForeFill(
  editor: HTMLTextAreaElement | HTMLInputElement | HTMLDivElement,
  options: ForeFillVanillaOptions = {}
): ForeFillInstance {
  return new ForeFillController(editor, options);
}

export function createForeFill(
  container: HTMLElement,
  options: CreateForeFillOptions = {}
): ForeFillInstance {
  const surface = options.as ?? 'textarea';
  const doc = container.ownerDocument;
  let editor: HTMLTextAreaElement | HTMLInputElement | HTMLDivElement;

  if (surface === 'input') {
    const input = doc.createElement('input');
    input.type = options.inputType ?? 'text';
    editor = input;
  } else if (surface === 'contenteditable') {
    const div = doc.createElement('div');
    div.contentEditable = 'true';
    div.setAttribute('role', 'textbox');
    editor = div;
  } else {
    const textarea = doc.createElement('textarea');
    textarea.rows = options.rows ?? 3;
    editor = textarea;
  }

  container.appendChild(editor);
  return attachForeFill(editor, options);
}
