import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from 'react';
import Lottie from 'lottie-react';
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Code2,
  Copy,
  Moon,
  Play,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WandSparkles,
  Zap,
} from 'lucide-react';
import {
  ForeFill,
  type ForeFillHandle,
  type ForeFillMatchMode,
  type ForeFillSize,
  type ForeFillSurface,
  type ForeFillTriggerSuggestion,
  type ForeFillVariant,
} from './lib';

const PKG = 'forefill';
const VERSION = '0.1.0';
const REPO_URL = 'https://github.com/kenesuino/ForeFill';
const THEME_KEY = 'forefill-theme';
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const LOT_URL = assetUrl('ForeFill.json');
const LOGO_URL = assetUrl('ForeFill.svg');

type Page = 'hero' | 'documentation' | 'playground';
type ThemeMode = 'light' | 'dark';
type ThemeChoice = 'auto' | 'light' | 'dark';
type ShowHelperMode = 'idle' | 'true' | 'false';
type StatusMode = 'idle' | 'loading' | 'success' | 'error';
type TriggerMode = 'all' | 'email' | 'happy' | 'symbols' | 'none';
type PlaygroundPresetId = 'reply' | 'email' | 'async' | 'note' | 'validation';
interface HeroTravelStyle {
  position: 'fixed';
  top: number;
  left: number;
  width: number;
  opacity: number;
  pointerEvents: 'none';
  zIndex: number;
}

interface PlaygroundState {
  as: ForeFillSurface;
  placeholder: string;
  rows: number;
  inputType: string;
  ariaLabel: string;
  variant: ForeFillVariant;
  size: ForeFillSize;
  themeChoice: ThemeChoice;
  matchMode: ForeFillMatchMode;
  minQueryLength: number;
  debounceMs: number;
  asyncMode: boolean;
  triggerMode: TriggerMode;
  disableInlineFill: boolean;
  enableArrowNavigation: boolean;
  acceptOnEnter: boolean;
  commitOnBlur: boolean;
  partialAccept: boolean;
  showHelper: ShowHelperMode;
  helperIdleMs: number;
  helperText: string;
  status: StatusMode;
  name: string;
  id: string;
  required: boolean;
  readOnly: boolean;
  maxLength: number;
  autoFocus: boolean;
  disabled: boolean;
}

interface PlaygroundEvent {
  id: number;
  name: string;
  value: string;
}

interface PlaygroundPreset {
  id: PlaygroundPresetId;
  label: string;
  description: string;
  state: Partial<PlaygroundState>;
  suggestions?: string[];
}

interface ApiProp {
  name: string;
  type: string;
  def: string;
  desc: string;
  purpose: string;
  example: string;
}

const PAGE_LINKS: Array<{ page: Page; hash: string; label: string }> = [
  { page: 'hero', hash: '#hero', label: 'Home' },
  { page: 'documentation', hash: '#documentation', label: 'Documentation' },
  { page: 'playground', hash: '#playground', label: 'Playground' },
];

const GUIDE_SECTIONS = [
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'trigger-suggestions', label: 'Trigger suggestions' },
  { id: 'existing-values', label: 'Existing values' },
  { id: 'async-suggestions', label: 'Async suggestions' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'styling', label: 'Styling' },
  { id: 'accessibility', label: 'Accessibility' },
];

const DOC_OVERVIEW = [
  {
    title: 'Install',
    text: 'Add the package and stylesheet once at the app boundary.',
  },
  {
    title: 'Integrate',
    text: 'Start with static phrases, then add trigger or async sources.',
  },
  {
    title: 'Tune',
    text: 'Adjust behavior, status, styling, and native form props.',
  },
];

const DEFAULT_SUGGESTIONS = [
  'Thanks so much for reaching out!',
  'Thanks for the quick turnaround.',
  'Happy to help - let me take a look.',
  'Let me know if you have any questions.',
  'Looking forward to hearing from you.',
  'Hope you have a great rest of your week!',
  'Congratulations on the launch.',
  "Sounds good - let's set up a time to chat.",
];

const TRIGGER_PRESETS: Record<Exclude<TriggerMode, 'none'>, ForeFillTriggerSuggestion[]> = {
  all: [
    { trigger: '@', suggestions: ['gmail.com', 'yahoo.com', 'outlook.com'] },
    { trigger: 'Happy', suggestions: [' Birthday!', ' Friday!', ' New Year!'] },
    { trigger: '$', suggestions: ['total', 'subtotal', 'tax'] },
    { trigger: '&', suggestions: [' shipping', ' handling', ' returns'] },
  ],
  email: [
    { trigger: '@', suggestions: ['gmail.com', 'yahoo.com', 'outlook.com'] },
  ],
  happy: [
    { trigger: 'Happy', suggestions: [' Birthday!', ' Friday!', ' New Year!'] },
  ],
  symbols: [
    { trigger: '$', suggestions: ['total', 'subtotal', 'tax'] },
    { trigger: '&', suggestions: [' shipping', ' handling', ' returns'] },
  ],
};

const PLAYGROUND_DEFAULT_STATE: PlaygroundState = {
  as: 'textarea',
  placeholder: 'Write a reply...',
  rows: 3,
  inputType: 'text',
  ariaLabel: 'Compose a reply',
  variant: 'outline',
  size: 'md',
  themeChoice: 'auto',
  matchMode: 'substring',
  minQueryLength: 1,
  debounceMs: 0,
  asyncMode: false,
  triggerMode: 'all',
  disableInlineFill: false,
  enableArrowNavigation: true,
  acceptOnEnter: true,
  commitOnBlur: false,
  partialAccept: true,
  showHelper: 'idle',
  helperIdleMs: 900,
  helperText: '',
  status: 'idle',
  name: '',
  id: '',
  required: false,
  readOnly: false,
  maxLength: 0,
  autoFocus: false,
  disabled: false,
};

const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'reply',
    label: 'Reply',
    description: 'Textarea with static phrases and trigger completions.',
    state: {},
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Single-line email input with domain completions.',
    state: {
      as: 'input',
      inputType: 'email',
      placeholder: 'alex@g',
      ariaLabel: 'Email address',
      triggerMode: 'email',
      matchMode: 'startsWith',
      showHelper: 'true',
    },
  },
  {
    id: 'async',
    label: 'Async Search',
    description: 'Debounced async source with loading state.',
    state: {
      as: 'input',
      placeholder: 'Search saved replies...',
      ariaLabel: 'Search saved replies',
      asyncMode: true,
      triggerMode: 'none',
      debounceMs: 300,
      matchMode: 'substring',
      showHelper: 'false',
    },
  },
  {
    id: 'note',
    label: 'Contenteditable Note',
    description: 'Plain-text contenteditable editor with multiline hints.',
    state: {
      as: 'contenteditable',
      placeholder: 'Draft a note...',
      ariaLabel: 'Draft note',
      rows: 6,
      triggerMode: 'happy',
      showHelper: 'idle',
    },
    suggestions: [
      'Project update: the first draft is ready for review.',
      'Next steps: confirm scope, assign owners, and schedule follow-up.',
      'Happy to help - I can take the first pass.',
      'Please add notes directly in this thread.',
    ],
  },
  {
    id: 'validation',
    label: 'Validation/Form',
    description: 'Required native form field with error treatment.',
    state: {
      as: 'input',
      placeholder: 'Required reply',
      ariaLabel: 'Required reply',
      triggerMode: 'none',
      status: 'error',
      required: true,
      name: 'reply',
      id: 'reply-field',
      maxLength: 80,
      acceptOnEnter: false,
      commitOnBlur: true,
    },
  },
];

const HERO_TYPING_ITEMS = [
  {
    field: 'to' as const,
    seed: 'alex@g',
    full: 'alex@gmail.com',
  },
  {
    field: 'subject' as const,
    seed: 'Happy',
    full: 'Happy Birthday!',
  },
  {
    field: 'subject' as const,
    seed: 'Following',
    full: 'Following up to see if you had any thoughts.',
  },
  {
    field: 'body' as const,
    seed: 'Thanks so',
    full: 'Thanks so much for reaching out!',
  },
  {
    field: 'body' as const,
    seed: 'Let me know',
    full: 'Let me know if you have any questions.',
  },
  {
    field: 'body' as const,
    seed: 'Looking',
    full: 'Looking forward to hearing from you.',
  },
  {
    field: 'to' as const,
    seed: 'sam@y',
    full: 'sam@yahoo.com',
  },
];

