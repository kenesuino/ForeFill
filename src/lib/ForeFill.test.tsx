import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type FormEvent } from 'react';
import { ForeFill } from './ForeFill';

const REPLIES = [
  'Thanks so much for reaching out!',
  'Thanks for the quick turnaround.',
  'Happy to help — let me take a look.',
  'Hope you have a great rest of your week!',
];

function ghostSuffix(): string | null {
  return document.querySelector('.ff-ghost-suffix')?.textContent ?? null;
}
function ghostPrefix(): string | null {
  return document.querySelector('.ff-ghost-prefix')?.textContent ?? null;
}

describe('ForeFill — rendering', () => {
  it('renders a textarea by default with the placeholder as the aria-label', () => {
    render(<ForeFill suggestions={REPLIES} placeholder="Write a reply…" />);
    const field = screen.getByRole('textbox', { name: 'Write a reply…' });
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('renders a single-line input when as="input"', () => {
    render(<ForeFill as="input" suggestions={REPLIES} placeholder="Search" />);
    expect(screen.getByRole('textbox').tagName).toBe('INPUT');
  });

  it('treats as="textbox" as an alias for input', () => {
    render(<ForeFill as="textbox" suggestions={REPLIES} placeholder="Search" />);
    expect(screen.getByRole('textbox').tagName).toBe('INPUT');
  });
});

describe('ForeFill — inline ghost', () => {
  it('shows the ghost suffix for the best match while typing', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} placeholder="Reply" />);
    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Thanks');

    await waitFor(() => expect(ghostSuffix()).toBe(' so much for reaching out!'));
  });

  it('repositions a mid-sentence (substring) match around the typed text', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} placeholder="Reply" />);
    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'week');

    await waitFor(() =>
      expect(ghostPrefix()).toBe('Hope you have a great rest of your ')
    );
    expect(ghostSuffix()).toBe('!');
  });

  it('shows no ghost when disableInlineFill is set', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} disableInlineFill placeholder="Reply" />);
    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Thanks');

    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector('.ff-ghost')).toBeNull();
  });

  it('suppresses the ghost when the caret is not at the end of the value', async () => {
    const user = userEvent.setup();
    render(<ForeFill as="input" suggestions={REPLIES} placeholder="Reply" />);
    const field = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(field);
    await user.type(field, 'Thanks');
    await waitFor(() => expect(document.querySelector('.ff-ghost')).not.toBeNull());

    // Move the caret to the start — the hint would otherwise render mid-text.
    field.setSelectionRange(0, 0);
    fireEvent.select(field);
    await waitFor(() => expect(document.querySelector('.ff-ghost')).toBeNull());

    // Returning the caret to the end brings the hint back.
    field.setSelectionRange(field.value.length, field.value.length);
    fireEvent.select(field);
    await waitFor(() => expect(document.querySelector('.ff-ghost')).not.toBeNull());
  });

  it('respects minQueryLength before activating', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} minQueryLength={3} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);

    await user.type(field, 'Th');
    expect(document.querySelector('.ff-ghost')).toBeNull();

    await user.type(field, 'a');
    await waitFor(() => expect(document.querySelector('.ff-ghost')).not.toBeNull());
  });
});

describe('ForeFill — accept & commit', () => {
  it('accepts the ghost with Tab and commits the merged value', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ForeFill suggestions={REPLIES} onCommit={onCommit} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('Thanks so much for reaching out!');
  });

  it('accepts the ghost with Enter', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ForeFill suggestions={REPLIES} onCommit={onCommit} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Happy to help — let me take a look.');
  });

  it('commits the typed value with Enter when there is no ghost', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ForeFill suggestions={REPLIES} onCommit={onCommit} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'zzz');

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('zzz');
  });

  it('does not commit on Shift+Enter (newline)', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ForeFill suggestions={REPLIES} onCommit={onCommit} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');

    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('preserves the user’s typed casing on accept', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ForeFill suggestions={REPLIES} onCommit={onCommit} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'thanks so');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('thanks so much for reaching out!');
  });
});

