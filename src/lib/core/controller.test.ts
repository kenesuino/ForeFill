import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachForeFill, createForeFill } from '../vanilla';

const REPLIES = [
  'Thanks so much for reaching out!',
  'Thanks for the quick turnaround.',
  'Happy to help — let me take a look.',
  'Hope you have a great rest of your week!',
  'Let me know if you have any questions.',
];

function ghostEl(): HTMLDivElement | null {
  return document.querySelector('.ff-ghost');
}
function ghostVisible(): boolean {
  const el = ghostEl();
  return !!el && el.style.display !== 'none';
}
function ghostSuffix(): string | null {
  return document.querySelector('.ff-ghost-suffix')?.textContent ?? null;
}
function ghostPrefix(): string | null {
  return document.querySelector('.ff-ghost-prefix')?.textContent ?? null;
}

function focus(el: HTMLElement): void {
  el.focus();
  el.dispatchEvent(new FocusEvent('focus'));
}

/** Type into a textarea/input, moving the caret to the end (jsdom doesn't). */
function type(el: HTMLTextAreaElement | HTMLInputElement, text: string): void {
  for (const ch of text) {
    el.value += ch;
    const end = el.value.length;
    el.setSelectionRange(end, end);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('select', { bubbles: true }));
  }
}

function keydown(
  el: HTMLElement,
  key: string,
  opts: KeyboardEventInit = {}
): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('attachForeFill — wrapping & structure', () => {
  it('wraps an existing textarea in .ff-root/.ff-field and infers the surface', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    expect(ta.closest('.ff-root')).not.toBeNull();
    expect(document.querySelector('.ff-root[data-surface="textarea"]')).not.toBeNull();
    expect(ta.classList.contains('ff-editor')).toBe(true);
    ff.destroy();
    // destroy restores the editor outside the wrapper.
    expect(ta.closest('.ff-root')).toBeNull();
    expect(ta.parentElement).toBe(document.body);
  });

  it('createForeFill builds a textarea into a container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ff = createForeFill(container, { suggestions: REPLIES, as: 'textarea' });
    expect(container.querySelector('textarea')).not.toBeNull();
    expect(document.querySelector('.ff-root[data-surface="textarea"]')).not.toBeNull();
    ff.destroy();
  });

  it('createForeFill builds an input when as="input"', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ff = createForeFill(container, { suggestions: REPLIES, as: 'input' });
    expect(document.querySelector('.ff-root[data-surface="input"]')).not.toBeNull();
    expect(container.querySelector('input')).not.toBeNull();
    ff.destroy();
  });
});

describe('attachForeFill — inline ghost', () => {
  it('shows the ghost suffix for the best start-anchored match', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(true);
    expect(ghostSuffix()).toBe(' so much for reaching out!');
    ff.destroy();
  });

  it('repositions a mid-sentence (substring) match around the typed text', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    focus(ta);
    type(ta, 'week');
    expect(ghostPrefix()).toBe('Hope you have a great rest of your ');
    expect(ghostSuffix()).toBe('!');
    ff.destroy();
  });

  it('respects minQueryLength before activating', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES, minQueryLength: 3 });
    focus(ta);
    type(ta, 'Th');
    expect(ghostVisible()).toBe(false);
    type(ta, 'a');
    expect(ghostVisible()).toBe(true);
    ff.destroy();
  });

  it('suppresses the ghost when disableInlineFill is set', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES, disableInlineFill: true });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(false);
    ff.destroy();
  });

  it('suppresses the ghost when the caret is not at the end', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const ff = attachForeFill(input, { suggestions: REPLIES });
    focus(input);
    type(input, 'Thanks');
    expect(ghostVisible()).toBe(true);
    input.setSelectionRange(0, 0);
    input.dispatchEvent(new Event('select', { bubbles: true }));
    expect(ghostVisible()).toBe(false);
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('select', { bubbles: true }));
    expect(ghostVisible()).toBe(true);
    ff.destroy();
  });

  it('only renders the ghost while focused', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(true);
    ta.dispatchEvent(new FocusEvent('blur'));
    expect(ghostVisible()).toBe(false);
    ff.destroy();
  });
});