const API_PROPS: ApiProp[] = [
  {
    name: 'as',
    type: "'textarea' | 'input' | 'contenteditable'",
    def: "'textarea'",
    desc: 'Editable surface to render.',
    purpose: 'Switches between multiline text, single-line input, and a plain-text contenteditable surface.',
    example: '<ForeFill as="input" suggestions={suggestions} />',
  },
  {
    name: 'suggestions',
    type: 'string[]',
    def: '[]',
    desc: 'Static suggestion list.',
    purpose: 'The normal phrase list used when no trigger completion is active.',
    example: '<ForeFill suggestions={["Thanks so much!"]} />',
  },
  {
    name: 'triggerSuggestions',
    type: 'ForeFillTriggerSuggestion[]',
    def: '[]',
    desc: 'Custom trigger completions for symbols or words.',
    purpose: 'Use this for @ domains, $ variables, & snippets, or word triggers like Happy -> " Birthday!".',
    example: '<ForeFill triggerSuggestions={[{ trigger: "@", suggestions: ["gmail.com"] }]} />',
  },
  {
    name: 'asyncSuggestions',
    type: '(query: string, context?: { signal: AbortSignal }) => Promise<string[]>',
    def: '-',
    desc: 'Async suggestion source. Overrides suggestions.',
    purpose: 'Receives the active typed query and an AbortSignal for cancelling stale requests.',
    example: '<ForeFill asyncSuggestions={fetchSuggestions} debounceMs={250} />',
  },
  {
    name: 'onCommit',
    type: '(value: string) => void',
    def: '-',
    desc: 'Runs when a value is committed.',
    purpose: 'Persist the final field value after Enter, Tab, or blur when commitOnBlur is enabled.',
    example: '<ForeFill onCommit={(value) => save(value)} />',
  },
  {
    name: 'onChange',
    type: '(value: string) => void',
    def: '-',
    desc: 'Runs on every value change.',
    purpose: 'Use this for controlled state or analytics on typed text.',
    example: '<ForeFill value={value} onChange={setValue} />',
  },
  {
    name: 'onAccept',
    type: '(value: string, suggestion: string) => void',
    def: '-',
    desc: 'Runs only when a suggestion is accepted.',
    purpose: 'Track suggestion adoption separately from plain commits.',
    example: '<ForeFill onAccept={(_value, suggestion) => track(suggestion)} />',
  },
  {
    name: 'onDismiss',
    type: '() => void',
    def: '-',
    desc: 'Runs when Escape hides a visible hint.',
    purpose: 'Measure or react to explicit suggestion dismissal.',
    example: '<ForeFill onDismiss={() => track("dismissed")} />',
  },
  {
    name: 'placeholder',
    type: 'string',
    def: "'Type to search...'",
    desc: 'Editable surface placeholder.',
    purpose: 'Sets the native placeholder or contenteditable placeholder text.',
    example: '<ForeFill placeholder="Write a reply..." />',
  },
  {
    name: 'className',
    type: 'string',
    def: '-',
    desc: 'Class for the root wrapper.',
    purpose: 'Attach layout classes or CSS variable overrides to the component root.',
    example: '<ForeFill className="reply-field" />',
  },
  {
    name: 'editorClassName',
    type: 'string',
    def: '-',
    desc: 'Class for the editable surface.',
    purpose: 'Style the textarea, input, or contenteditable element directly.',
    example: '<ForeFill editorClassName="reply-editor" />',
  },
  {
    name: 'inputType',
    type: 'string',
    def: "'text'",
    desc: 'Input type for input surfaces.',
    purpose: 'Use email, search, url, tel, password, or another valid input type.',
    example: '<ForeFill as="input" inputType="email" />',
  },
  {
    name: 'helperClassName',
    type: 'string',
    def: '-',
    desc: 'Class for the inline helper.',
    purpose: 'Customize the helper that appears beside the ghost hint.',
    example: '<ForeFill showHelper helperClassName="reply-helper" />',
  },
  {
    name: 'rows',
    type: 'number',
    def: '3',
    desc: 'Visible textarea rows.',
    purpose: 'Only affects the textarea surface.',
    example: '<ForeFill as="textarea" rows={5} />',
  },
  {
    name: 'disabled',
    type: 'boolean',
    def: 'false',
    desc: 'Disables the editable surface.',
    purpose: 'Prevents input and suppresses interactive completion.',
    example: '<ForeFill disabled />',
  },
  {
    name: 'variant',
    type: "'outline' | 'filled' | 'underline'",
    def: "'outline'",
    desc: 'Visual style preset.',
    purpose: 'Choose the built-in border/fill treatment.',
    example: '<ForeFill variant="filled" />',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    def: "'md'",
    desc: 'Size preset.',
    purpose: 'Adjusts font size, padding, and minimum height.',
    example: '<ForeFill size="lg" />',
  },
  {
    name: 'matchMode',
    type: "'startsWith' | 'substring'",
    def: "'substring'",
    desc: 'Normal suggestion matching strategy.',
    purpose: 'Trigger suggestions always use startsWith; this controls the normal suggestions list.',
    example: '<ForeFill matchMode="startsWith" />',
  },
  {
    name: 'disableInlineFill',
    type: 'boolean',
    def: 'false',
    desc: 'Disables the ghost hint.',
    purpose: 'Keeps change/commit behavior but hides automatic inline completion.',
    example: '<ForeFill disableInlineFill />',
  },
  {
    name: 'enableArrowNavigation',
    type: 'boolean',
    def: 'true',
    desc: 'Allows Up/Down to cycle hints.',
    purpose: 'Turn this off if arrow keys must stay reserved for another editor behavior.',
    example: '<ForeFill enableArrowNavigation={false} />',
  },
  {
    name: 'minQueryLength',
    type: 'number',
    def: '1',
    desc: 'Characters before normal suggestions activate.',
    purpose: 'Trigger suggestions have their own optional minQueryLength.',
    example: '<ForeFill minQueryLength={3} />',
  },
  {
    name: 'debounceMs',
    type: 'number',
    def: '0',
    desc: 'Debounce delay for async suggestions.',
    purpose: 'Reduces network traffic while the user is typing.',
    example: '<ForeFill asyncSuggestions={fetchSuggestions} debounceMs={300} />',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    def: 'placeholder',
    desc: 'Accessible label for the field.',
    purpose: 'Use when the visual label is outside the component or absent.',
    example: '<ForeFill ariaLabel="Compose reply" />',
  },
  {
    name: 'ariaLabelledBy',
    type: 'string',
    def: '-',
    desc: 'ID of an external label element.',
    purpose: 'Use when a visible label should provide the accessible field name.',
    example: '<label id="reply-label">Reply</label><ForeFill ariaLabelledBy="reply-label" />',
  },
  {
    name: 'ariaDescribedBy',
    type: 'string',
    def: '-',
    desc: 'ID of external helper or error text.',
    purpose: 'Merged with ForeFill internal helper text when both are present.',
    example: '<ForeFill ariaDescribedBy="reply-error" status="error" />',
  },
  {
    name: 'showHelper',
    type: "boolean | 'idle'",
    def: 'false',
    desc: 'Controls inline helper visibility.',
    purpose: 'Show keyboard helper text immediately, after idle, or never.',
    example: '<ForeFill showHelper="idle" />',
  },
  {
    name: 'helperIdleMs',
    type: 'number',
    def: '900',
    desc: 'Idle delay before helper appears.',
    purpose: 'Only applies when showHelper is set to idle.',
    example: '<ForeFill showHelper="idle" helperIdleMs={1200} />',
  },
  {
    name: 'helperText',
    type: 'ReactNode',
    def: 'keycap helper',
    desc: 'Custom inline helper content.',
    purpose: 'Replace the built-in helper copy with your own React content.',
    example: '<ForeFill showHelper helperText="Tab accepts" />',
  },
  {
    name: 'defaultValue',
    type: 'string',
    def: "''",
    desc: 'Initial uncontrolled value.',
    purpose: 'ForeFill can still suggest newly appended text after this value.',
    example: '<ForeFill defaultValue="Existing text. " />',
  },
  {
    name: 'value',
    type: 'string',
    def: '-',
    desc: 'Controlled value.',
    purpose: 'Pair with onChange for fully controlled forms.',
    example: '<ForeFill value={value} onChange={setValue} />',
  },
  {
    name: 'status',
    type: "'idle' | 'loading' | 'success' | 'error'",
    def: '-',
    desc: 'Explicit visual status.',
    purpose: 'Shows loading, success, or error treatment; error also sets aria-invalid.',
    example: '<ForeFill status="error" />',
  },
  {
    name: 'theme',
    type: "'light' | 'dark'",
    def: '-',
    desc: 'Forces a color scheme.',
    purpose: 'Omit it to follow the OS preference or surrounding page theme.',
    example: '<ForeFill theme="dark" />',
  },
  {
    name: 'name',
    type: 'string',
    def: '-',
    desc: 'Native form name.',
    purpose: 'Forwarded to input and textarea for form submission.',
    example: '<ForeFill as="input" name="reply" />',
  },
  {
    name: 'id',
    type: 'string',
    def: '-',
    desc: 'Editable element id.',
    purpose: 'Pair with a label htmlFor value.',
    example: '<ForeFill id="reply" />',
  },
  {
    name: 'required',
    type: 'boolean',
    def: 'false',
    desc: 'Marks the field required.',
    purpose: 'Forwarded to input/textarea and reflected with aria-required.',
    example: '<ForeFill required />',
  },
  {
    name: 'readOnly',
    type: 'boolean',
    def: 'false',
    desc: 'Renders read-only and suppresses hints.',
    purpose: 'Show a value without allowing edits or completions.',
    example: '<ForeFill readOnly value="Saved reply" />',
  },
  {
    name: 'maxLength',
    type: 'number',
    def: '-',
    desc: 'Maximum character length.',
    purpose: 'Forwarded to input and textarea surfaces.',
    example: '<ForeFill maxLength={280} />',
  },
  {
    name: 'autoFocus',
    type: 'boolean',
    def: 'false',
    desc: 'Focuses the field on mount.',
    purpose: 'Useful for dialogs or focused writing tools.',
    example: '<ForeFill autoFocus />',
  },
  {
    name: 'acceptOnEnter',
    type: 'boolean',
    def: 'true',
    desc: 'Lets Enter accept visible hints.',
    purpose: 'When false, Enter commits typed text and Tab still accepts hints.',
    example: '<ForeFill acceptOnEnter={false} />',
  },
  {
    name: 'commitOnBlur',
    type: 'boolean',
    def: 'false',
    desc: 'Commits on blur.',
    purpose: 'Persist the current value when focus leaves the field.',
    example: '<ForeFill commitOnBlur onCommit={save} />',
  },
  {
    name: 'partialAccept',
    type: 'boolean',
    def: 'true',
    desc: 'Accept one word with Ctrl/Cmd + ArrowRight.',
    purpose: 'Lets users take long hints gradually.',
    example: '<ForeFill partialAccept={false} />',
  },
];

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getPageFromHash(): Page {
  if (typeof window === 'undefined') return 'hero';
  const hash = window.location.hash.replace(/^#/, '') || 'hero';
  if (hash === 'playground') return 'playground';
  if (hash === 'documentation' || isDocumentationHash(hash)) {
    return 'documentation';
  }
  return 'hero';
}

/** True when a hash targets the documentation page (a guide, a category, or a prop anchor). */
function isDocumentationHash(hash: string): boolean {
  if (GUIDE_SECTIONS.some((section) => section.id === hash)) return true;
  if (DOC_CATEGORIES.some((category) => category.id === hash)) return true;
  return DOC_CATEGORIES.some((category) => category.props.includes(hash));
}

function useHashPage(): Page {
  const [page, setPage] = useState<Page>(getPageFromHash);
  useEffect(() => {
    const onHash = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return page;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function useScrollHandoffProgress(targetRef: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const update = () => {
      frame = 0;
      const reduced = media?.matches ?? false;
      setPrefersReducedMotion(reduced);

      if (reduced) {
        setProgress(0);
        return;
      }

      const node = targetRef.current;
      if (!node) return;

      const top = node.getBoundingClientRect().top;
      const height = window.innerHeight || 1;
      const start = height * 0.92;
      const end = height * 0.25;
      const next = clamp01((start - top) / (start - end));

      setProgress((current) =>
        Math.abs(current - next) < 0.004 ? current : next
      );
    };

    const requestUpdate = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(update);
    };

    const handleMotionChange = () => requestUpdate();

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    media?.addEventListener?.('change', handleMotionChange);
    requestUpdate();

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      media?.removeEventListener?.('change', handleMotionChange);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [targetRef]);

  return { progress, prefersReducedMotion };
}

function useElementInView(targetRef: RefObject<Element>, threshold = 0.3) {
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(Boolean(entry?.isIntersecting)),
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef, threshold]);

  return isInView;
}

function useHeroTravel({
  heroAnchorRef,
  heroCardRef,
  targetCardRef,
  progress,
  prefersReducedMotion,
}: {
  heroAnchorRef: RefObject<HTMLDivElement>;
  heroCardRef: RefObject<HTMLDivElement>;
  targetCardRef: RefObject<HTMLDivElement>;
  progress: number;
  prefersReducedMotion: boolean;
}) {
  const [cardStyle, setCardStyle] = useState<HeroTravelStyle | null>(null);
  const [anchorHeight, setAnchorHeight] = useState<number | null>(null);

  useEffect(() => {
    const card = heroCardRef.current;
    if (!card) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height && height > 0) setAnchorHeight(height);
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [heroCardRef]);

  useEffect(() => {
    if (prefersReducedMotion || progress <= 0.004) {
      setCardStyle(null);
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const anchor = heroAnchorRef.current;
      const target = targetCardRef.current;
      if (!anchor || !target) {
        setCardStyle(null);
        return;
      }

      const from = anchor.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (from.width <= 0 || to.width <= 0) return;

      const t = clamp01(progress);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const fadeStart = 0.88;
      const fadeT = t < fadeStart ? 0 : (t - fadeStart) / (1 - fadeStart);
      const fadeEased = clamp01(fadeT);

      const width = lerp(from.width, to.width, eased);
      const top = lerp(from.top, to.top, eased);
      const left = lerp(from.left, to.left + (to.width - width) / 2, eased);
      const opacity = 1 - fadeEased;

      setCardStyle({
        position: 'fixed',
        top,
        left,
        width,
        opacity,
        pointerEvents: 'none',
        zIndex: 30,
      });
    };

    const requestUpdate = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [heroAnchorRef, heroCardRef, targetCardRef, progress, prefersReducedMotion]);

  return { cardStyle, anchorHeight };
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export default function App() {
  const page = useHashPage();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setIsPageLoading(true);
    const timer = window.setTimeout(
      () => setIsPageLoading(false),
      reduceMotion ? 280 : 1050
    );
    return () => window.clearTimeout(timer);
  }, [page]);

  return (
    <>
      <LoadingScreen visible={isPageLoading} />
      <div className="min-h-full bg-[#F7F8FB] font-sans text-[#07154D] antialiased dark:bg-[#10131A] dark:text-[#E7EDF7]">
        <TopNav
          page={page}
          theme={theme}
          onToggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
        />
        {page === 'hero' && <HeroPage theme={theme} />}
        {page === 'documentation' && <DocumentationPage theme={theme} />}
        {page === 'playground' && <PlaygroundPage theme={theme} />}
        <Footer />
      </div>
    </>
  );
}

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-50 grid place-items-center bg-[#F4F6FA] transition-opacity duration-500 dark:bg-[#0B0F16] ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="relative flex flex-col items-center gap-5">
        <LottieFromUrl
          src={LOT_URL}
          className="h-[150px] w-[260px] sm:h-[190px] sm:w-[330px]"
        />
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight">
            <span className="text-[#07154D] dark:text-white">Fore</span>
            <span className="bg-gradient-to-r from-[#6F84B2] via-[#8398C1] to-[#A2B2D2] bg-clip-text text-transparent">
              Fill
            </span>
          </p>
          <p className="mt-2 text-sm font-semibold text-[#6F84B2] dark:text-[#A2B2D2]">
            Loading inline autocomplete
          </p>
        </div>
      </div>
    </div>
  );
}

