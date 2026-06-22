<p align="center">
  <strong>ForeFill</strong>
</p>

<p align="center">
  Inline ghost-text autocomplete for React textareas, inputs, and contenteditable surfaces.
</p>

<p align="center">
  <img alt="React peer dependency" src="https://img.shields.io/badge/react-%3E%3D18%20%3C20-61dafb">
  <img alt="TypeScript types included" src="https://img.shields.io/badge/types-included-3178c6">
  <img alt="No UI dependency" src="https://img.shields.io/badge/UI%20deps-none-16a34a">
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827">
</p>

---

## Overview

**ForeFill** (`forefill`) is a small React component that shows a ghost suggestion directly inside a textarea, input, or contenteditable surface — the user keeps typing and the rest fills in ahead of the caret.

It is designed for forms where users should keep typing naturally, then accept a suggestion with `Tab` or `Enter`.

| Capability | Included |
| --- | --- |
| Inline ghost hint | Yes |
| Textarea, input, and contenteditable surfaces | Yes |
| Prefix matching | Yes |
| Substring matching | Yes |
| Custom trigger suggestions | Yes |
| Existing-value completion | Yes |
| Smooth typed-text repositioning | Yes |
| Arrow-key cycling through matching hints | Yes |
| Preserves typed casing on accept | Yes |
| Async suggestion source | Yes |
| Validation, loading & status states | Yes |
| CSS variable theming | Yes |
| Automatic dark mode | Yes |
| Live-region screen-reader support | Yes |
| Third-party UI components | No |

## Install

```bash
npm install forefill
```

Import the component and stylesheet:

```tsx
import { ForeFill } from 'forefill';
import 'forefill/styles.css';
```

## Quick Start

```tsx
import { ForeFill } from 'forefill';
import 'forefill/styles.css';

const replies = [
  'Thanks so much for reaching out!',
  'Happy to help — let me take a look.',
  'Let me know if you have any questions.',
  'Looking forward to hearing from you.',
];

export function ReplyBox() {
  return (
    <ForeFill
      as="textarea"
      suggestions={replies}
      placeholder="Write a reply…"
      onCommit={(value) => console.log(value)}
    />
  );
}
```

That is enough for a working uncontrolled field. Add `value` and `onChange`
when you want a controlled React form field.

## How It Behaves

| Situation | Behavior |
| --- | --- |
| User types at the end of the value | ForeFill finds the best matching suggestion and renders the unmatched text as an inline ghost. |
| User types in the middle or selects text | The ghost is suppressed so the overlay does not appear in the wrong position. |
| Multiple suggestions match | `ArrowDown` and `ArrowUp` cycle through inline candidates when `enableArrowNavigation` is enabled. |
| `Tab` is pressed with a visible hint | The hint is accepted and `onAccept` then `onCommit` can fire. |
| `Enter` is pressed with a visible hint | Accepts the hint by default; set `acceptOnEnter={false}` when Enter should commit typed text only. |
| `Escape` is pressed with a visible hint | The hint is dismissed and stays hidden until the value changes. |
| A trigger suggestion is active | Trigger completions take precedence over normal static or async suggestions. |
| `asyncSuggestions` is loading | The ghost is hidden and the loading bar/`aria-busy` state is shown. |
| Accepted value would exceed `maxLength` | The completion is suppressed for native input and textarea surfaces. |

If the user types:

```txt
week
```

and the best suggestion is:

```txt
Hope you have a great rest of your week!
```

the component keeps `Hope you have a great rest of your ` visible, shifts the typed `week` into the matching position, and shows the trailing `!` as ghost text.

If more than one suggestion matches, press `ArrowDown` or `ArrowUp` to preview the next matching hint inline.

If the user types:

```txt
Thanks
```

and accepts:

```txt
Thanks so much for reaching out!
```

The accepted value preserves the user's typed casing. It does not force `Thanks` back to a differently-cased suggestion.

If the field already has a value, ForeFill still suggests against the newly
typed segment. For example, a field that starts with:

```txt
Happy to help - let me take a look.
```

