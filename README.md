<p align="center">
  <strong>ForeFill</strong>
</p>

<p align="center">
  Inline ghost-text autocomplete for React textareas, textboxes, and contenteditable richtext surfaces.
</p>

<p align="center">
  <img alt="React peer dependency" src="https://img.shields.io/badge/react-%3E%3D18%20%3C20-61dafb">
  <img alt="TypeScript types included" src="https://img.shields.io/badge/types-included-3178c6">
  <img alt="No UI dependency" src="https://img.shields.io/badge/UI%20deps-none-16a34a">
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827">
</p>

---

## Overview

**ForeFill** (`forefill`) is a small React component that shows a ghost suggestion directly inside a textarea, textbox, or contenteditable richtext surface — the user keeps typing and the rest fills in ahead of the caret.

It is designed for forms where users should keep typing naturally, then accept a suggestion with `Tab` or `Enter`.

| Capability | Included |
| --- | --- |
| Inline ghost hint | Yes |
| Textarea, textbox, and richtext surfaces | Yes |
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

## How It Behaves

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

### Textbox

Best for single-line fields. `as="textbox"` is an alias for `as="input"`.

```tsx
<ForeFill
  as="input"
  inputType="text"
  suggestions={suggestions}
/>

<ForeFill
  as="textbox"
  suggestions={suggestions}
/>
```

### Richtext

Best when you need a `contenteditable` surface. The autosuggest value is plain text, which keeps matching, committing, and async suggestions predictable.

```tsx
<ForeFill
  as="richtext"
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
  helperKeyClassName="reply-helper-key"
/>
```

```css
.reply-helper {
  color: #475569;
  --ff-helper-font-size: 0.72em;
  --ff-helper-gap: 0.25em;
}

.reply-helper-key {
  min-width: 1.9em;
  min-height: 1.3em;
  padding-inline: 0.32em;
  border-radius: 3px;
}

.reply-helper kbd {
  border-color: #94a3b8;
}
```

You can also pass inline styles:

```tsx
<ForeFill
  suggestions={suggestions}
  showHelper={true}
  helperStyle={{ fontSize: '0.7em', opacity: 0.75 }}
/>
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

Use `asyncSuggestions` when suggestions come from an API. `debounceMs` delays the request while the user is typing.

```tsx
<ForeFill
  minQueryLength={2}
  debounceMs={250}
  asyncSuggestions={async (query) => {
    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
    return res.json();
  }}
/>
```

## Validation And Status

Drive the error, success, and loading treatments declaratively. `statusMessage`
renders beneath the field and is announced to assistive tech.

```tsx
<ForeFill
  invalid
  statusMessage="That value is not recognized."
/>

<ForeFill
  status="success"
  statusMessage="Looks good!"