function TopNav({
  page,
  theme,
  onToggleTheme,
}: {
  page: Page;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#D7DEE9] bg-white/85 backdrop-blur dark:border-white/10 dark:bg-[#10131A]/85">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#hero" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="" className="h-8 w-14" />
          <span className="font-extrabold tracking-tight">
            Fore<span className="text-[#6F84B2]">Fill</span>
          </span>
          <span className="rounded bg-[#EEF2F8] px-1.5 py-0.5 text-[10px] font-bold text-[#6F84B2] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]">
            v{VERSION}
          </span>
        </a>

        <nav className="flex items-center gap-1 text-sm">
          {PAGE_LINKS.map((link) => (
            <a
              key={link.page}
              href={link.hash}
              aria-current={page === link.page ? 'page' : undefined}
              className={`rounded-md px-3 py-2 font-semibold transition ${
                page === link.page
                  ? 'bg-[#EEF2F8] text-[#07154D] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]'
                  : 'text-[#526078] hover:bg-[#EEF2F7] hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-md px-3 py-2 font-semibold text-[#526078] transition hover:bg-[#EEF2F7] hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:bg-white/10 dark:hover:text-white sm:inline-block"
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="ml-1 grid h-9 w-9 place-items-center rounded-md border border-[#D7DEE9] text-[#526078] transition hover:bg-[#EEF2F7] dark:border-white/10 dark:text-[#A8B3C7] dark:hover:bg-white/10"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}

function HeroPage({ theme }: { theme: ThemeMode }) {
  const heroAnchorRef = useRef<HTMLDivElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const liveSamplesRef = useRef<HTMLElement>(null);
  const triggerCardRef = useRef<HTMLDivElement>(null);
  const triggerSampleRef = useRef<ForeFillHandle>(null);
  const [isActivating, setIsActivating] = useState(false);
  const isHeroSampleInView = useElementInView(heroCardRef, 0.35);
  const { progress: handoffProgress, prefersReducedMotion } =
    useScrollHandoffProgress(liveSamplesRef);
  const { cardStyle: heroCardStyle, anchorHeight } = useHeroTravel({
    heroAnchorRef,
    heroCardRef,
    targetCardRef: triggerCardRef,
    progress: handoffProgress,
    prefersReducedMotion,
  });

  const handleHeroSampleActivate = useCallback(() => {
    setIsActivating(true);
    liveSamplesRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    window.setTimeout(
      () => {
        triggerSampleRef.current?.focus();
        setIsActivating(false);
      },
      prefersReducedMotion ? 120 : 900
    );
  }, [liveSamplesRef, prefersReducedMotion, triggerSampleRef]);

  const heroAnchorStyle = anchorHeight ? { height: anchorHeight } : undefined;

  return (
    <main id="hero">
      <section className="border-b border-[#D7DEE9] bg-[#F8FAFC] dark:border-white/10 dark:bg-[#11151D]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(31rem,1.1fr)] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-7">
              <span className="inline-flex rounded-md border border-[#D7DEE9] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#526078] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-[#A8B3C7]">
                React inline autocomplete
              </span>
            </div>

            <h1 className="text-5xl font-black tracking-tight text-[#07154D] dark:text-white sm:text-6xl">
              Fore<span className="text-[#6F84B2]">Fill</span>
            </h1>
            <p className="mt-4 max-w-xl text-xl font-extrabold leading-8 text-[#1F2A44] dark:text-[#DDE6F6]">
              Production-ready ghost text for React forms.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526078] dark:text-[#A8B3C7]">
              Add inline completions to inputs, textareas, and contenteditable editors with
              trigger-aware suggestions, async sources, and accessible keyboard
              behavior built in.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#documentation" className="inline-flex items-center gap-2 rounded-md bg-[#6F84B2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5A6F9C]">
                <BookOpen className="h-4 w-4" />
                Read the docs
              </a>
              <a href="#playground" className="inline-flex items-center gap-2 rounded-md border border-[#C9D3E1] bg-white px-4 py-2.5 text-sm font-bold text-[#07154D] transition hover:bg-[#EEF2F7] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                <Play className="h-4 w-4" />
                Open playground
              </a>
            </div>

            <div className="mt-9 grid gap-3 text-sm sm:grid-cols-3">
              {[
                ['Surfaces', 'input, textarea, contenteditable'],
                ['Suggestions', 'static, trigger, async'],
                ['Controls', 'keyboard-first by default'],
              ].map(([label, text]) => (
                <div key={label} className="border-l-2 border-[#A2B2D2] pl-3">
                  <p className="font-black text-[#07154D] dark:text-white">{label}</p>
                  <p className="mt-1 leading-5 text-[#526078] dark:text-[#A8B3C7]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="content-start lg:pl-4">
            <div ref={heroAnchorRef} style={heroAnchorStyle}>
              <div
                ref={heroCardRef}
                className="rounded-md outline-none transition-[box-shadow,opacity] duration-200"
                style={heroCardStyle ?? undefined}
              >
                <HeroTypingShowcase
                  theme={theme}
                  active={isHeroSampleInView && handoffProgress < 0.96 && !isActivating}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleHeroSampleActivate}
            aria-label="Scroll down to try the live ForeFill samples"
            className="group flex cursor-pointer flex-col items-center gap-1 rounded-md bg-transparent py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-[#6F84B2] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8FAFC] dark:focus-visible:ring-offset-[#11151D]"
            style={{ opacity: Math.max(0, 1 - handoffProgress * 3) }}
          >
            <ChevronDown className="ff-arrow-bounce h-7 w-7 text-[#6F84B2] transition group-hover:text-[#5A6F9C] dark:text-[#A2B2D2] dark:group-hover:text-white" />
            <span className="text-sm font-bold uppercase tracking-wider text-[#6F84B2] transition group-hover:text-[#5A6F9C] dark:text-[#A2B2D2] dark:group-hover:text-white">
              Try here
            </span>
          </button>
        </div>
      </section>

      <SampleSection
        theme={theme}
        sectionRef={liveSamplesRef}
        triggerCardRef={triggerCardRef}
        triggerSampleRef={triggerSampleRef}
        handoffProgress={handoffProgress}
        prefersReducedMotion={prefersReducedMotion}
      />

      <section className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8">
        <LottieFromUrl
          src={LOT_URL}
          className="h-[140px] w-[240px] sm:h-[180px] sm:w-[310px]"
        />
        <div>
          <p className="text-3xl font-black tracking-tight sm:text-4xl">
            <span className="text-[#07154D] dark:text-white">Fore</span>
            <span className="bg-gradient-to-r from-[#6F84B2] via-[#8398C1] to-[#A2B2D2] bg-clip-text text-transparent">
              Fill
            </span>
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-[#526078] dark:text-[#A8B3C7]">
            Type a little, let ForeFill finish the rest. Inline ghost-text
            autocomplete for React inputs, textareas, and contenteditable editors -
            trigger-aware, async-ready, and keyboard-first by default.
          </p>
        </div>
      </section>
    </main>
  );
}

function HeroTypingShowcase({
  theme,
  active = true,
}: {
  theme: ThemeMode;
  active?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState({ to: '', subject: '', body: '' });
  const toRef = useRef<ForeFillHandle>(null);
  const subjectRef = useRef<ForeFillHandle>(null);
  const bodyRef = useRef<ForeFillHandle>(null);
  const item = HERO_TYPING_ITEMS[index];
  const activeFieldLabel =
    item.field === 'to'
      ? 'Email domain'
      : item.field === 'subject'
        ? 'Subject line'
        : 'Reply text';

  useEffect(() => {
    if (!active) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timers.push(window.setTimeout(fn, reduceMotion ? Math.min(delay, 180) : delay));
    };

    if (index === 0) {
      setValues({ to: '', subject: '', body: '' });
    }
    setValues((current) => ({ ...current, [item.field]: '' }));
    schedule(() => {
      const activeRef =
        item.field === 'to'
          ? toRef
          : item.field === 'subject'
            ? subjectRef
            : bodyRef;
      activeRef.current?.focus();
    }, 100);

    const chars = Array.from(item.seed);
    chars.forEach((_, charIndex) => {
      schedule(
        () =>
          setValues((current) => ({
            ...current,
            [item.field]: item.seed.slice(0, charIndex + 1),
          })),
        360 + charIndex * 70
      );
    });

    const typedAt = 360 + chars.length * 70;
    schedule(() => {
      setValues((current) => ({ ...current, [item.field]: item.full }));
    }, typedAt + 1520);
    schedule(
      () => setIndex((current) => (current + 1) % HERO_TYPING_ITEMS.length),
      typedAt + 3100
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, index, item.field, item.full, item.seed]);

  return (
    <div className="overflow-hidden rounded-md border border-[#C4D0DE] bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1DBE8] bg-[#F8FAFD] px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F6C85F]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#6F84B2]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="text-[#6F84B2] dark:text-[#A2B2D2]">Live compose</span>
          <span className="rounded bg-[#EEF2F8] px-2 py-1 text-[#526078] dark:bg-white/10 dark:text-[#CAD3E3]">
            {activeFieldLabel}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <ComposeRow label="To">
          <ForeFill
            ref={toRef}
            as="input"
            inputType="email"
            value={values.to}
            onChange={(value) => setValues((current) => ({ ...current, to: value }))}
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="recipient@"
            ariaLabel="Compose recipient"
            showHelper={false}
            theme={theme}
          />
        </ComposeRow>

        <ComposeRow label="Subject">
          <ForeFill
            ref={subjectRef}
            as="input"
            value={values.subject}
            onChange={(value) =>
              setValues((current) => ({ ...current, subject: value }))
            }
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="Subject"
            ariaLabel="Compose subject"
            showHelper={false}
            theme={theme}
          />
        </ComposeRow>

        <div>
          <ForeFill
            ref={bodyRef}
            as="textarea"
            value={values.body}
            onChange={(value) => setValues((current) => ({ ...current, body: value }))}
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="Write the message..."
            ariaLabel="Compose message"
            rows={5}
            showHelper="idle"
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

function LiveEmailComposeSample({
  theme,
  firstFieldRef,
}: {
  theme: ThemeMode;
  firstFieldRef: RefObject<ForeFillHandle>;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[#C4D0DE] bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1DBE8] bg-[#F8FAFD] px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F6C85F]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#6F84B2]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="text-[#6F84B2] dark:text-[#A2B2D2]">Live sample</span>
            <span className="rounded bg-[#EEF2F8] px-2 py-1 text-[#526078] dark:bg-white/10 dark:text-[#CAD3E3]">
              Try it here
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <ComposeRow label="To">
            <ForeFill
              ref={firstFieldRef}
              as="input"
              inputType="email"
              suggestions={DEFAULT_SUGGESTIONS}
              triggerSuggestions={TRIGGER_PRESETS.all}
              placeholder="recipient@"
              ariaLabel="Live compose recipient"
              showHelper="idle"
              theme={theme}
            />
          </ComposeRow>

          <ComposeRow label="Subject">
            <ForeFill
              as="input"
              suggestions={DEFAULT_SUGGESTIONS}
              triggerSuggestions={TRIGGER_PRESETS.all}
              placeholder="Type Happy"
              ariaLabel="Live compose subject"
              showHelper="idle"
              theme={theme}
            />
          </ComposeRow>

          <ForeFill
            as="textarea"
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="Write the message..."
            ariaLabel="Live compose message"
            rows={5}
            showHelper="idle"
            theme={theme}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-[#526078] dark:text-[#A8B3C7]">
        Try <Code>@g</Code> in To, <Code>Happy</Code> in Subject, or{' '}
        <Code>Thanks</Code> in the message.
      </p>
    </div>
  );
}

function ComposeRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3 border-b border-[#E5EAF2] pb-3 dark:border-white/10">
      <span className="text-sm font-bold text-[#6F84B2] dark:text-[#A2B2D2]">
        {label}
      </span>
      {children}
    </div>
  );
}

function SampleSection({
  theme,
  sectionRef,
  triggerCardRef,
  triggerSampleRef,
  handoffProgress,
  prefersReducedMotion,
}: {
  theme: ThemeMode;
  sectionRef: RefObject<HTMLElement>;
  triggerCardRef: RefObject<HTMLDivElement>;
  triggerSampleRef: RefObject<ForeFillHandle>;
  handoffProgress: number;
  prefersReducedMotion: boolean;
}) {
  const sectionOpacity = prefersReducedMotion ? 1 : clamp01((handoffProgress - 0.88) / 0.12);
  const sectionPointerEvents: 'auto' | 'none' = sectionOpacity >= 1 ? 'auto' : 'none';

  return (
    <section
      id="live-samples"
      ref={sectionRef}
      className="scroll-mt-24 border-b border-[#D7DEE9] bg-[#F7F8FB] px-4 py-12 transition-opacity duration-200 ease-out sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#10131A]"
      style={{ opacity: sectionOpacity, pointerEvents: sectionPointerEvents }}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
            Live samples
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#07154D] dark:text-white">
            Try the email compose sample
          </h2>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <div ref={triggerCardRef}>
            <LiveEmailComposeSample
              theme={theme}
              firstFieldRef={triggerSampleRef}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type DemoValue = string | number | boolean;

type PropControl =
  | { kind: 'boolean'; default: boolean }
  | { kind: 'select'; options: string[]; default: string }
  | { kind: 'number'; default: number; min?: number; max?: number }
  | { kind: 'text'; default: string };

interface PropDemo {
  /** Optional live control letting the reader change this prop's value. */
  control?: PropControl;
  render: (value: DemoValue) => ReactNode;
  code: (value: DemoValue) => string;
}

interface DocCategory {
  id: string;
  label: string;
  icon: ReactNode;
  blurb: string;
  props: string[];
}

type DemoEvent = 'onChange' | 'onCommit' | 'onAccept' | 'onDismiss';

const PROP_BY_NAME: Record<string, ApiProp> = Object.fromEntries(
  API_PROPS.map((prop) => [prop.name, prop])
);

const DOC_CATEGORIES: DocCategory[] = [
  {
    id: 'cat-surfaces',
    label: 'Surfaces & content',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    blurb: 'Choose the editable surface and seed its starting content.',
    props: ['as', 'rows', 'inputType', 'placeholder', 'defaultValue', 'value'],
  },
  {
    id: 'cat-suggestions',
    label: 'Suggestions & matching',
    icon: <WandSparkles className="h-5 w-5" />,
    blurb: 'Where completions come from and how the typed query is matched.',
    props: [
      'suggestions',
      'triggerSuggestions',
      'asyncSuggestions',
      'matchMode',
      'minQueryLength',
      'debounceMs',
    ],
  },
  {
    id: 'cat-behavior',
    label: 'Inline behavior',
    icon: <Zap className="h-5 w-5" />,
    blurb: 'Tune how the ghost hint appears and how it is accepted.',
    props: [
      'disableInlineFill',
      'enableArrowNavigation',
      'acceptOnEnter',
      'commitOnBlur',
      'partialAccept',
    ],
  },
  {
    id: 'cat-helper',
    label: 'Helper',
    icon: <Sparkles className="h-5 w-5" />,
    blurb: 'The inline keyboard hint shown next to the ghost.',
    props: ['showHelper', 'helperIdleMs', 'helperText'],
  },
  {
    id: 'cat-status',
    label: 'Status',
    icon: <Check className="h-5 w-5" />,
    blurb: 'Surface loading, success, and error states with assistive announcements.',
    props: ['status'],
  },
  {
    id: 'cat-appearance',
    label: 'Appearance',
    icon: <Sun className="h-5 w-5" />,
    blurb: 'Built-in visual presets and color scheme.',
    props: ['variant', 'size', 'theme', 'disabled'],
  },
  {
    id: 'cat-events',
    label: 'Events',
    icon: <Play className="h-5 w-5" />,
    blurb: 'Callbacks for every meaningful moment. Type in each field to watch them fire.',
    props: ['onChange', 'onCommit', 'onAccept', 'onDismiss'],
  },
  {
    id: 'cat-form',
    label: 'Form & native',
    icon: <Clipboard className="h-5 w-5" />,
    blurb: 'Native attributes forwarded to the input or textarea for form submission.',
    props: ['name', 'id', 'required', 'readOnly', 'maxLength', 'autoFocus'],
  },
  {
    id: 'cat-styling',
    label: 'Styling hooks',
    icon: <Code2 className="h-5 w-5" />,
    blurb: 'Class hooks for the root, editor, helper, and accessible labels.',
    props: [
      'className',
      'editorClassName',
      'helperClassName',
      'ariaLabel',
      'ariaLabelledBy',
      'ariaDescribedBy',
    ],
  },
];

const PROP_DEMOS: Record<string, PropDemo> = {
  // ----- Surfaces & content -------------------------------------------------
  as: {
    control: { kind: 'select', options: ['textarea', 'input', 'contenteditable'], default: 'input' },
    render: (value) => (
      <ForeFill
        as={value as ForeFillSurface}
        suggestions={DEFAULT_SUGGESTIONS}
        placeholder={`${value} - type 'Thanks'`}
        showHelper="idle"
        className={value === 'contenteditable' ? 'ff-contenteditable-demo' : undefined}
        editorClassName={value === 'contenteditable' ? 'ff-contenteditable-demo__editor' : undefined}
      />
    ),
    code: (value) => `<ForeFill as="${value}" suggestions={suggestions} />`,
  },
  rows: {
    control: { kind: 'number', default: 4, min: 1, max: 12 },
    render: (value) => (
      <ForeFill as="textarea" rows={value as number} suggestions={DEFAULT_SUGGESTIONS} placeholder="Type 'Looking'" showHelper="idle" />
    ),
    code: (value) => `<ForeFill as="textarea" rows={${value}} suggestions={suggestions} />`,
  },
  inputType: {
    control: { kind: 'select', options: ['text', 'email', 'search', 'url', 'tel', 'password'], default: 'email' },
    render: (value) => (
      <ForeFill as="input" inputType={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder={`type="${value}"`} showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" inputType="${value}" />`,
  },
  placeholder: {
    control: { kind: 'text', default: 'Write a reply...' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} placeholder={String(value)} showHelper="idle" />
    ),
    code: (value) => `<ForeFill placeholder="${value}" suggestions={suggestions} />`,
  },
  defaultValue: {
    control: { kind: 'text', default: 'Happy to help — let me take a look. ' },
    render: (value) => (
      <ForeFill key={String(value)} defaultValue={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Type 'Thanks' after the saved text" showHelper="idle" />
    ),
    code: (value) => `<ForeFill defaultValue="${value}" suggestions={suggestions} />`,
  },
  value: {
    render: () => <ControlledValueDemo />,
    code: () => `const [value, setValue] = useState('');

<ForeFill value={value} onChange={setValue} suggestions={suggestions} />`,
  },

  // ----- Suggestions & matching ---------------------------------------------
  suggestions: {
    render: () => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} placeholder="Type 'Thanks' or 'Looking'" showHelper="idle" />
    ),
    code: () => `const suggestions = [
  'Thanks so much for reaching out!',
  'Looking forward to hearing from you.',
];

<ForeFill suggestions={suggestions} />`,
  },
  triggerSuggestions: {
    control: { kind: 'select', options: ['all', 'email', 'happy', 'symbols', 'none'], default: 'all' },
    render: (value) => (
      <ForeFill as="input" triggerSuggestions={getTriggersForMode(value as TriggerMode)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Type @g, $t, & sh, or Happy" showHelper="idle" />
    ),
    code: (value) =>
      value === 'none'
        ? `<ForeFill as="input" suggestions={suggestions} />`
        : `// '${value}' preset
<ForeFill as="input" triggerSuggestions={triggers} />`,
  },
  asyncSuggestions: {
    control: { kind: 'boolean', default: true },
    render: (value) =>
      value ? (
        <AsyncDemo debounceMs={250} />
      ) : (
        <ForeFill suggestions={DEFAULT_SUGGESTIONS} placeholder="Static suggestions — type 'Thanks'" showHelper="idle" />
      ),
    code: (value) =>
      value
        ? `<ForeFill
  debounceMs={250}
  asyncSuggestions={async (query, { signal }) => {
    const res = await fetch('/api/suggest?q=' + query, { signal });
    return res.json();
  }}
/>`
        : `<ForeFill suggestions={suggestions} />`,
  },
  matchMode: {
    control: { kind: 'select', options: ['substring', 'startsWith'], default: 'startsWith' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} matchMode={value as ForeFillMatchMode} placeholder="Type 'Thanks'" showHelper="idle" />
    ),
    code: (value) => `<ForeFill matchMode="${value}" suggestions={suggestions} />`,
  },
  minQueryLength: {
    control: { kind: 'number', default: 3, min: 1, max: 10 },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} minQueryLength={value as number} placeholder={`Hints after ${value} characters`} showHelper="idle" />
    ),
    code: (value) => `<ForeFill minQueryLength={${value}} suggestions={suggestions} />`,
  },
  debounceMs: {
    control: { kind: 'number', default: 300, min: 0, max: 2000 },
    render: (value) => <AsyncDemo debounceMs={value as number} />,
    code: (value) => `<ForeFill debounceMs={${value}} asyncSuggestions={fetchSuggestions} />`,
  },

  // ----- Inline behavior ----------------------------------------------------
  disableInlineFill: {
    control: { kind: 'boolean', default: false },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} disableInlineFill={value as boolean} placeholder="Type 'Thanks'" showHelper="idle" />
    ),
    code: (value) => `<ForeFill disableInlineFill={${value}} suggestions={suggestions} />`,
  },
  enableArrowNavigation: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} enableArrowNavigation={value as boolean} placeholder="Type 'Th', then press Up / Down" showHelper="idle" />
    ),
    code: (value) => `<ForeFill enableArrowNavigation={${value}} suggestions={suggestions} />`,
  },
  acceptOnEnter: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} acceptOnEnter={value as boolean} placeholder="Type 'Thanks', then Enter" showHelper="idle" />
    ),
    code: (value) => `<ForeFill acceptOnEnter={${value}} suggestions={suggestions} />`,
  },
  commitOnBlur: {
    control: { kind: 'boolean', default: true },
    render: (value) => <CommitOnBlurDemo enabled={value as boolean} />,
    code: (value) => `<ForeFill commitOnBlur={${value}} onCommit={save} suggestions={suggestions} />`,
  },
  partialAccept: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} partialAccept={value as boolean} showHelper placeholder="Type 'Let', then Ctrl / Cmd + →" />
    ),
    code: (value) => `<ForeFill partialAccept={${value}} suggestions={suggestions} />`,
  },

  // ----- Helper -------------------------------------------------------------
  showHelper: {
    control: { kind: 'select', options: ['idle', 'true', 'false'], default: 'idle' },
    render: (value) => (
      <ForeFill
        suggestions={DEFAULT_SUGGESTIONS}
        showHelper={value === 'true' ? true : value === 'false' ? false : 'idle'}
        placeholder="Type 'Thanks'"
      />
    ),
    code: (value) =>
      value === 'idle'
        ? `<ForeFill showHelper="idle" suggestions={suggestions} />`
        : `<ForeFill showHelper={${value}} suggestions={suggestions} />`,
  },
  helperIdleMs: {
    control: { kind: 'number', default: 900, min: 0, max: 5000 },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} showHelper="idle" helperIdleMs={value as number} placeholder="Type, then pause" />
    ),
    code: (value) => `<ForeFill showHelper="idle" helperIdleMs={${value}} suggestions={suggestions} />`,
  },
  helperText: {
    control: { kind: 'text', default: '↹ Tab to accept' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} showHelper helperText={String(value)} placeholder="Type 'Thanks'" />
    ),
    code: (value) => `<ForeFill showHelper helperText="${value}" suggestions={suggestions} />`,
  },

  // ----- Status -------------------------------------------------------------
  status: {
    control: { kind: 'select', options: ['idle', 'loading', 'success', 'error'], default: 'success' },
    render: (value) => (
      <ForeFill
        suggestions={DEFAULT_SUGGESTIONS}
        status={value === 'idle' ? undefined : (value as 'loading' | 'success' | 'error')}
        placeholder="Type 'Thanks'"
        showHelper="idle"
      />
    ),
    code: (value) =>
      value === 'idle'
        ? `<ForeFill suggestions={suggestions} />`
        : `<ForeFill status="${value}" suggestions={suggestions} />`,
  },

  // ----- Appearance ---------------------------------------------------------
  variant: {
    control: { kind: 'select', options: ['outline', 'filled', 'underline'], default: 'filled' },
    render: (value) => (
      <ForeFill as="input" suggestions={DEFAULT_SUGGESTIONS} variant={value as ForeFillVariant} placeholder={`variant="${value}"`} showHelper={false} />
    ),
    code: (value) => `<ForeFill variant="${value}" suggestions={suggestions} />`,
  },
  size: {
    control: { kind: 'select', options: ['sm', 'md', 'lg'], default: 'lg' },
    render: (value) => (
      <ForeFill as="input" suggestions={DEFAULT_SUGGESTIONS} size={value as ForeFillSize} placeholder={`size="${value}"`} showHelper={false} />
    ),
    code: (value) => `<ForeFill size="${value}" suggestions={suggestions} />`,
  },
  theme: {
    control: { kind: 'select', options: ['light', 'dark'], default: 'dark' },
    render: (value) => (
      <div
        data-theme={String(value)}
        className={value === 'dark' ? 'rounded-md bg-[#10131A] p-3' : 'rounded-md border border-[#D7DEE9] bg-white p-3'}
      >
        <ForeFill suggestions={DEFAULT_SUGGESTIONS} theme={value as 'light' | 'dark'} placeholder="Type 'Thanks'" showHelper="idle" />
      </div>
    ),
    code: (value) => `<ForeFill theme="${value}" suggestions={suggestions} />`,
  },
  disabled: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} disabled={value as boolean} defaultValue="You can't edit this when disabled" />
    ),
    code: (value) => `<ForeFill disabled={${value}} defaultValue="…" />`,
  },

  // ----- Events -------------------------------------------------------------
  onChange: {
    render: () => <EventReadoutDemo event="onChange" />,
    code: () => `<ForeFill onChange={(value) => console.log(value)} suggestions={suggestions} />`,
  },
  onCommit: {
    render: () => <EventReadoutDemo event="onCommit" />,
    code: () => `<ForeFill onCommit={(value) => save(value)} suggestions={suggestions} />`,
  },
  onAccept: {
    render: () => <EventReadoutDemo event="onAccept" />,
    code: () => `<ForeFill
  onAccept={(value, suggestion) => track(suggestion)}
  suggestions={suggestions}
/>`,
  },
  onDismiss: {
    render: () => <EventReadoutDemo event="onDismiss" />,
    code: () => `<ForeFill onDismiss={() => track('dismissed')} suggestions={suggestions} />`,
  },

  // ----- Form & native ------------------------------------------------------
  name: {
    control: { kind: 'text', default: 'reply' },
    render: (value) => (
      <ForeFill as="input" name={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder={`Submitted as '${value}'`} showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" name="${value}" />`,
  },
  id: {
    control: { kind: 'text', default: 'reply-field' },
    render: (value) => (
      <div className="space-y-1.5">
        <label htmlFor={String(value)} className="block text-xs font-bold text-[#526078] dark:text-[#A8B3C7]">
          Reply
        </label>
        <ForeFill as="input" id={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Paired with a <label htmlFor>" showHelper={false} />
      </div>
    ),
    code: (value) => `<label htmlFor="${value}">Reply</label>
<ForeFill as="input" id="${value}" />`,
  },
  required: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill as="input" required={value as boolean} suggestions={DEFAULT_SUGGESTIONS} placeholder="Required field" showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" required={${value}} />`,
  },
  readOnly: {
    control: { kind: 'boolean', default: true },
    render: (value) => (
      <ForeFill readOnly={value as boolean} suggestions={DEFAULT_SUGGESTIONS} defaultValue="Saved reply — toggle readOnly to edit" />
    ),
    code: (value) => `<ForeFill readOnly={${value}} value="Saved reply" />`,
  },
  maxLength: {
    control: { kind: 'number', default: 20, min: 1, max: 200 },
    render: (value) => (
      <ForeFill as="input" maxLength={value as number} suggestions={DEFAULT_SUGGESTIONS} placeholder={`Stops at ${value} characters`} showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" maxLength={${value}} />`,
  },
  autoFocus: {
    control: { kind: 'boolean', default: false },
    render: (value) => (
      <ForeFill key={String(value)} as="input" autoFocus={value as boolean} suggestions={DEFAULT_SUGGESTIONS} placeholder="Toggle true to focus on mount" showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" autoFocus={${value}} />`,
  },

  // ----- Styling hooks ------------------------------------------------------
  className: {
    control: { kind: 'text', default: '[--ff-accent:#0e9f6e]' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} className={String(value)} placeholder="Type 'Thanks'" showHelper="idle" />
    ),
    code: (value) => `<ForeFill className="${value}" suggestions={suggestions} />`,
  },
  editorClassName: {
    control: { kind: 'text', default: 'font-mono' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} editorClassName={String(value)} placeholder="Type 'Thanks'" showHelper="idle" />
    ),
    code: (value) => `<ForeFill editorClassName="${value}" suggestions={suggestions} />`,
  },
  helperClassName: {
    control: { kind: 'text', default: 'uppercase tracking-wide' },
    render: (value) => (
      <ForeFill suggestions={DEFAULT_SUGGESTIONS} showHelper helperClassName={String(value)} placeholder="Type 'Thanks'" />
    ),
    code: (value) => `<ForeFill showHelper helperClassName="${value}" suggestions={suggestions} />`,
  },
  ariaLabel: {
    control: { kind: 'text', default: 'Compose reply' },
    render: (value) => (
      <ForeFill as="input" ariaLabel={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Inspect the field's aria-label" showHelper={false} />
    ),
    code: (value) => `<ForeFill as="input" ariaLabel="${value}" />`,
  },
  ariaLabelledBy: {
    control: { kind: 'text', default: 'reply-label' },
    render: (value) => (
      <div className="space-y-2">
        <label id={String(value)} className="block text-sm font-bold text-[#33415C] dark:text-[#CAD3E3]">
          Visible reply label
        </label>
        <ForeFill as="input" ariaLabelledBy={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Type 'Thanks'" showHelper={false} />
      </div>
    ),
    code: (value) => `<label id="${value}">Reply</label>\n<ForeFill as="input" ariaLabelledBy="${value}" />`,
  },
  ariaDescribedBy: {
    control: { kind: 'text', default: 'reply-help' },
    render: (value) => (
      <div className="space-y-2">
        <ForeFill as="input" ariaDescribedBy={String(value)} suggestions={DEFAULT_SUGGESTIONS} placeholder="Type 'Thanks'" showHelper="idle" />
        <p id={String(value)} className="text-xs text-[#526078] dark:text-[#A8B3C7]">
          External helper text is merged with ForeFill's helper when visible.
        </p>
      </div>
    ),
    code: (value) => `<ForeFill as="input" ariaDescribedBy="${value}" showHelper="idle" />`,
  },
};

function DemoReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#D7DEE9] bg-[#F7F8FB] px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
      <span className="shrink-0 font-mono font-bold text-[#6F84B2] dark:text-[#A2B2D2]">{label}</span>
      <span className="truncate font-medium text-[#33415C] dark:text-[#CAD3E3]">{value}</span>
    </div>
  );
}

function ControlledValueDemo() {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-2">
      <ForeFill
        suggestions={DEFAULT_SUGGESTIONS}
        value={value}
        onChange={setValue}
        placeholder="Controlled — type 'Thanks'"
        showHelper="idle"
      />
      <DemoReadout label="value" value={value || '(empty)'} />
    </div>
  );
}