can still complete a newly appended `Thanks` into:

```txt
Happy to help - let me take a look. Thanks so much for reaching out!
```

In `substring` mode, the newly typed segment can also match the middle of the
next suggestion. After accepting `Thanks so much for reaching out!`, typing
` if you` can show `Let me know ` on the left and ` have any questions.` on the
right, then accept into:

```txt
Thanks so much for reaching out! Let me know if you have any questions.
```

With `matchWholeValue` (on by default), the saved text is also matched as a
whole, so when the field's entire value is contained in a suggestion it renders
the full left+right ghost — a field holding `have a great` completes to
`Hope you have a great rest of your week!`. Set `matchWholeValue={false}` to
skip that whole-field pass. Active-segment matching, async suggestions, and
trigger suggestions are unaffected either way.

## Copy-Paste Recipes

Reply textarea:

```tsx
<ForeFill
  as="textarea"
  suggestions={replies}
  placeholder="Write a reply..."
  showHelper="idle"
/>
```

Email/domain input:

```tsx
<ForeFill
  as="input"
  inputType="email"
  triggerSuggestions={[
    { trigger: '@', suggestions: ['gmail.com', 'outlook.com'] },
  ]}
  placeholder="alex@g"
/>
```

Async suggestions:

```tsx
<ForeFill
  debounceMs={250}
  asyncSuggestions={async (query, { signal }) => {
    const res = await fetch('/api/suggestions?q=' + encodeURIComponent(query), {
      signal,
    });
    return res.json();
  }}
/>
```

Controlled form field:

```tsx
const [value, setValue] = useState('');

<ForeFill
  value={value}
  onChange={setValue}
  name="reply"
  suggestions={replies}
/>
```

Plain-text contenteditable:

```tsx
<ForeFill
  as="contenteditable"
  suggestions={notes}
  placeholder="Draft a note..."
/>
```

## Surface Modes

Use the `as` prop to choose where autosuggest runs.

### Textarea

Best for multiline notes.

```tsx
<ForeFill
  as="textarea"
  rows={3}
  suggestions={suggestions}
/>
```

### Input

Best for single-line fields.

```tsx
<ForeFill
  as="input"
  inputType="text"
  suggestions={suggestions}
/>
```

### Contenteditable

Best when you need a `contenteditable` surface. The autosuggest value is plain text, which keeps matching, committing, and async suggestions predictable.

```tsx
<ForeFill
  as="contenteditable"
  suggestions={suggestions}
/>
```

For full rich-text editors such as TipTap, Slate, Lexical, or Quill, use the exported `useSuggestions` hook with your editor's own input/caret APIs.

## Activation Length

Use `minQueryLength` to control how many characters must be typed before autosuggest starts.

Default:

```tsx
<ForeFill
  suggestions={suggestions}
  minQueryLength={1}
/>
```

Require at least 3 characters:

```tsx
<ForeFill
  suggestions={suggestions}
  minQueryLength={3}
/>
```

Notes:

- The count uses the trimmed typed value.
- `minQueryLength={3}` means `Da` shows no hint, while `Dai` can show one.
- This setting works with both static and async suggestions.

## Accept And Dismiss

| User action | Result |
| --- | --- |
| `Tab` | Accept the visible ghost hint |
| `Enter` | Accept the visible ghost hint (see `acceptOnEnter`) |
| `Ctrl`/`Cmd` + `ArrowRight` | Accept one word of the hint (see `partialAccept`) |
| `ArrowDown` | Preview the next matching hint |
| `ArrowUp` | Preview the previous matching hint |
| `Shift+Enter` | Insert a new line |
| `Escape` | Hide the current hint and keep the typed text |
| Click away | Hide the hint and keep the typed text |

## Arrow Navigation

Arrow navigation is enabled by default. It only takes over when there is a visible hint and more than one matching suggestion.

```tsx
<ForeFill
  suggestions={suggestions}
  enableArrowNavigation={true}
/>
```

Turn it off:

```tsx
<ForeFill
  suggestions={suggestions}
  enableArrowNavigation={false}
/>
```