/>
```

`status` takes precedence over `invalid` and accepts `'idle' | 'loading' | 'success' | 'error'`.
`status="loading"` shows an indeterminate progress bar — this is also inferred
automatically while an `asyncSuggestions` request is in flight, so async users
get the bar for free.

| Prop | Effect |
| --- | --- |
| `invalid` | Paints the error treatment and sets `aria-invalid`. Shorthand for `status="error"`. |
| `status="error"` | Error border + ring, `aria-invalid`. |
| `status="success"` | Success border + ring. |
| `status="loading"` | Indeterminate progress bar, `aria-busy`. |
| `statusMessage` | Visible message below the field, linked via `aria-describedby`. |

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
`form`, `autoFocus`, `autoComplete` (default `'off'`), and `spellCheck`
(default `false`). The component's own value and handlers always take
precedence, so these can't break its behavior. `readOnly` also suppresses the
inline ghost.

> The `name`, `required`, and `maxLength` attributes apply to the `textarea` and
> `input`/`textbox` surfaces. The `richtext` (contenteditable) surface is not a
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
| `--ff-danger` | Error / invalid state color |
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
| `--ff-min-height` | Minimum textarea/richtext height |
| `--ff-input-min-height` | Textbox height |

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `as` | `'textarea' \| 'input' \| 'textbox' \| 'richtext'` | `'textarea'` | Editable surface to render. |
| `suggestions` | `string[]` | `[]` | Static suggestions. |
| `triggerSuggestions` | `ForeFillTriggerSuggestion[]` | `[]` | Triggered completions for symbols or words. Keeps the trigger and replaces only the query typed after it. |
| `asyncSuggestions` | `(query: string) => Promise<string[]>` | - | Async suggestion source. Overrides `suggestions`. |
| `onCommit` | `(value: string) => void` | - | Runs when the user accepts a hint or commits the current value. |
| `onChange` | `(value: string) => void` | - | Runs on every typed change. |
| `onAccept` | `(value: string, suggestion: string) => void` | - | Runs only when an inline suggestion is accepted, with the suggestion that was taken. |
| `onDismiss` | `() => void` | - | Runs when a visible hint is dismissed with Escape. |
| `placeholder` | `string` | `'Type to search...'` | Editable surface placeholder. |
| `className` | `string` | - | Class for the root wrapper. |
| `editorClassName` | `string` | - | Class for the editable surface. |
| `textareaClassName` | `string` | - | Backward-compatible alias for the editable surface class. |
| `inputType` | `string` | `'text'` | Input type when `as="input"` or `as="textbox"`. |
| `helperClassName` | `string` | - | Class for the inline helper. |
| `helperStyle` | `CSSProperties` | - | Inline styles for the helper wrapper. |
| `helperKeyClassName` | `string` | - | Class for the built-in helper keycaps. |
| `rows` | `number` | `3` | Textarea rows. Ignored by textbox and richtext modes. |
| `disabled` | `boolean` | `false` | Disables the editable surface. |
| `variant` | `'outline' \| 'filled' \| 'underline'` | `'outline'` | Visual style. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size preset. |
| `matchMode` | `'startsWith' \| 'substring'` | `'substring'` | Matching strategy. |
| `disableInlineFill` | `boolean` | `false` | Disables ghost hints. |
| `previewActive` | `boolean` | `false` | Render the ghost hint even when the surface is not focused. For autoplaying showcase/marketing demos driven programmatically; leave off for normal use. |
| `enableArrowNavigation` | `boolean` | `true` | Lets `ArrowDown` and `ArrowUp` cycle matching inline hints. |
| `minQueryLength` | `number` | `1` | Characters required before autosuggest activates. |
| `debounceMs` | `number` | `0` | Async debounce delay in milliseconds. |
| `ariaLabel` | `string` | placeholder | Textarea accessibility label. |
| `showHelper` | `boolean \| 'idle'` | `false` | Shows the inline helper immediately, after idle, or never. |
| `helperIdleMs` | `number` | `900` | Delay before showing the helper when `showHelper="idle"`. |
| `helperText` | `ReactNode` | keycap helper | Custom inline helper content. |
| `defaultValue` | `string` | `''` | Initial uncontrolled value. |
| `value` | `string` | - | Controlled value. |
| `invalid` | `boolean` | `false` | Error treatment + `aria-invalid`. Shorthand for `status="error"`. |
| `status` | `'idle' \| 'loading' \| 'success' \| 'error'` | - | Explicit visual status. Overrides `invalid`. |
| `statusMessage` | `ReactNode` | - | Message rendered beneath the field and announced to assistive tech. |
| `theme` | `'light' \| 'dark'` | - | Force a color scheme. Omit to follow `prefers-color-scheme`. |
| `name` | `string` | - | `name` forwarded to the input/textarea for form submission. |
| `id` | `string` | - | `id` forwarded to the editable element (pairs with `<label htmlFor>`). |
| `required` | `boolean` | `false` | Marks the field required (input/textarea); sets `aria-required`. |
| `readOnly` | `boolean` | `false` | Renders the field read-only and suppresses the ghost. |
| `maxLength` | `number` | - | Maximum character length (input/textarea). |
| `form` | `string` | - | Associates the field with a `<form id>` elsewhere in the DOM. |
| `autoFocus` | `boolean` | `false` | Autofocus the field on mount. |
| `autoComplete` | `string` | `'off'` | `autocomplete` attribute. |
| `spellCheck` | `boolean` | `false` | `spellcheck` attribute. |
| `acceptOnEnter` | `boolean` | `true` | Whether Enter accepts a visible hint. When `false`, only Tab accepts. |
| `commitOnBlur` | `boolean` | `false` | Commit the current value when focus leaves the field. |
| `partialAccept` | `boolean` | `true` | Allow `Ctrl`/`Cmd` + `ArrowRight` to accept one word of the hint at a time. |

## Suggestion Hook

The matching engine is also exported for custom interfaces:

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
dist/styles.css
```

## Publish Checklist

1. Update `author`, `repository`, and `homepage` in `package.json`.
2. Run `npm run build`.
3. Run `npm run pack:dry`.
4. Install the generated `.tgz` in a separate React app.
5. Publish with `npm publish`.