function AsyncDemo({ debounceMs = 250 }: { debounceMs?: number }) {
  const fetchSuggestions = useCallback(async (
    query: string,
    { signal }: { signal?: AbortSignal } = {}
  ) => {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const timer = window.setTimeout(resolve, 350);
      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    });
    return DEFAULT_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(query.toLowerCase())
    );
  }, []);
  return (
    <ForeFill
      asyncSuggestions={fetchSuggestions}
      debounceMs={debounceMs}
      placeholder="Type 'help' — fetched after a short delay"
      showHelper="idle"
    />
  );
}

function CommitOnBlurDemo({ enabled }: { enabled: boolean }) {
  const [committed, setCommitted] = useState('(blur the field to commit)');
  return (
    <div className="space-y-2">
      <ForeFill
        suggestions={DEFAULT_SUGGESTIONS}
        commitOnBlur={enabled}
        onCommit={(value) => setCommitted(value || '(empty)')}
        placeholder="Type, then click away"
        showHelper="idle"
      />
      <DemoReadout label="committed on blur" value={committed} />
    </div>
  );
}

function EventReadoutDemo({ event }: { event: DemoEvent }) {
  const [last, setLast] = useState('(nothing yet)');
  return (
    <div className="space-y-2">
      <ForeFill
        suggestions={DEFAULT_SUGGESTIONS}
        placeholder="Type 'Thanks', then Tab / Enter / Esc"
        showHelper="idle"
        onChange={event === 'onChange' ? (value) => setLast(value || '(empty)') : undefined}
        onCommit={event === 'onCommit' ? (value) => setLast(`committed: ${value || '(empty)'}`) : undefined}
        onAccept={event === 'onAccept' ? (_value, suggestion) => setLast(`accepted: ${suggestion}`) : undefined}
        onDismiss={event === 'onDismiss' ? () => setLast('dismissed with Esc') : undefined}
      />
      <DemoReadout label={event} value={last} />
    </div>
  );
}