Example: if the user types `Thanks`, these suggestions can be cycled inline:

```txt
Thanks so much for reaching out!
Thanks for the quick turnaround.
Thanks again for your patience.
```

## Inline Helper

The helper appears inside the editable surface after the ghost hint:

```txt
Thanks so much for reaching out! | [Up] or [Down] changes hint. [Tab] or [Enter] accepts the hint. [Esc] hides it.
```

The `Up` and `Down` keycaps appear only when `enableArrowNavigation` is enabled and more than one hint matches.

Hide it completely:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper={false}
/>
```

Show it immediately when a hint appears:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper={true}
/>
```

Show it only after the user pauses typing:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper="idle"
  helperIdleMs={900}
  enableArrowNavigation={true}
/>
```

Customize the helper content:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper={true}
  helperText={
    <>
      <kbd>Tab</kbd> accepts. <kbd>Esc</kbd> hides.
    </>
  }
/>
```

Style the helper:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper={true}
  helperClassName="reply-helper"
/>
```

```css
.reply-helper {
  color: #475569;
  --ff-helper-font-size: 0.72em;
  --ff-helper-gap: 0.25em;
}

.reply-helper .ff-key {
  min-width: 1.9em;
  min-height: 1.3em;
  padding-inline: 0.32em;
  border-radius: 3px;
}

.reply-helper .ff-key {
  border-color: #94a3b8;
}
```

## Match Modes

Use `substring` when the typed text can appear anywhere inside a suggestion.

```tsx
<ForeFill
  suggestions={suggestions}
  matchMode="substring"
/>
```

Use `startsWith` when suggestions should only match from the beginning.

```tsx
<ForeFill
  suggestions={suggestions}
  matchMode="startsWith"
/>
```

> **Note on `fuzzy`.** The component supports `substring` and `startsWith` only.
> A fuzzy match has no single contiguous span for the typed text to slot into,
> so it can't be rendered as an inline ghost. `fuzzy` is still available through
> the exported [`useSuggestions`](#suggestion-hook) hook for building list-style
> autocompletes.

> **Note on the caret.** The inline ghost is only shown while the caret sits at
> the **end** of the value — the point where the suggestion would actually be
> appended. Click or arrow into the middle of the text and the hint steps aside
> until you return to the end. With `matchMode="startsWith"` the typed text and
> the ghost are always pixel-aligned; with `substring` matches that wrap across
> multiple lines in a `textarea`, alignment is approximate.

## Trigger Suggestions

Use `triggerSuggestions` when a specific symbol or word should open its own
completion set. Triggers use `startsWith` matching and take precedence over
normal `suggestions` while active.

```tsx
<ForeFill
  as="input"
  triggerSuggestions={[
    { trigger: '@', suggestions: ['gmail.com', 'yahoo.com', 'outlook.com'] },
    { trigger: '$', suggestions: ['total', 'subtotal', 'tax'] },
    { trigger: '&', suggestions: [' shipping', ' handling'] },
    { trigger: 'Happy', suggestions: [' Birthday!'] },
  ]}
/>
```

Examples:

- `john@g` accepts to `john@gmail.com`.
- `$t` accepts to `$total`.
- `Happy` accepts to `Happy Birthday!` because the suggestion starts with a
  leading space.

```ts
type ForeFillTriggerSuggestion = {
  trigger: string;
  suggestions: string[];
  minQueryLength?: number;
  caseSensitive?: boolean;
};
```

Symbol triggers such as `@`, `$`, or `&` can activate anywhere in the active
typed segment. Word triggers such as `Happy` activate at the start of the
segment or after whitespace/punctuation.

## Async Suggestions

Use `asyncSuggestions` when suggestions come from an API. `debounceMs` delays
the request while the user is typing, and the second argument includes an
`AbortSignal` for cancelling stale requests.

```tsx
<ForeFill
  minQueryLength={2}
  debounceMs={250}
  asyncSuggestions={async (query, { signal }) => {
    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, {
      signal,
    });
    return res.json();
  }}