describe('attachForeFill — accept & commit', () => {
  it('accepts the ghost with Tab and commits the merged value', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const onAccept = vi.fn();
    const onCommit = vi.fn();
    const ff = attachForeFill(ta, {
      suggestions: REPLIES,
      onAccept,
      onCommit,
    });
    focus(ta);
    type(ta, 'Thanks');
    keydown(ta, 'Tab');
    expect(ta.value).toBe('Thanks so much for reaching out!');
    expect(onAccept).toHaveBeenCalledWith(
      'Thanks so much for reaching out!',
      'Thanks so much for reaching out!'
    );
    expect(onCommit).toHaveBeenCalledWith('Thanks so much for reaching out!');
    ff.destroy();
  });

  it('accepts the ghost with Enter by default', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    focus(ta);
    type(ta, 'Thanks');
    keydown(ta, 'Enter');
    expect(ta.value).toBe('Thanks so much for reaching out!');
    ff.destroy();
  });

  it('acceptOnEnter=false: Enter commits typed text, Tab still accepts', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const onCommit = vi.fn();
    const ff = attachForeFill(ta, {
      suggestions: REPLIES,
      acceptOnEnter: false,
      onCommit,
    });
    focus(ta);
    type(ta, 'Thanks');
    keydown(ta, 'Enter');
    expect(ta.value).toBe('Thanks'); // not accepted
    expect(onCommit).toHaveBeenCalledWith('Thanks');
    keydown(ta, 'Tab');
    expect(ta.value).toBe('Thanks so much for reaching out!');
    ff.destroy();
  });

  it('Escape dismisses the hint and fires onDismiss', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const onDismiss = vi.fn();
    const ff = attachForeFill(ta, { suggestions: REPLIES, onDismiss });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(true);
    keydown(ta, 'Escape');
    expect(ghostVisible()).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Typing again re-enables the hint (dismissal is per-value).
    type(ta, '!');
    ff.destroy();
  });

  it('word-by-word accept with Ctrl+ArrowRight pulls in the next word', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    focus(ta);
    type(ta, 'Thanks');
    keydown(ta, 'ArrowRight', { ctrlKey: true });
    expect(ta.value).toBe('Thanks so'); // first word: " so"
    // Ghost still visible for the remainder.
    expect(ghostVisible()).toBe(true);
    ff.destroy();
  });

  it('ArrowDown / ArrowUp cycle through matching hints', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, {
      suggestions: REPLIES,
      enableArrowNavigation: true,
    });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostSuffix()).toBe(' so much for reaching out!');
    keydown(ta, 'ArrowDown');
    expect(ghostSuffix()).toBe(' for the quick turnaround.');
    keydown(ta, 'ArrowUp');
    expect(ghostSuffix()).toBe(' so much for reaching out!');
    ff.destroy();
  });

  it('commitOnBlur fires onCommit when focus leaves', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const onCommit = vi.fn();
    const ff = attachForeFill(ta, { suggestions: REPLIES, commitOnBlur: true, onCommit });
    focus(ta);
    type(ta, 'Thanks');
    ta.dispatchEvent(new FocusEvent('blur'));
    expect(onCommit).toHaveBeenCalledWith('Thanks');
    ff.destroy();
  });
});

describe('attachForeFill — trigger suggestions', () => {
  it('completes an @-triggered email domain', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const ff = attachForeFill(input, {
      triggerSuggestions: [
        { trigger: '@', suggestions: ['gmail.com', 'outlook.com'] },
      ],
    });
    focus(input);
    type(input, 'john@g');
    expect(ghostVisible()).toBe(true);
    expect(ghostSuffix()).toBe('mail.com');
    keydown(input, 'Tab');
    expect(input.value).toBe('john@gmail.com');
    ff.destroy();
  });
});

describe('attachForeFill — async suggestions', () => {
  it('shows a loading state then the ghost when async resolves', async () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, {
      asyncSuggestions: async (q) => [`${q} completion`],
      debounceMs: 0,
    });
    focus(ta);
    type(ta, 'Hel');
    // Sync loading gate hides the ghost immediately.
    await vi.waitFor(() => expect(ghostVisible()).toBe(true));
    expect(ghostSuffix()).toBe(' completion');
    ff.destroy();
  });

  it('aborts a stale request when the query changes mid-flight', async () => {
    const signals: AbortSignal[] = [];
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, {
      asyncSuggestions: (_q, ctx) =>
        new Promise<string[]>((resolve) => {
          if (ctx) signals.push(ctx.signal);
          // never resolves on its own
          setTimeout(resolve, 5000);
        }),
      debounceMs: 0,
    });
    focus(ta);
    ff.setValue('first');
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0].aborted).toBe(false);
    ff.setValue('firstsecond');
    await vi.waitFor(() => expect(signals[0].aborted).toBe(true));
    ff.destroy();
  });
});

describe('attachForeFill — maxLength', () => {
  it('suppresses a completion that would exceed maxLength', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, {
      suggestions: REPLIES,
      maxLength: 8, // "Thanks so much for reaching out!" is way longer
    });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(false);
    ff.destroy();
  });
});

describe('attachForeFill — imperative API', () => {
  it('setValue writes the value and reconciles', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const onChange = vi.fn();
    const ff = attachForeFill(ta, { suggestions: REPLIES, onChange });
    ff.setValue('Thanks');
    expect(ta.value).toBe('Thanks');
    expect(onChange).toHaveBeenCalledWith('Thanks');
    ff.destroy();
  });

  it('getValue reads the editor', () => {
    const ta = document.createElement('textarea');
    ta.value = 'preset';
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    expect(ff.getValue()).toBe('preset');
    ff.destroy();
  });

  it('focus/blur/select delegate to the editor', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: REPLIES });
    ff.focus();
    expect(document.activeElement).toBe(ta);
    ff.select();
    expect(ta.selectionStart).toBe(0);
    expect(ta.selectionEnd).toBe(0); // empty value
    ff.blur();
    expect(document.activeElement).not.toBe(ta);
    ff.destroy();
  });

  it('setOptions updates suggestions live', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    const ff = attachForeFill(ta, { suggestions: [] });
    focus(ta);
    type(ta, 'Thanks');
    expect(ghostVisible()).toBe(false);
    ff.setOptions({ suggestions: REPLIES });
    expect(ghostVisible()).toBe(true);
    ff.destroy();
  });
});