function Badge({ children, tone = 'type' }: { children: ReactNode; tone?: 'type' | 'muted' }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
        tone === 'type'
          ? 'bg-[#EEF2F8] text-[#33415C] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]'
          : 'border border-[#D7DEE9] text-[#708096] dark:border-white/10 dark:text-[#A8B3C7]'
      }`}
    >
      {children}
    </span>
  );
}

function ExampleCard({
  children,
  code,
  filename = 'App.tsx',
}: {
  children: ReactNode;
  code: string;
  filename?: string;
}) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  return (
    <div className="overflow-hidden rounded-md border border-[#D7DEE9] bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      <div
        role="tablist"
        aria-label="Example view"
        className="flex items-center gap-1 border-b border-[#E6EBF2] bg-[#F8FAFD] px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"
      >
        {(['preview', 'code'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value ? 'true' : 'false'}
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
              tab === value
                ? 'bg-white text-[#07154D] shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-[#708096] hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:text-white'
            }`}
          >
            {value}
          </button>
        ))}
        {tab === 'preview' && (
          <span className="ml-auto pr-1 text-[10px] font-bold uppercase tracking-wider text-[#9AA7BC] dark:text-[#7C8AA3]">
            Live example
          </span>
        )}
      </div>
      {tab === 'preview' ? <div className="p-4">{children}</div> : <CodeBlock code={code} filename={filename} compact />}
    </div>
  );
}