/>
```

When the query changes, ForeFill aborts the previous request and clears stale
matches. If a request fails, the component stops loading and shows no old async
hint.

## Validation And Status

Drive the error, success, and loading treatments declaratively.

```tsx
<ForeFill status="error" />

<ForeFill status="success" />
```

`status` accepts `'idle' | 'loading' | 'success' | 'error'`.
`status="loading"` shows an indeterminate progress bar — this is also inferred
automatically while an `asyncSuggestions` request is in flight, so async users
get the bar for free.

| Prop | Effect |
| --- | --- |
| `status="error"` | Error border + ring, `aria-invalid`. |
| `status="success"` | Success border + ring. |
| `status="loading"` | Indeterminate progress bar, `aria-busy`. |

## Accessibility Labels

Use `ariaLabel` for unlabeled fields, or `ariaLabelledBy` when a visible label
already exists. Use `ariaDescribedBy` for external helper or error text; ForeFill
merges it with the internal keyboard helper description when the helper is
visible.

```tsx
<label id="reply-label">Reply</label>
<p id="reply-help">Use Tab to accept the inline suggestion.</p>

<ForeFill
  ariaLabelledBy="reply-label"
  ariaDescribedBy="reply-help"
  suggestions={suggestions}
  showHelper="idle"
/>
```

## Dark Mode

The component follows the operating system `prefers-color-scheme` by default.
Force a scheme with the `theme` prop, or override tokens under your own
`data-theme` selector.

```tsx
<ForeFill theme="dark" suggestions={suggestions} />
<ForeFill theme="light" suggestions={suggestions} />
```

## Controlled Value

```tsx
import { useState } from 'react';
import { ForeFill } from 'forefill';

export function ControlledExample() {
  const [value, setValue] = useState('');

  return (
    <ForeFill
      value={value}
      onChange={setValue}
      suggestions={['Thanks so much for reaching out!']}
    />
  );
}
```

## Form Integration

ForeFill forwards the standard form attributes to the underlying
input/textarea, so it participates in native `<form>` submission and validation
just like a plain field.

```tsx
<form onSubmit={handleSubmit}>
  <label htmlFor="reply">Reply</label>
  <ForeFill
    as="input"
    id="reply"
    name="reply"
    required
    maxLength={280}
    suggestions={suggestions}
  />
  <button type="submit">Send</button>
</form>
```

Supported passthrough props: `name`, `id`, `required`, `readOnly`, `maxLength`,
and `autoFocus`. The component's own value and handlers always take precedence,
so these can't break its behavior. `readOnly` also suppresses the inline ghost.
(Browser autofill and spellcheck are disabled internally so they never compete
with the inline ghost.)

> The `name`, `required`, and `maxLength` attributes apply to the `textarea` and
> `input` surfaces. The `contenteditable` surface is not a
> native form control, so it won't submit a value — use a hidden input mirror if
> you need that.

## Accept, Dismiss & Commit Callbacks

`onAccept` tells you the user took a suggestion (and which one), separate from
`onCommit` — which also fires when they commit their own typed text. `onDismiss`
fires when a visible hint is escaped.

```tsx
<ForeFill
  suggestions={suggestions}
  onAccept={(value, suggestion) => track('accepted', suggestion)}
  onCommit={(value) => save(value)}
  onDismiss={() => track('dismissed')}
/>
```

Tune how the field finalizes:

```tsx
{/* Enter no longer accepts the hint — only Tab does. Enter commits typed text. */}
<ForeFill suggestions={suggestions} acceptOnEnter={false} />

{/* Commit the current value whenever focus leaves the field. */}
<ForeFill suggestions={suggestions} commitOnBlur />
```

## Word-by-Word Accept

Press `Ctrl` / `Cmd` + `ArrowRight` to accept one word of the hint at a time
instead of the whole thing, then keep typing or accept more. Enabled by default;
turn it off with `partialAccept={false}`.

```tsx
<ForeFill suggestions={suggestions} partialAccept />
```

Word-by-word accept applies to start-anchored hints (where the typed text begins
the suggestion). For `substring` matches that have text *before* the typed
portion, `Ctrl`/`Cmd` + `ArrowRight` falls through to the browser's normal word
navigation.

## Disable Inline Fill

Use this when you want the editable surface without ghost hints.

```tsx
<ForeFill
  suggestions={suggestions}
  disableInlineFill