describe('ForeFill — dismiss & navigation', () => {
  it('hides the ghost on Escape and keeps the typed text', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');
    await waitFor(() => expect(document.querySelector('.ff-ghost')).not.toBeNull());

    fireEvent.keyDown(field, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.ff-ghost')).toBeNull());
    expect((field as HTMLTextAreaElement).value).toBe('Thanks');
  });

  it('cycles matching hints with ArrowDown', async () => {
    const user = userEvent.setup();
    render(<ForeFill suggestions={REPLIES} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');
    await waitFor(() => expect(ghostSuffix()).toBe(' so much for reaching out!'));

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    await waitFor(() => expect(ghostSuffix()).toBe(' for the quick turnaround.'));
  });
});

describe('ForeFill — form integration', () => {
  it('forwards name, id, required, and maxLength to the input', () => {
    render(
      <ForeFill
        as="input"
        suggestions={REPLIES}
        placeholder="Reply"
        name="reply"
        id="reply-field"
        required
        maxLength={120}
      />
    );
    const field = screen.getByRole('textbox') as HTMLInputElement;
    expect(field).toHaveAttribute('name', 'reply');
    expect(field).toHaveAttribute('id', 'reply-field');
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('maxLength', '120');
  });

  it('submits its value as part of a native form', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit} data-testid="f">
        <ForeFill as="input" suggestions={REPLIES} name="reply" placeholder="Reply" />
        <button type="submit">Send</button>
      </form>
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'Hello');

    const form = screen.getByTestId('f') as HTMLFormElement;
    expect(new FormData(form).get('reply')).toBe('Hello');
  });

  it('renders read-only and suppresses the ghost', async () => {
    const user = userEvent.setup();
    render(<ForeFill as="input" suggestions={REPLIES} readOnly placeholder="Reply" />);
    const field = screen.getByRole('textbox') as HTMLInputElement;
    expect(field).toHaveAttribute('readonly');
    await user.click(field);
    // readOnly inputs can't be typed into; even forcing focus shows no ghost.
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector('.ff-ghost')).toBeNull();
  });
});

describe('ForeFill — accept/dismiss callbacks & behavior', () => {
  it('fires onAccept with the value and suggestion when a hint is taken', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onCommit = vi.fn();
    render(
      <ForeFill
        suggestions={REPLIES}
        onAccept={onAccept}
        onCommit={onCommit}
        placeholder="Reply"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onAccept).toHaveBeenCalledWith(
      'Happy to help — let me take a look.',
      'Happy to help — let me take a look.'
    );
    expect(onCommit).toHaveBeenCalledWith('Happy to help — let me take a look.');
  });

  it('does not fire onAccept when the user commits their own text', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<ForeFill suggestions={REPLIES} onAccept={onAccept} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'zzz');
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('fires onDismiss only when a visible hint is escaped', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ForeFill suggestions={REPLIES} onDismiss={onDismiss} placeholder="Reply" />);
    const field = screen.getByRole('textbox');
    await user.click(field);

    // No hint yet → Escape does nothing.
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();

    await user.type(field, 'Thanks');
    await waitFor(() => expect(document.querySelector('.ff-ghost')).not.toBeNull());
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not accept the hint on Enter when acceptOnEnter is false', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <ForeFill
        suggestions={REPLIES}
        acceptOnEnter={false}
        onCommit={onCommit}
        placeholder="Reply"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    // Enter commits the typed text, not the hint…
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Happy');

    // …but Tab still accepts the hint.
    onCommit.mockClear();
    await user.clear(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());
    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('Happy to help — let me take a look.');
  });

  it('commits the current value on blur when commitOnBlur is set', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <ForeFill suggestions={REPLIES} commitOnBlur onCommit={onCommit} placeholder="Reply" />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'zzz');
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith('zzz');
  });
});

describe('ForeFill — word-by-word accept', () => {
  it('pulls in one word of the hint per Ctrl+ArrowRight', async () => {
    const user = userEvent.setup();
    render(<ForeFill as="input" suggestions={REPLIES} placeholder="Reply" />);
    const field = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).toBe(' to help — let me take a look.'));

    fireEvent.keyDown(field, { key: 'ArrowRight', ctrlKey: true });
    await waitFor(() => expect(field.value).toBe('Happy to'));
    // The remaining hint continues from the new value.
    await waitFor(() => expect(ghostSuffix()).toBe(' help — let me take a look.'));

    fireEvent.keyDown(field, { key: 'ArrowRight', ctrlKey: true });
    await waitFor(() => expect(field.value).toBe('Happy to help'));
  });

  it('does not partial-accept when partialAccept is disabled', async () => {
    const user = userEvent.setup();
    render(
      <ForeFill as="input" suggestions={REPLIES} partialAccept={false} placeholder="Reply" />
    );
    const field = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).not.toBeNull());

    fireEvent.keyDown(field, { key: 'ArrowRight', ctrlKey: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(field.value).toBe('Happy');
  });
});