function PropControlBar({
  name,
  control,
  value,
  onChange,
}: {
  name: string;
  control: PropControl;
  value: DemoValue;
  onChange: (value: DemoValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-[#C9D3E1] bg-[#F8FAFD] px-3 py-2 dark:border-white/15 dark:bg-white/[0.03]">
      <span className="font-mono text-xs font-bold text-[#6F84B2] dark:text-[#A2B2D2]">{name}</span>
      <span className="text-sm text-[#9AA7BC]">=</span>
      <div className="min-w-[7rem] flex-1">
        {control.kind === 'boolean' && (
          <Toggle checked={value as boolean} onChange={onChange} labels={['true', 'false']} />
        )}
        {control.kind === 'select' && (
          <Select value={String(value)} onChange={onChange} options={control.options} />
        )}
        {control.kind === 'number' && (
          <NumberInput value={value as number} min={control.min} max={control.max} onChange={onChange} />
        )}
        {control.kind === 'text' && <TextInput value={String(value)} onChange={onChange} />}
      </div>
    </div>
  );
}

function PropSubsection({ name }: { name: string }) {
  const demo = PROP_DEMOS[name];
  const [value, setValue] = useState<DemoValue>(() => demo?.control?.default ?? '');
  const prop = PROP_BY_NAME[name];
  if (!prop || !demo) return null;
  return (
    <div id={name} className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-lg font-extrabold text-[#07154D] dark:text-white">{name}</h3>
        <Badge>{prop.type}</Badge>
        <Badge tone="muted">default: {prop.def}</Badge>
      </div>
      <p className="text-sm leading-6">
        <span className="font-semibold text-[#33415C] dark:text-[#CAD3E3]">{prop.desc}</span>{' '}
        {prop.purpose}
      </p>
      <ExampleCard code={demo.code(value)}>
        <div className="space-y-3">
          {demo.control && (
            <PropControlBar name={name} control={demo.control} value={value} onChange={setValue} />
          )}
          {demo.render(value)}
        </div>
      </ExampleCard>
    </div>
  );
}

function PropCategory({ category }: { category: DocCategory }) {
  return (
    <DocSection id={category.id} title={category.label} icon={category.icon}>
      <p>{category.blurb}</p>
      <div className="space-y-10 pt-2">
        {category.props.map((name) => (
          <PropSubsection key={name} name={name} />
        ))}
      </div>
    </DocSection>
  );
}

function DocNavLink({ href, children, mono }: { href: string; children: ReactNode; mono?: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded-md px-2 py-1 text-[#526078] transition hover:bg-[#EEF2F7] hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:bg-white/10 dark:hover:text-white ${
        mono ? 'font-mono text-[13px]' : 'text-sm font-semibold'
      }`}
    >
      {children}
    </a>
  );
}

function DocNavGroup({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <div>
      {href ? (
        <a
          href={href}
          className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#708096] transition hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:text-white"
        >
          {title}
        </a>
      ) : (
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#708096] dark:text-[#A8B3C7]">
          {title}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DocSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)]">
      <nav
        aria-label="Documentation navigation"
        className="max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto rounded-md border border-[#D7DEE9] bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
      >
        <p className="text-xs font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
          On this page
        </p>
        <DocNavGroup title="Guides">
          {GUIDE_SECTIONS.map((section) => (
            <DocNavLink key={section.id} href={`#${section.id}`}>
              {section.label}
            </DocNavLink>
          ))}
        </DocNavGroup>
        {DOC_CATEGORIES.map((category) => (
          <DocNavGroup key={category.id} title={category.label} href={`#${category.id}`}>
            {category.props.map((name) => (
              <DocNavLink key={name} href={`#${name}`} mono>
                {name}
              </DocNavLink>
            ))}
          </DocNavGroup>
        ))}
      </nav>
    </aside>
  );
}