/>
```

## Imperative Ref

```tsx
import { useRef } from 'react';
import {
  ForeFill,
  type ForeFillHandle,
} from 'forefill';

export function FocusExample() {
  const ref = useRef<ForeFillHandle>(null);

  return (
    <>
      <ForeFill
        ref={ref}
        suggestions={['Thanks so much for reaching out!']}
      />
      <button type="button" onClick={() => ref.current?.focus()}>
        Focus
      </button>
    </>
  );
}
```

## Styling

The package ships a single stylesheet:

```tsx
import 'forefill/styles.css';
```

Customize with CSS variables:

```css
.reply-field {
  --ff-bg: #ffffff;
  --ff-text: #0f172a;
  --ff-muted: #64748b;
  --ff-border: #cbd5e1;
  --ff-accent: #2563eb;
  --ff-success: #0e9f6e;
  --ff-danger: #e02424;
  --ff-radius: 8px;
  --ff-font-size: 14px;
  --ff-min-height: 84px;
  --ff-input-min-height: 40px;
}
```

```tsx
<ForeFill
  className="reply-field"
  suggestions={suggestions}
/>
```

### Visual Variants

```tsx
<ForeFill variant="outline" suggestions={suggestions} />
<ForeFill variant="filled" suggestions={suggestions} />
<ForeFill variant="underline" suggestions={suggestions} />
```

### Sizes

```tsx
<ForeFill size="sm" suggestions={suggestions} />
<ForeFill size="md" suggestions={suggestions} />
<ForeFill size="lg" suggestions={suggestions} />
```

### CSS Tokens

Every visual value is exposed as a CSS custom property. Override any of these
in your own stylesheet to re-skin the component.

| Token | Purpose |
| --- | --- |
| `--ff-bg` | Field background |
| `--ff-text` | Typed text color |
| `--ff-muted` | Placeholder, helper, and ghost text color |
| `--ff-faint` | Ghost prefix/suffix color |
| `--ff-border` | Resting border color |
| `--ff-accent` | Focus border, caret, and ring color |
| `--ff-success` | Success state color |
| `--ff-danger` | Error state color |
| `--ff-radius` | Border radius |
| `--ff-ease` | Animation easing curve |
| `--ff-duration` | Base transition duration |
| `--ff-key-bg` | Helper keycap background |
| `--ff-key-border` | Helper keycap border |
| `--ff-key-shadow` | Helper keycap shadow |
| `--ff-helper-font-size` | Inline helper text size |
| `--ff-helper-gap` | Space between helper pieces |
| `--ff-helper-margin-left` | Space before the helper begins |
| `--ff-helper-opacity` | Helper opacity |
| `--ff-helper-separator-margin-right` | Space after the separator |
| `--ff-key-min-width` | Keycap minimum width |
| `--ff-key-min-height` | Keycap minimum height |
| `--ff-key-padding-x` | Keycap horizontal padding |
| `--ff-key-radius` | Keycap border radius |
| `--ff-key-font-size` | Keycap text size |
| `--ff-key-font-weight` | Keycap font weight |
| `--ff-font` | Font family |
| `--ff-padding-y` | Vertical padding |
| `--ff-padding-x` | Horizontal padding |
| `--ff-font-size` | Text size |
| `--ff-line-height` | Text line height |
| `--ff-min-height` | Minimum textarea/contenteditable height |
| `--ff-input-min-height` | Input height |

## Props

Every public prop below includes its use and a short example.

### Suggestions And Matching

| Prop | Type / default | Use | Example |
| --- | --- | --- | --- |
| `suggestions` | `string[]`, default `[]` | Static suggestion list used when no trigger completion is active. | `<ForeFill suggestions={['Thanks so much!']} />` |
| `triggerSuggestions` | `ForeFillTriggerSuggestion[]`, default `[]` | Adds trigger-specific completions for symbols or words, such as email domains after `@`. | `<ForeFill triggerSuggestions={[{ trigger: '@', suggestions: ['gmail.com'] }]} />` |
| `asyncSuggestions` | `(query: string, context?: { signal: AbortSignal }) => Promise<string[]>` | Loads suggestions from an API, aborts stale requests, and takes precedence over `suggestions`. | `<ForeFill asyncSuggestions={fetchSuggestions} debounceMs={250} />` |
| `matchMode` | `'startsWith' \| 'substring'`, default `'substring'` | Controls matching for normal suggestions; trigger suggestions always use starts-with matching. | `<ForeFill matchMode="startsWith" />` |
| `matchWholeValue` | `boolean`, default `true` | When the field already contains text, also matches the whole value against the static `suggestions` so a suggestion that contains it renders the full left+right ghost. Off skips only that whole-field pass; active-segment matching still works. Async/trigger sources are unaffected. | `<ForeFill matchWholeValue={false} />` |
| `minQueryLength` | `number`, default `1` | Requires a trimmed query length before suggestions activate. | `<ForeFill minQueryLength={3} />` |
| `debounceMs` | `number`, default `0` | Delays async requests while the user is typing. | `<ForeFill asyncSuggestions={fetchSuggestions} debounceMs={300} />` |
| `disableInlineFill` | `boolean`, default `false` | Keeps the editable field behavior but hides ghost hints. | `<ForeFill disableInlineFill />` |
| `enableArrowNavigation` | `boolean`, default `true` | Lets Up and Down cycle through multiple matching hints. | `<ForeFill enableArrowNavigation={false} />` |

### Surface And Value

| Prop | Type / default | Use | Example |
| --- | --- | --- | --- |
| `as` | `'textarea' \| 'input' \| 'contenteditable'`, default `'textarea'` | Chooses the editable surface. | `<ForeFill as="input" suggestions={suggestions} />` |
| `rows` | `number`, default `3` | Sets visible rows for `as="textarea"`. | `<ForeFill as="textarea" rows={5} />` |
| `inputType` | `string`, default `'text'` | Sets the native type for `as="input"`. | `<ForeFill as="input" inputType="email" />` |
| `placeholder` | `string`, default `'Type to search...'` | Sets the placeholder or contenteditable empty-state text. | `<ForeFill placeholder="Write a reply..." />` |
| `defaultValue` | `string`, default `''` | Sets the initial uncontrolled value. | `<ForeFill defaultValue="Existing text. " />` |
| `value` | `string` | Makes the component controlled; pair it with `onChange`. | `<ForeFill value={value} onChange={setValue} />` |
| `disabled` | `boolean`, default `false` | Disables input and interactive completion. | `<ForeFill disabled />` |
| `readOnly` | `boolean`, default `false` | Shows a value without allowing edits or hints. | `<ForeFill readOnly value="Saved reply" />` |

### Events And Accept Behavior

| Prop | Type / default | Use | Example |
| --- | --- | --- | --- |
| `onChange` | `(value: string) => void` | Runs on every typed value change. | `<ForeFill value={value} onChange={setValue} />` |
| `onCommit` | `(value: string) => void` | Runs when the user commits typed text or accepts a hint. | `<ForeFill onCommit={(value) => save(value)} />` |
| `onAccept` | `(value: string, suggestion: string) => void` | Runs only when a suggestion is accepted. | `<ForeFill onAccept={(_value, suggestion) => track(suggestion)} />` |
| `onDismiss` | `() => void` | Runs when Escape hides a visible hint. | `<ForeFill onDismiss={() => track('dismissed')} />` |
| `acceptOnEnter` | `boolean`, default `true` | When false, Enter commits typed text and Tab accepts hints. | `<ForeFill acceptOnEnter={false} />` |
| `commitOnBlur` | `boolean`, default `false` | Commits the current value when focus leaves the field. | `<ForeFill commitOnBlur onCommit={save} />` |
| `partialAccept` | `boolean`, default `true` | Lets users accept one word with Ctrl/Cmd + ArrowRight. | `<ForeFill partialAccept={false} />` |

### Helper, Status, And Accessibility

| Prop | Type / default | Use | Example |
| --- | --- | --- | --- |
| `ariaLabel` | `string`, default `placeholder` | Labels the field when no visible label is connected. | `<ForeFill ariaLabel="Compose reply" />` |
| `ariaLabelledBy` | `string` | Uses an external visible label as the accessible name. | `<ForeFill ariaLabelledBy="reply-label" />` |
| `ariaDescribedBy` | `string` | Merges external helper/error text with ForeFill's internal helper description. | `<ForeFill ariaDescribedBy="reply-help" />` |
| `showHelper` | `boolean \| 'idle'`, default `false` | Shows the inline keyboard helper immediately, after idle, or never. | `<ForeFill showHelper="idle" />` |
| `helperIdleMs` | `number`, default `900` | Controls the idle delay when `showHelper="idle"`. | `<ForeFill showHelper="idle" helperIdleMs={1200} />` |
| `helperText` | `ReactNode`, default built-in helper | Replaces the helper copy with custom React content. | `<ForeFill showHelper helperText="Tab accepts" />` |
| `helperClassName` | `string` | Styles the helper wrapper with a class. | `<ForeFill showHelper helperClassName="reply-helper" />` |
| `status` | `'idle' \| 'loading' \| 'success' \| 'error'` | Drives loading, success, or error treatments; error sets `aria-invalid`. | `<ForeFill status="error" />` |

### Styling And Forms

| Prop | Type / default | Use | Example |
| --- | --- | --- | --- |
| `className` | `string` | Styles the root wrapper and scopes CSS variable overrides. | `<ForeFill className="reply-field" />` |
| `editorClassName` | `string` | Styles the editable textarea, input, or contenteditable element. | `<ForeFill editorClassName="reply-editor" />` |
| `variant` | `'outline' \| 'filled' \| 'underline'`, default `'outline'` | Chooses the built-in border/fill treatment. | `<ForeFill variant="filled" />` |
| `size` | `'sm' \| 'md' \| 'lg'`, default `'md'` | Adjusts font size, padding, and minimum height. | `<ForeFill size="lg" />` |
| `theme` | `'light' \| 'dark'` | Forces a color scheme; omit it to follow system preference. | `<ForeFill theme="dark" />` |
| `name` | `string` | Forwards the native form name to input/textarea. | `<ForeFill as="input" name="reply" />` |
| `id` | `string` | Sets the editable element id for labels. | `<ForeFill id="reply" />` |
| `required` | `boolean`, default `false` | Marks input/textarea required and sets `aria-required`. | `<ForeFill required />` |
| `maxLength` | `number` | Sets the native maximum length for input/textarea. | `<ForeFill maxLength={280} />` |
| `autoFocus` | `boolean`, default `false` | Focuses the field on mount. | `<ForeFill autoFocus />` |

## Trigger Suggestion Type

```ts
type ForeFillTriggerSuggestion = {
  trigger: string;
  suggestions: string[];
  minQueryLength?: number;
  caseSensitive?: boolean;
};
```

| Field | Use | Example |
| --- | --- | --- |
| `trigger` | Text that activates a completion group. | `{ trigger: '@', suggestions: ['gmail.com'] }` |
| `suggestions` | Values offered after the trigger. Leading spaces are preserved. | `{ trigger: 'Happy', suggestions: [' Birthday!'] }` |
| `minQueryLength` | Optional query length required after the trigger. | `{ trigger: '@', minQueryLength: 1, suggestions: ['gmail.com'] }` |
| `caseSensitive` | Requires exact casing for the trigger and query. | `{ trigger: 'SKU', caseSensitive: true, suggestions: ['-001'] }` |

## Imperative Handle Type

Use `ref` when another control needs to move focus or selection.

```ts
type ForeFillHandle = {
  focus: () => void;
  blur: () => void;
  select: () => void;
};
```

```tsx
const ref = useRef<ForeFillHandle>(null);

