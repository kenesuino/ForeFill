/**
 * Pure DOM helpers for the vanilla controller — caret/selection, editable-text
 * accessors, and the ghost-prefix width measurement. No React.
 */

export type EditableElement =
  | HTMLTextAreaElement
  | HTMLInputElement
  | HTMLDivElement;

export function isInput(
  node: EditableElement
): node is HTMLInputElement {
  return node instanceof HTMLInputElement;
}

export function isTextarea(
  node: EditableElement
): node is HTMLTextAreaElement {
  return node instanceof HTMLTextAreaElement;
}

export function isContentEditable(
  node: EditableElement
): node is HTMLDivElement {
  return (
    node instanceof HTMLDivElement && node.isContentEditable
  );
}

export function getEditableText(node: EditableElement): string {
  if (isInput(node) || isTextarea(node)) {
    return node.value;
  }
  return node.textContent ?? '';
}

export function setEditableText(node: EditableElement, nextValue: string): void {
  if (isInput(node) || isTextarea(node)) {
    node.value = nextValue;
    return;
  }
  if (node.textContent !== nextValue) {
    node.textContent = nextValue;
  }
}

export function moveCaretToEnd(node: EditableElement): void {
  if (isInput(node) || isTextarea(node)) {
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

export function selectEditableText(node: EditableElement): void {
  if (isInput(node) || isTextarea(node)) {
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

/**
 * Whether the caret sits collapsed at the very end of the editable content.
 * The inline ghost is only meaningful when the user is appending; typing in the
 * middle would render the hint at the wrong place. When the caret position
 * can't be read (e.g. number/email inputs), we don't suppress.
 */
export function isCaretAtEnd(node: EditableElement): boolean {
  if (isInput(node) || isTextarea(node)) {
    const { selectionStart, selectionEnd, value } = node;
    if (
      typeof selectionStart !== 'number' ||
      typeof selectionEnd !== 'number'
    ) {
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
  return range.compareBoundaryPoints(Range.START_TO_START, end) === 0;
}

/**
 * Measure the rendered width of `text` using the editor's font metrics so the
 * typed text can be shifted over the ghost prefix. Returns 0 when there is no
 * prefix to measure.
 */
export function measureGhostPrefix(
  editor: EditableElement,
  measureSpan: HTMLElement,
  text: string
): number {
  if (!text) return 0;

  const editorStyle = window.getComputedStyle(editor);
  measureSpan.style.font = editorStyle.font;
  measureSpan.style.letterSpacing = editorStyle.letterSpacing;
  measureSpan.style.wordSpacing = editorStyle.wordSpacing;
  measureSpan.style.textTransform = editorStyle.textTransform;

  return Math.ceil(measureSpan.getBoundingClientRect().width);
}

export function detectCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