function DocMobileNav() {
  return (
    <div className="sticky top-16 z-30 -mx-4 mb-8 border-y border-[#D7DEE9] bg-[#F7F8FB]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden dark:border-white/10 dark:bg-[#10131A]/95">
      <nav
        aria-label="Mobile documentation navigation"
        className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
      >
        {GUIDE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 rounded-md border border-[#D7DEE9] bg-white px-3 py-1.5 text-xs font-bold text-[#526078] shadow-sm transition hover:border-[#A2B2D2] hover:text-[#07154D] dark:border-white/10 dark:bg-white/5 dark:text-[#A8B3C7] dark:hover:text-white"
          >
            {section.label}
          </a>
        ))}
        {DOC_CATEGORIES.map((category) => (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="shrink-0 rounded-md border border-[#D7DEE9] bg-white px-3 py-1.5 text-xs font-bold text-[#526078] shadow-sm transition hover:border-[#A2B2D2] hover:text-[#07154D] dark:border-white/10 dark:bg-white/5 dark:text-[#A8B3C7] dark:hover:text-white"
          >
            {category.label}
          </a>
        ))}
      </nav>

      <label
        htmlFor="doc-prop-jump"
        className="mt-2 block text-[10px] font-black uppercase tracking-wider text-[#708096] dark:text-[#A8B3C7]"
      >
        Jump to API prop
      </label>
      <select
        id="doc-prop-jump"
        defaultValue=""
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (!next) return;
          window.location.hash = next;
          event.currentTarget.value = '';
        }}
        className="mt-1 w-full rounded-md border border-[#C9D3E1] bg-white px-3 py-2 text-sm font-semibold text-[#07154D] outline-none transition focus:border-[#6F84B2] focus:ring-2 focus:ring-[#6F84B2]/20 dark:border-white/15 dark:bg-[#151923] dark:text-white"
      >
        <option value="" disabled>
          Select a prop
        </option>
        {API_PROPS.map((prop) => (
          <option key={prop.name} value={prop.name}>
            {prop.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocumentationPage({ theme }: { theme: ThemeMode }) {
  return (
    <main
      id="documentation"
      data-theme={theme}
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <DocMobileNav />

      <div className="flex items-start gap-8">
        <DocSidebar />

        <div className="min-w-0 flex-1 space-y-14">
          <header className="border-b border-[#D7DEE9] pb-8 dark:border-white/10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
                  Documentation
                </p>
                <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-[#07154D] dark:text-white sm:text-4xl">
                  Build production-ready inline autocomplete
                </h1>
                <p className="mt-4 max-w-3xl leading-7 text-[#526078] dark:text-[#A8B3C7]">
                  Start with a static list, add trigger completions or async data, then tune
                  behavior, styling, accessibility, and native form integration from the live
                  API reference.
                </p>
              </div>
              <a href="#quick-start" className="inline-flex w-fit items-center gap-2 rounded-md border border-[#C9D3E1] bg-white px-4 py-2.5 text-sm font-bold text-[#07154D] transition hover:bg-[#EEF2F7] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                <Sparkles className="h-4 w-4" />
                Quick start
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {DOC_OVERVIEW.map((item, index) => (
                <div key={item.title} className="rounded-md border border-[#D7DEE9] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <span className="font-mono text-xs font-black text-[#6F84B2] dark:text-[#A2B2D2]">
                    0{index + 1}
                  </span>
                  <h2 className="mt-2 font-black text-[#07154D] dark:text-white">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#526078] dark:text-[#A8B3C7]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </header>
        <DocSection id="installation" title="Installation" icon={<Clipboard className="h-5 w-5" />}>
          <p>Install the package and import the stylesheet once near your application root.</p>
          <CodeBlock code={`npm install ${PKG}`} filename="terminal" />
          <CodeBlock
            filename="App.tsx"
            code={`import { ForeFill } from '${PKG}';
import '${PKG}/styles.css';`}
          />
        </DocSection>

        <DocSection id="quick-start" title="Quick start" icon={<Sparkles className="h-5 w-5" />}>
          <p>
            Pass a suggestion list, render the field, and handle the committed value.
            The same pattern works for controlled or uncontrolled form state.
          </p>
          <ExampleCard
            filename="ReplyBox.tsx"
            code={`const replies = [
  'Thanks so much for reaching out!',
  'Happy to help — let me take a look.',
  'Let me know if you have any questions.',
];

<ForeFill
  suggestions={replies}
  placeholder="Write a reply..."
  showHelper="idle"
  onCommit={(value) => console.log(value)}
/>`}
          >
            <ForeFill suggestions={DEFAULT_SUGGESTIONS} placeholder="Write a reply..." showHelper="idle" />
          </ExampleCard>
        </DocSection>

        <DocSection id="trigger-suggestions" title="Trigger suggestions" icon={<WandSparkles className="h-5 w-5" />}>
          <p>
            Configure symbols or words as completion triggers. Trigger suggestions keep the
            trigger text in place and replace only the query typed after it.
          </p>
          <ExampleCard
            filename="Triggers.tsx"
            code={`<ForeFill
  as="input"
  triggerSuggestions={[
    { trigger: '@', suggestions: ['gmail.com', 'yahoo.com'] },
    { trigger: '$', suggestions: ['total', 'subtotal', 'tax'] },
    { trigger: 'Happy', suggestions: [' Birthday!'] },
  ]}
/>`}
          >
            <ForeFill
              as="input"
              triggerSuggestions={TRIGGER_PRESETS.all}
              placeholder="Type @g, $t, & sh, or Happy"
              showHelper="idle"
            />
          </ExampleCard>
        </DocSection>

        <DocSection id="existing-values" title="Existing values" icon={<Zap className="h-5 w-5" />}>
          <p>
            When a field already contains text, ForeFill treats newly appended text as the
            active query. Accepting a suggestion preserves the saved prefix.
          </p>
          <ExampleCard
            filename="ExistingValue.tsx"
            code={`<ForeFill
  defaultValue="Happy to help — let me take a look. "
  suggestions={['Thanks so much for reaching out!']}
/>`}
          >
            <ForeFill
              defaultValue="Happy to help — let me take a look. "
              suggestions={DEFAULT_SUGGESTIONS}
              placeholder="Type 'Thanks' after the saved text"
              showHelper="idle"
            />
          </ExampleCard>
        </DocSection>

        <DocSection id="async-suggestions" title="Async suggestions" icon={<Code2 className="h-5 w-5" />}>
          <p>
            Async fetchers receive the active query and can be debounced to limit network
            traffic. Loading state is reflected visually and through ARIA.
          </p>
          <ExampleCard
            filename="Async.tsx"
            code={`<ForeFill
  debounceMs={250}
  asyncSuggestions={async (query, { signal }) => {
    const res = await fetch(
      '/api/suggestions?q=' + encodeURIComponent(query),
      { signal }
    );
    return res.json();
  }}
/>`}
          >
            <AsyncDemo debounceMs={250} />
          </ExampleCard>
        </DocSection>

        <DocSection id="surfaces" title="Surfaces" icon={<SlidersHorizontal className="h-5 w-5" />}>
          <p>Use the same completion behavior across textarea, input, and contenteditable surfaces.</p>
          <ExampleCard
            code={`<ForeFill as="textarea" suggestions={data} />
<ForeFill as="input" suggestions={data} />
<ForeFill as="contenteditable" suggestions={data} />`}
          >
            <div className="space-y-3">
              <ForeFill as="textarea" rows={2} suggestions={DEFAULT_SUGGESTIONS} placeholder="textarea — type 'Thanks'" showHelper={false} />
              <ForeFill as="input" suggestions={DEFAULT_SUGGESTIONS} placeholder="input — type 'Thanks'" showHelper={false} />
              <ForeFill
                as="contenteditable"
                suggestions={DEFAULT_SUGGESTIONS}
                placeholder="contenteditable - type 'Thanks'"
                showHelper={false}
                className="ff-contenteditable-demo"
                editorClassName="ff-contenteditable-demo__editor"
              />
            </div>
          </ExampleCard>
        </DocSection>

        <DocSection id="styling" title="Styling" icon={<Sun className="h-5 w-5" />}>
          <p>
            Use the built-in variants and sizes, or override CSS custom properties through
            className. The shipped stylesheet is plain CSS.
          </p>
          <ExampleCard
            code={`/* Override design tokens on the root via className */
<ForeFill className="[--ff-accent:#2e7d73]" />`}
          >
            <ForeFill
              suggestions={DEFAULT_SUGGESTIONS}
              className="[--ff-accent:#2e7d73]"
              placeholder="Custom accent — type 'Thanks'"
              showHelper="idle"
            />
          </ExampleCard>
          <CodeBlock
            filename="theme.css"
            code={`.my-forefill {
  --ff-accent: #2e7d73;
  --ff-radius: 8px;
  --ff-font: Inter, sans-serif;
}`}
          />
        </DocSection>

        <DocSection id="accessibility" title="Accessibility" icon={<Check className="h-5 w-5" />}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              'aria-autocomplete is inline.',
              'Loading and active suggestions are announced politely.',
              'Escape dismisses visible suggestions.',
              'Read-only, required, busy, and error states are reflected with ARIA.',
            ].map((item) => (
              <li key={item} className="rounded-md border border-[#D7DEE9] bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5">
                {item}
              </li>
            ))}
          </ul>
        </DocSection>

        <div className="border-t border-[#E6EBF2] pt-10 dark:border-white/10">
          <p className="text-sm font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
            API reference
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#07154D] dark:text-white">
            All {API_PROPS.length} props, grouped and live
          </h2>
          <p className="mt-2 max-w-2xl text-[#526078] dark:text-[#A8B3C7]">
            Each prop includes its type, default, usage notes, and a focused example you can
            preview or copy.
          </p>
        </div>

        {DOC_CATEGORIES.map((category) => (
          <PropCategory key={category.id} category={category} />
        ))}
        </div>
      </div>
    </main>
  );
}

function PlaygroundPage({ theme }: { theme: ThemeMode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Playground theme={theme} />
    </main>
  );
}

function Playground({ theme }: { theme: ThemeMode }) {
  const [committed, setCommitted] = useState('');
  const [eventLog, setEventLog] = useState<PlaygroundEvent[]>([]);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [s, setS] = useState<PlaygroundState>(PLAYGROUND_DEFAULT_STATE);
  const eventIdRef = useRef(0);

  const set = useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) =>
      setS((prev) => ({ ...prev, [key]: value })),
    []
  );

  const recordEvent = useCallback((name: string, value = '') => {
    eventIdRef.current += 1;
    setEventLog((prev) =>
      [
        {
          id: eventIdRef.current,
          name,
          value: value || 'empty',
        },
        ...prev,
      ].slice(0, 6)
    );
  }, []);

  const applyPreset = useCallback((preset: PlaygroundPreset) => {
    setS({ ...PLAYGROUND_DEFAULT_STATE, ...preset.state });
    setSuggestions(preset.suggestions ?? DEFAULT_SUGGESTIONS);
    setCommitted('');
    setEventLog([]);
  }, []);

  const triggerSuggestions = useMemo(
    () => getTriggersForMode(s.triggerMode),
    [s.triggerMode]
  );

  const asyncFetcher = useMemo(
    () =>
      s.asyncMode
        ? async (
            query: string,
            { signal }: { signal?: AbortSignal } = {}
          ) => {
            await new Promise<void>((resolve, reject) => {
              if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
              }
              const timer = window.setTimeout(resolve, 350);
              signal?.addEventListener(
                'abort',
                () => {
                  window.clearTimeout(timer);
                  reject(new DOMException('Aborted', 'AbortError'));
                },
                { once: true }
              );
            });
            return DEFAULT_SUGGESTIONS.filter((item) =>
              item.toLowerCase().includes(query.toLowerCase())
            );
          }
        : undefined,
    [s.asyncMode]
  );

  const generatedCode = useMemo(
    () => buildForeFillCode(s, suggestions, triggerSuggestions),
    [s, suggestions, triggerSuggestions]
  );

  return (
    <section id="playground" className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
          Live Playground
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[#07154D] dark:text-white">
          Configure every ForeFill API
        </h1>
      </div>

      <Panel title="Use-case presets">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PLAYGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="min-h-[6.25rem] rounded-md border border-[#D7DEE9] bg-[#F8FAFD] p-3 text-left transition hover:border-[#6F84B2] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F84B2] dark:border-white/10 dark:bg-white/5 dark:hover:border-[#A2B2D2] dark:hover:bg-white/10"
            >
              <span className="block text-sm font-black text-[#07154D] dark:text-white">
                {preset.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#526078] dark:text-[#A8B3C7]">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Preview">
          <ForeFill
            as={s.as}
            suggestions={suggestions}
            triggerSuggestions={triggerSuggestions}
            asyncSuggestions={asyncFetcher}
            variant={s.variant}
            size={s.size}
            matchMode={s.matchMode}
            minQueryLength={s.minQueryLength}
            debounceMs={s.debounceMs}
            disableInlineFill={s.disableInlineFill}
            enableArrowNavigation={s.enableArrowNavigation}
            acceptOnEnter={s.acceptOnEnter}
            commitOnBlur={s.commitOnBlur}
            partialAccept={s.partialAccept}
            showHelper={
              s.showHelper === 'true'
                ? true
                : s.showHelper === 'false'
                  ? false
                  : 'idle'
            }
            helperIdleMs={s.helperIdleMs}
            helperText={s.helperText || undefined}
            status={s.status === 'idle' ? undefined : s.status}
            placeholder={s.placeholder}
            rows={s.rows}
            inputType={s.inputType}
            ariaLabel={s.ariaLabel || undefined}
            name={s.name || undefined}
            id={s.id || undefined}
            required={s.required}
            readOnly={s.readOnly}
            maxLength={s.maxLength > 0 ? s.maxLength : undefined}
            autoFocus={s.autoFocus}
            disabled={s.disabled}
            theme={s.themeChoice === 'auto' ? theme : s.themeChoice}
            className={s.as === 'contenteditable' ? 'ff-contenteditable-demo' : undefined}
            editorClassName={s.as === 'contenteditable' ? 'ff-contenteditable-demo__editor' : undefined}
            onChange={(value) => recordEvent('onChange', value)}
            onCommit={(value) => {
              setCommitted(value);
              recordEvent('onCommit', value);
            }}
            onAccept={(_value, suggestion) =>
              recordEvent('onAccept', suggestion)
            }
            onDismiss={() => recordEvent('onDismiss')}
          />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <StatusBox label="Committed value" value={committed || 'none'} />
            <EventLog events={eventLog} />
          </div>
        </Panel>

        <Panel title="Generated code">
          <CodeBlock filename="App.tsx" code={generatedCode} compact />
        </Panel>
      </div>

      <Panel title="Controls">
        <div className="space-y-7">
          <ControlGroup title="Surface">
            <Control name="as" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.as} onChange={(value) => set('as', value as ForeFillSurface)} options={['textarea', 'input', 'contenteditable']} />
            </Control>
            <Control name="rows" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <NumberInput value={s.rows} min={1} max={12} onChange={(value) => set('rows', Math.max(1, value))} />
            </Control>
            <Control name="inputType" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.inputType} onChange={(value) => set('inputType', value)} options={['text', 'email', 'search', 'url', 'tel', 'password']} />
            </Control>
            <Control name="placeholder" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.placeholder} onChange={(value) => set('placeholder', value)} />
            </Control>
            <Control name="ariaLabel" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.ariaLabel} onChange={(value) => set('ariaLabel', value)} />
            </Control>
          </ControlGroup>

          <ControlGroup title="Suggestions">
            <Control name="triggerSuggestions" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.triggerMode} onChange={(value) => set('triggerMode', value as TriggerMode)} options={['all', 'email', 'happy', 'symbols', 'none']} />
            </Control>
            <Control name="suggestions" openHelp={openHelp} setOpenHelp={setOpenHelp} wide>
              <SuggestionEditor suggestions={suggestions} setSuggestions={setSuggestions} />
            </Control>
            <Control name="asyncSuggestions" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Toggle checked={s.asyncMode} onChange={(value) => set('asyncMode', value)} labels={['on', 'off']} />
            </Control>
          </ControlGroup>

          <ControlGroup title="Matching">
            <Control name="matchMode" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.matchMode} onChange={(value) => set('matchMode', value as ForeFillMatchMode)} options={['substring', 'startsWith']} />
            </Control>
            <Control name="minQueryLength" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <NumberInput value={s.minQueryLength} min={1} max={10} onChange={(value) => set('minQueryLength', Math.max(1, value))} />
            </Control>
            <Control name="debounceMs" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <NumberInput value={s.debounceMs} min={0} max={2000} onChange={(value) => set('debounceMs', Math.max(0, value))} />
            </Control>
          </ControlGroup>

          <ControlGroup title="Behavior">
            {[
              ['disableInlineFill', s.disableInlineFill, (value: boolean) => set('disableInlineFill', value)],
              ['enableArrowNavigation', s.enableArrowNavigation, (value: boolean) => set('enableArrowNavigation', value)],
              ['acceptOnEnter', s.acceptOnEnter, (value: boolean) => set('acceptOnEnter', value)],
              ['commitOnBlur', s.commitOnBlur, (value: boolean) => set('commitOnBlur', value)],
              ['partialAccept', s.partialAccept, (value: boolean) => set('partialAccept', value)],
            ].map(([name, checked, onChange]) => (
              <Control key={name as string} name={name as string} openHelp={openHelp} setOpenHelp={setOpenHelp}>
                <Toggle checked={checked as boolean} onChange={onChange as (value: boolean) => void} labels={['on', 'off']} />
              </Control>
            ))}
          </ControlGroup>

          <ControlGroup title="Helper and Status">
            <Control name="showHelper" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.showHelper} onChange={(value) => set('showHelper', value as ShowHelperMode)} options={['idle', 'true', 'false']} />
            </Control>
            <Control name="helperIdleMs" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <NumberInput value={s.helperIdleMs} min={0} max={5000} onChange={(value) => set('helperIdleMs', Math.max(0, value))} />
            </Control>
            <Control name="helperText" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.helperText} placeholder="built-in" onChange={(value) => set('helperText', value)} />
            </Control>
            <Control name="status" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.status} onChange={(value) => set('status', value as StatusMode)} options={['idle', 'loading', 'success', 'error']} />
            </Control>
          </ControlGroup>

          <ControlGroup title="Appearance and Form">
            <Control name="variant" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.variant} onChange={(value) => set('variant', value as ForeFillVariant)} options={['outline', 'filled', 'underline']} />
            </Control>
            <Control name="size" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.size} onChange={(value) => set('size', value as ForeFillSize)} options={['sm', 'md', 'lg']} />
            </Control>
            <Control name="theme" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Select value={s.themeChoice} onChange={(value) => set('themeChoice', value as ThemeChoice)} options={['auto', 'light', 'dark']} />
            </Control>
            <Control name="name" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.name} onChange={(value) => set('name', value)} />
            </Control>
            <Control name="id" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.id} onChange={(value) => set('id', value)} />
            </Control>
            <Control name="maxLength" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <NumberInput value={s.maxLength} min={0} max={1000} onChange={(value) => set('maxLength', Math.max(0, value))} />
            </Control>
            {[
              ['required', s.required, (value: boolean) => set('required', value)],
              ['readOnly', s.readOnly, (value: boolean) => set('readOnly', value)],
              ['autoFocus', s.autoFocus, (value: boolean) => set('autoFocus', value)],
              ['disabled', s.disabled, (value: boolean) => set('disabled', value)],
            ].map(([name, checked, onChange]) => (
              <Control key={name as string} name={name as string} openHelp={openHelp} setOpenHelp={setOpenHelp}>
                <Toggle checked={checked as boolean} onChange={onChange as (value: boolean) => void} labels={['on', 'off']} />
              </Control>
            ))}
          </ControlGroup>
        </div>
      </Panel>

      <Panel title="API Reference">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#D7DEE9] text-xs uppercase tracking-wider text-[#708096] dark:border-white/10 dark:text-[#A8B3C7]">
                <th className="py-3 pr-4 font-bold">Prop</th>
                <th className="py-3 pr-4 font-bold">Type</th>
                <th className="py-3 pr-4 font-bold">Default</th>
                <th className="py-3 font-bold">Use and example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EBF2] dark:divide-white/10">
              {API_PROPS.map((prop) => (
                <tr key={prop.name} className="align-top">
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[13px] font-bold text-[#07154D] dark:text-[#A2B2D2]">
                    {prop.name}
                  </td>
                  <td className="max-w-[19rem] py-3 pr-4 font-mono text-xs text-[#526078] dark:text-[#A8B3C7]">
                    {prop.type}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-[#526078] dark:text-[#A8B3C7]">
                    {prop.def}
                  </td>
                  <td className="py-3 text-[#33415C] dark:text-[#CAD3E3]">
                    <p className="font-medium text-[#1F2A44] dark:text-white">{prop.desc}</p>
                    <p className="mt-1 text-xs leading-5 text-[#526078] dark:text-[#A8B3C7]">{prop.purpose}</p>
                    <code className="mt-2 block max-w-[28rem] overflow-x-auto rounded-md border border-[#D7DEE9] bg-[#F8FAFD] px-2 py-1.5 font-mono text-[11px] text-[#07154D] dark:border-white/10 dark:bg-white/5 dark:text-[#DDE6F6]">
                      {prop.example}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

function getTriggersForMode(mode: TriggerMode): ForeFillTriggerSuggestion[] | undefined {
  if (mode === 'none') return undefined;
  return TRIGGER_PRESETS[mode];
}

function buildForeFillCode(
  s: PlaygroundState,
  suggestions: string[],
  triggerSuggestions: ForeFillTriggerSuggestion[] | undefined
): string {
  const lines: string[] = [];
  const str = (name: string, value: string) => lines.push(`      ${name}=${JSON.stringify(value)}`);
  const raw = (name: string, value: string) => lines.push(`      ${name}={${value}}`);
  const flag = (name: string) => lines.push(`      ${name}`);
  const includeSuggestions = !s.asyncMode && suggestions.length > 0;

  if (includeSuggestions) raw('suggestions', 'suggestions');
  if (triggerSuggestions) raw('triggerSuggestions', 'triggerSuggestions');
  if (s.asyncMode) raw('asyncSuggestions', 'fetchSuggestions');
  if (s.as !== 'textarea') str('as', s.as);
  if (s.placeholder) str('placeholder', s.placeholder);
  if (s.as === 'textarea' && s.rows !== 3) raw('rows', String(s.rows));
  if (s.as === 'input' && s.inputType !== 'text') str('inputType', s.inputType);
  if (s.ariaLabel) str('ariaLabel', s.ariaLabel);
  if (s.variant !== 'outline') str('variant', s.variant);
  if (s.size !== 'md') str('size', s.size);
  if (s.themeChoice !== 'auto') str('theme', s.themeChoice);
  if (s.matchMode !== 'substring') str('matchMode', s.matchMode);
  if (s.minQueryLength !== 1) raw('minQueryLength', String(s.minQueryLength));
  if (s.debounceMs !== 0) raw('debounceMs', String(s.debounceMs));
  if (s.disableInlineFill) flag('disableInlineFill');
  if (!s.enableArrowNavigation) raw('enableArrowNavigation', 'false');
  if (!s.acceptOnEnter) raw('acceptOnEnter', 'false');
  if (s.commitOnBlur) flag('commitOnBlur');
  if (!s.partialAccept) raw('partialAccept', 'false');
  if (s.showHelper === 'true') flag('showHelper');
  if (s.showHelper === 'idle') str('showHelper', 'idle');
  if (s.helperIdleMs !== 900) raw('helperIdleMs', String(s.helperIdleMs));
  if (s.helperText) str('helperText', s.helperText);
  if (s.status !== 'idle') str('status', s.status);
  if (s.name) str('name', s.name);
  if (s.id) str('id', s.id);
  if (s.required) flag('required');
  if (s.readOnly) flag('readOnly');
  if (s.maxLength > 0) raw('maxLength', String(s.maxLength));
  if (s.autoFocus) flag('autoFocus');
  if (s.disabled) flag('disabled');
  raw('value', 'value');
  raw('onChange', 'setValue');
  raw('onCommit', "(nextValue) => console.log('committed', nextValue)");

  const suggestionBlock = includeSuggestions
    ? `const suggestions = ${JSON.stringify(suggestions, null, 2)};\n\n`
    : '';

  const triggerBlock = triggerSuggestions
    ? `const triggerSuggestions = ${JSON.stringify(triggerSuggestions, null, 2)};\n\n`
    : '';

  const asyncBlock = s.asyncMode
    ? `const fetchSuggestions = async (
  query: string,
  { signal }: { signal?: AbortSignal } = {}
) => {
  const response = await fetch(
    \`/api/suggestions?q=\${encodeURIComponent(query)}\`,
    { signal }
  );
  return response.json() as Promise<string[]>;
};

`
    : '';

  return `import { useState } from 'react';
import { ForeFill } from 'forefill';
import 'forefill/styles.css';

${suggestionBlock}${triggerBlock}${asyncBlock}export default function App() {
  const [value, setValue] = useState('');

  return (
    <ForeFill
${lines.join('\n')}
    />
  );
}`;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[#D7DEE9] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-[#526078] dark:text-[#A8B3C7]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DocSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#EEF2F8] text-[#6F84B2] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]">
          {icon}
        </span>
        <h2 className="text-2xl font-black tracking-tight text-[#07154D] dark:text-white">
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-[#526078] dark:text-[#A8B3C7]">{children}</div>
    </section>
  );
}

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}

function Control({
  name,
  children,
  openHelp,
  setOpenHelp,
  wide,
}: {
  name: string;
  children: ReactNode;
  openHelp: string | null;
  setOpenHelp: (name: string | null) => void;
  wide?: boolean;
}) {
  const prop = API_PROPS.find((item) => item.name === name);
  return (
    <div className={`group relative flex flex-col gap-1.5 ${wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <div className="flex min-h-5 items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#526078] dark:text-[#A8B3C7]">
          {name}
        </span>
        {prop && (
          <HelpTip
            prop={prop}
            open={openHelp === name}
            onToggle={() => setOpenHelp(openHelp === name ? null : name)}
          />
        )}
      </div>
      {children}
    </div>
  );
}

function HelpTip({
  prop,
  open,
  onToggle,
}: {
  prop: ApiProp;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Explain ${prop.name}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) onToggle();
        }}
        className={`grid h-5 w-5 place-items-center rounded-full border border-[#C9D3E1] text-[#708096] transition hover:border-[#6F84B2] hover:text-[#6F84B2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F84B2] dark:border-white/15 dark:text-[#A8B3C7] ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-20 w-72 rounded-md border border-[#D7DEE9] bg-white p-3 text-left text-xs leading-5 text-[#33415C] shadow-lg dark:border-white/10 dark:bg-[#151923] dark:text-[#CAD3E3]">
          <strong className="mb-1 block text-[#07154D] dark:text-white">{prop.name}</strong>
          {prop.purpose}
          <code className="mt-2 block rounded border border-[#D7DEE9] bg-[#F8FAFD] px-2 py-1.5 font-mono text-[11px] text-[#07154D] dark:border-white/10 dark:bg-white/5 dark:text-[#DDE6F6]">
            {prop.example}
          </code>
          <span className="mt-2 block font-mono text-[11px] text-[#708096] dark:text-[#A8B3C7]">
            Default: {prop.def}
          </span>
        </span>
      )}
    </span>
  );
}

const INPUT_CLASS =
  'w-full rounded-md border border-[#C9D3E1] bg-white px-2.5 py-2 text-sm text-[#07154D] outline-none transition focus:border-[#6F84B2] focus:ring-2 focus:ring-[#6F84B2]/20 dark:border-white/15 dark:bg-white/5 dark:text-white';

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={INPUT_CLASS}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(Number.isFinite(next) ? next : 0);
      }}
      className={INPUT_CLASS}
    />
  );
}

function Toggle({
  checked,
  onChange,
  labels,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  labels: [string, string];
}) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#C9D3E1] bg-white px-2.5 text-sm font-semibold text-[#33415C] dark:border-white/15 dark:bg-white/5 dark:text-[#CAD3E3]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#6F84B2]"
      />
      {checked ? labels[0] : labels[1]}
    </label>
  );
}