<ForeFill ref={ref} suggestions={suggestions} />;
<button type="button" onClick={() => ref.current?.focus()}>Focus</button>;
```

## Suggestion Hook

The matching engine is also exported for custom interfaces.

```tsx
import { useSuggestions } from 'forefill';

function CustomAutosuggest({ suggestions }: { suggestions: string[] }) {
  const [query, setQuery] = useState('');
  const { matches, isLoading } = useSuggestions(query, {
    suggestions,
    minQueryLength: 2,
    matchMode: 'substring',
  });

  return null;
}
```

```ts
type UseSuggestionsOptions = {
  suggestions?: string[];
  asyncFetcher?: (
    query: string,
    context?: { signal: AbortSignal }
  ) => Promise<string[]>;
  minQueryLength?: number;
  debounceMs?: number;
  matchMode?: 'startsWith' | 'substring' | 'fuzzy';
};

type UseSuggestionsResult = {
  matches: string[];
  isLoading: boolean;
};
```

| Option / result | Use | Example |
| --- | --- | --- |
| `suggestions` | Static list filtered on the client. | `useSuggestions(query, { suggestions })` |
| `asyncFetcher` | Async source with an AbortSignal; replaces static filtering. | `useSuggestions(query, { asyncFetcher: fetchSuggestions })` |
| `minQueryLength` | Returns no matches until the trimmed query is long enough. | `useSuggestions(query, { minQueryLength: 2 })` |
| `debounceMs` | Debounces async queries. | `useSuggestions(query, { asyncFetcher, debounceMs: 250 })` |
| `matchMode` | Supports `startsWith`, `substring`, and hook-only `fuzzy`. | `useSuggestions(query, { matchMode: 'fuzzy' })` |
| `matches` | The filtered suggestion strings. | `const { matches } = useSuggestions(query, options)` |
| `isLoading` | True while an async fetch is in flight. | `const { isLoading } = useSuggestions(query, options)` |

## Local Development

Run the demo:

```bash
npm run dev
```

Build the package:

```bash
npm run build
```

Preview the publish contents:

```bash
npm run pack:dry
```

The package build emits:

```txt
dist/index.js
dist/index.cjs
dist/index.d.ts
dist/**/*.d.ts
dist/styles.css
```

`npm run pack:dry` should include those library artifacts plus `README.md`,
`LICENSE`, and `package.json`. It should not include demo assets such as
`ForeFill.svg`, `ForeFill.json`, or `favicon.svg`.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No ghost appears | Make sure the field is focused, the caret is at the end, the query meets `minQueryLength`, and `disableInlineFill` is not set. |
| `Enter` accepts when it should only commit | Set `acceptOnEnter={false}`; `Tab` will still accept visible hints. |
| Async results look stale | Use the `signal` passed to `asyncSuggestions` / `asyncFetcher` in your `fetch` call. ForeFill aborts old requests when the query changes. |
| Screen readers do not announce your label | Use `ariaLabel` for unlabeled fields or `ariaLabelledBy` to point at a visible label ID. |
| Error/helper text is not announced | Pass the external text ID with `ariaDescribedBy`; ForeFill merges it with its own helper description. |
| `contenteditable` does not submit in a form | `contenteditable` is not a native form control. Mirror the value into a hidden input if you need native form submission. |
| Hint disappears near `maxLength` | Accepted completions that would exceed native `maxLength` are intentionally suppressed. |

## Publish Checklist

1. Confirm `author`, `repository`, and `homepage` in `package.json`.
2. Log in once with `npm login`, then confirm with `npm whoami`.
3. Run `npm run release:check`.
4. Optional: run `npm pack` and install the generated `.tgz` in a separate React app.
5. Publish with `npm run publish:npm`.

For the first public publish, the package name `forefill` must still be
available on npm. If it is not, change `name` to a scoped package such as
`@your-npm-username/forefill` and publish with the same `npm run publish:npm`
script.