describe('ForeFill — trigger suggestions', () => {
  it('shows a configured domain immediately after @', async () => {
    const user = userEvent.setup();
    render(
      <ForeFill
        as="input"
        triggerSuggestions={[
          { trigger: '@', suggestions: ['gmail.com', 'yahoo.com'] },
        ]}
        placeholder="Email"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    fireEvent.change(field, { target: { value: '@' } });

    await waitFor(() => expect(ghostSuffix()).toBe('gmail.com'));
  });

  it('accepts an email-style trigger completion inside existing typed text', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <ForeFill
        as="input"
        triggerSuggestions={[
          { trigger: '@', suggestions: ['gmail.com', 'yahoo.com'] },
        ]}
        onCommit={onCommit}
        placeholder="Email"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    fireEvent.change(field, { target: { value: 'john@g' } });
    await waitFor(() => expect(ghostSuffix()).toBe('mail.com'));

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('john@gmail.com');
  });

  it('supports custom symbol triggers', async () => {
    const user = userEvent.setup();
    render(
      <ForeFill
        as="input"
        triggerSuggestions={[{ trigger: '$', suggestions: ['total', 'tax'] }]}
        placeholder="Formula"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    fireEvent.change(field, { target: { value: '$t' } });

    await waitFor(() => expect(ghostSuffix()).toBe('otal'));
  });

  it('supports custom word triggers and preserves leading spaces', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <ForeFill
        as="input"
        triggerSuggestions={[
          { trigger: 'Happy', suggestions: [' Birthday!'] },
        ]}
        onCommit={onCommit}
        placeholder="Greeting"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Happy');
    await waitFor(() => expect(ghostSuffix()).toBe(' Birthday!'));

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('Happy Birthday!');
  });

  it('matches word triggers case-insensitively by default', async () => {
    const user = userEvent.setup();
    render(
      <ForeFill
        as="input"
        triggerSuggestions={[
          { trigger: 'Happy', suggestions: [' Birthday!'] },
        ]}
        placeholder="Greeting"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'HAPPY');

    await waitFor(() => expect(ghostSuffix()).toBe(' Birthday!'));
  });

  it('lets active trigger suggestions override normal suggestions', async () => {
    const user = userEvent.setup();
    render(
      <ForeFill
        as="input"
        suggestions={['@greeting']}
        triggerSuggestions={[{ trigger: '@', suggestions: ['gmail.com'] }]}
        placeholder="Email"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    fireEvent.change(field, { target: { value: '@' } });

    await waitFor(() => expect(ghostSuffix()).toBe('gmail.com'));
  });
});

describe('ForeFill — existing text completion', () => {
  it('autosuggests appended text when the field already has a value', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <ForeFill
        as="input"
        defaultValue="Happy to help - let me take a look. "
        suggestions={['Thanks so much for reaching out!']}
        onCommit={onCommit}
        placeholder="Reply"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');
    await waitFor(() => expect(ghostSuffix()).toBe(' so much for reaching out!'));

    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith(
      'Happy to help - let me take a look. Thanks so much for reaching out!'
    );
  });

  it('passes only the appended active query to async suggestions', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async (q: string) => [
      `${q} so much for reaching out!`,
    ]);
    render(
      <ForeFill
        as="input"
        defaultValue="Existing text. "
        asyncSuggestions={fetcher}
        placeholder="Reply"
      />
    );
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.type(field, 'Thanks');

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('Thanks'));
    expect(fetcher).not.toHaveBeenCalledWith('Existing text. Thanks');
  });
});

describe('ForeFill — controlled mode', () => {
  it('reflects external value changes and reports onChange', async () => {
    function Controlled() {
      const [value, setValue] = useState('');
      return (
        <ForeFill
          value={value}
          onChange={setValue}
          suggestions={REPLIES}
          placeholder="Reply"
        />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const field = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(field, 'Happy');
    expect(field.value).toBe('Happy');
  });
});