function SuggestionEditor({
  suggestions,
  setSuggestions,
}: {
  suggestions: string[];
  setSuggestions: (next: string[] | ((prev: string[]) => string[])) => void;
}) {
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem('suggestion') as HTMLInputElement | null;
          const value = input?.value.trim();
          if (!value) return;
          setSuggestions((prev) => (prev.includes(value) ? prev : [...prev, value]));
          if (input) input.value = '';
        }}
      >
        <input name="suggestion" type="text" placeholder="Add a suggestion" className={INPUT_CLASS} />
        <button type="submit" className="rounded-md bg-[#6F84B2] px-3 text-sm font-bold text-white transition hover:bg-[#5A6F9C]">
          Add
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setSuggestions((prev) => prev.filter((item) => item !== suggestion))}
            className="max-w-[14rem] truncate rounded-md border border-[#D7DEE9] bg-[#F7F8FB] px-2 py-1 text-left text-xs text-[#526078] transition hover:border-[#6F84B2] hover:text-[#6F84B2] dark:border-white/10 dark:bg-white/5 dark:text-[#A8B3C7]"
            title="Remove suggestion"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#D7DEE9] bg-[#F7F8FB] p-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-[10px] font-black uppercase tracking-wider text-[#708096] dark:text-[#A8B3C7]">
        {label}
      </span>
      <p className="mt-1 break-words text-sm font-semibold text-[#07154D] dark:text-white">{value}</p>
    </div>
  );
}

function EventLog({ events }: { events: PlaygroundEvent[] }) {
  return (
    <div className="rounded-md border border-[#D7DEE9] bg-[#F7F8FB] p-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-[10px] font-black uppercase tracking-wider text-[#708096] dark:text-[#A8B3C7]">
        Event log
      </span>
      <div className="mt-2 space-y-1.5">
        {events.length === 0 ? (
          <p className="text-sm font-semibold text-[#07154D] dark:text-white">none</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="grid grid-cols-[5.75rem_1fr] gap-2 text-xs">
              <span className="font-mono font-bold text-[#6F84B2] dark:text-[#A2B2D2]">
                {event.name}
              </span>
              <span className="truncate text-[#33415C] dark:text-[#CAD3E3]" title={event.value}>
                {event.value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CodeBlock({
  code,
  filename = 'tsx',
  compact,
}: {
  code: string;
  filename?: string;
  compact?: boolean;
}) {
  const { copied, copy } = useCopy();
  return (
    <div className="overflow-hidden rounded-md border border-[#1E293B] bg-[#111827] text-left shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-xs text-[#93A4B8]">{filename}</span>
        <button
          type="button"
          onClick={() => copy(code)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#CAD3E3] transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={`overflow-x-auto font-mono text-[13px] leading-relaxed text-[#E5E7EB] ${compact ? 'max-h-[28rem]' : ''} px-4 py-4`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-[#EEF2F8] px-1.5 py-0.5 font-mono text-[0.85em] text-[#07154D] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]">
      {children}
    </code>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#D7DEE9] dark:border-white/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#526078] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-[#A8B3C7]">
        <span>{PKG} {VERSION} - MIT License</span>
        <span className="flex gap-4">
          <a href="#documentation" className="hover:text-[#07154D] dark:hover:text-white">Documentation</a>
          <a href="#playground" className="hover:text-[#07154D] dark:hover:text-white">Playground</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-[#07154D] dark:hover:text-white">GitHub</a>
        </span>
      </div>
    </footer>
  );
}

function LottieFromUrl({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setData(json as object);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={className} role="img" aria-label="ForeFill loading animation">
      {data && (
        <Lottie
          animationData={data}
          autoplay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, []);
  return { copied, copy };
}
