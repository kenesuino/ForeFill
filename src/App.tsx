import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Lottie from 'lottie-react';
import {
  BookOpen,
  Check,
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
  type ForeFillMatchMode,
  type ForeFillSize,
  type ForeFillSurface,
  type ForeFillTriggerSuggestion,
  type ForeFillVariant,
} from './lib';

const PKG = 'forefill';
const VERSION = '0.1.0';
const REPO_URL = 'https://github.com/your-org/forefill';
const THEME_KEY = 'forefill-theme';
const LOT_URL = '/ForeFill.json';

type Page = 'hero' | 'documentation' | 'playground';
type ThemeMode = 'light' | 'dark';
type ThemeChoice = 'auto' | 'light' | 'dark';
type ShowHelperMode = 'idle' | 'true' | 'false';
type StatusMode = 'idle' | 'loading' | 'success' | 'error';
type TriggerMode = 'all' | 'email' | 'happy' | 'symbols' | 'none';

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
  previewActive: boolean;
  acceptOnEnter: boolean;
  commitOnBlur: boolean;
  partialAccept: boolean;
  showHelper: ShowHelperMode;
  helperIdleMs: number;
  helperText: string;
  status: StatusMode;
  statusMessage: string;
  invalid: boolean;
  name: string;
  id: string;
  required: boolean;
  readOnly: boolean;
  maxLength: number;
  form: string;
  autoFocus: boolean;
  autoComplete: string;
  spellCheck: boolean;
  disabled: boolean;
}

interface ApiProp {
  name: string;
  type: string;
  def: string;
  desc: string;
  purpose: string;
}

const PAGE_LINKS: Array<{ page: Page; hash: string; label: string }> = [
  { page: 'hero', hash: '#hero', label: 'Hero' },
  { page: 'documentation', hash: '#documentation', label: 'Documentation' },
  { page: 'playground', hash: '#playground', label: 'Playground' },
];

const DOC_LINKS = [
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'trigger-suggestions', label: 'Trigger suggestions' },
  { id: 'existing-values', label: 'Existing values' },
  { id: 'async-suggestions', label: 'Async suggestions' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'styling', label: 'Styling' },
  { id: 'accessibility', label: 'Accessibility' },
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
    type: "'textarea' | 'input' | 'textbox' | 'richtext'",
    def: "'textarea'",
    desc: 'Editable surface to render.',
    purpose: 'Switches between multiline text, single-line input, and a plain-text contenteditable surface.',
  },
  {
    name: 'suggestions',
    type: 'string[]',
    def: '[]',
    desc: 'Static suggestion list.',
    purpose: 'The normal phrase list used when no trigger completion is active.',
  },
  {
    name: 'triggerSuggestions',
    type: 'ForeFillTriggerSuggestion[]',
    def: '[]',
    desc: 'Custom trigger completions for symbols or words.',
    purpose: 'Use this for @ domains, $ variables, & snippets, or word triggers like Happy -> " Birthday!".',
  },
  {
    name: 'asyncSuggestions',
    type: '(query: string) => Promise<string[]>',
    def: '-',
    desc: 'Async suggestion source. Overrides suggestions.',
    purpose: 'Receives the active typed query, including appended text after an existing value.',
  },
  {
    name: 'onCommit',
    type: '(value: string) => void',
    def: '-',
    desc: 'Runs when a value is committed.',
    purpose: 'Persist the final field value after Enter, Tab, or blur when commitOnBlur is enabled.',
  },
  {
    name: 'onChange',
    type: '(value: string) => void',
    def: '-',
    desc: 'Runs on every value change.',
    purpose: 'Use this for controlled state or analytics on typed text.',
  },
  {
    name: 'onAccept',
    type: '(value: string, suggestion: string) => void',
    def: '-',
    desc: 'Runs only when a suggestion is accepted.',
    purpose: 'Track suggestion adoption separately from plain commits.',
  },
  {
    name: 'onDismiss',
    type: '() => void',
    def: '-',
    desc: 'Runs when Escape hides a visible hint.',
    purpose: 'Measure or react to explicit suggestion dismissal.',
  },
  {
    name: 'placeholder',
    type: 'string',
    def: "'Type to search...'",
    desc: 'Editable surface placeholder.',
    purpose: 'Sets the native placeholder or richtext placeholder text.',
  },
  {
    name: 'className',
    type: 'string',
    def: '-',
    desc: 'Class for the root wrapper.',
    purpose: 'Attach layout classes or CSS variable overrides to the component root.',
  },
  {
    name: 'editorClassName',
    type: 'string',
    def: '-',
    desc: 'Class for the editable surface.',
    purpose: 'Style the textarea, input, or richtext element directly.',
  },
  {
    name: 'textareaClassName',
    type: 'string',
    def: '-',
    desc: 'Alias for editorClassName.',
    purpose: 'Kept for compatibility with textarea-era integrations.',
  },
  {
    name: 'inputType',
    type: 'string',
    def: "'text'",
    desc: 'Input type for input/textbox surfaces.',
    purpose: 'Use email, search, url, tel, password, or another valid input type.',
  },
  {
    name: 'helperClassName',
    type: 'string',
    def: '-',
    desc: 'Class for the inline helper.',
    purpose: 'Customize the helper that appears beside the ghost hint.',
  },
  {
    name: 'helperStyle',
    type: 'CSSProperties',
    def: '-',
    desc: 'Inline styles for the helper.',
    purpose: 'Apply one-off helper styling without a CSS class.',
  },
  {
    name: 'helperKeyClassName',
    type: 'string',
    def: '-',
    desc: 'Class for built-in keycaps.',
    purpose: 'Customize the Tab, Enter, Esc, and arrow keycap treatment.',
  },
  {
    name: 'rows',
    type: 'number',
    def: '3',
    desc: 'Visible textarea rows.',
    purpose: 'Only affects the textarea surface.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    def: 'false',
    desc: 'Disables the editable surface.',
    purpose: 'Prevents input and suppresses interactive completion.',
  },
  {
    name: 'variant',
    type: "'outline' | 'filled' | 'underline'",
    def: "'outline'",
    desc: 'Visual style preset.',
    purpose: 'Choose the built-in border/fill treatment.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    def: "'md'",
    desc: 'Size preset.',
    purpose: 'Adjusts font size, padding, and minimum height.',
  },
  {
    name: 'matchMode',
    type: "'startsWith' | 'substring'",
    def: "'substring'",
    desc: 'Normal suggestion matching strategy.',
    purpose: 'Trigger suggestions always use startsWith; this controls the normal suggestions list.',
  },
  {
    name: 'disableInlineFill',
    type: 'boolean',
    def: 'false',
    desc: 'Disables the ghost hint.',
    purpose: 'Keeps change/commit behavior but hides automatic inline completion.',
  },
  {
    name: 'previewActive',
    type: 'boolean',
    def: 'false',
    desc: 'Shows ghost hints while unfocused.',
    purpose: 'Useful for demos that drive a controlled value without stealing focus.',
  },
  {
    name: 'enableArrowNavigation',
    type: 'boolean',
    def: 'true',
    desc: 'Allows Up/Down to cycle hints.',
    purpose: 'Turn this off if arrow keys must stay reserved for another editor behavior.',
  },
  {
    name: 'minQueryLength',
    type: 'number',
    def: '1',
    desc: 'Characters before normal suggestions activate.',
    purpose: 'Trigger suggestions have their own optional minQueryLength.',
  },
  {
    name: 'debounceMs',
    type: 'number',
    def: '0',
    desc: 'Debounce delay for async suggestions.',
    purpose: 'Reduces network traffic while the user is typing.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    def: 'placeholder',
    desc: 'Accessible label for the field.',
    purpose: 'Use when the visual label is outside the component or absent.',
  },
  {
    name: 'showHelper',
    type: "boolean | 'idle'",
    def: 'false',
    desc: 'Controls inline helper visibility.',
    purpose: 'Show keyboard helper text immediately, after idle, or never.',
  },
  {
    name: 'helperIdleMs',
    type: 'number',
    def: '900',
    desc: 'Idle delay before helper appears.',
    purpose: 'Only applies when showHelper is set to idle.',
  },
  {
    name: 'helperText',
    type: 'ReactNode',
    def: 'keycap helper',
    desc: 'Custom inline helper content.',
    purpose: 'Replace the built-in helper copy with your own React content.',
  },
  {
    name: 'defaultValue',
    type: 'string',
    def: "''",
    desc: 'Initial uncontrolled value.',
    purpose: 'ForeFill can still suggest newly appended text after this value.',
  },
  {
    name: 'value',
    type: 'string',
    def: '-',
    desc: 'Controlled value.',
    purpose: 'Pair with onChange for fully controlled forms.',
  },
  {
    name: 'invalid',
    type: 'boolean',
    def: 'false',
    desc: 'Error treatment and aria-invalid.',
    purpose: 'Shortcut for the error visual state.',
  },
  {
    name: 'status',
    type: "'idle' | 'loading' | 'success' | 'error'",
    def: '-',
    desc: 'Explicit visual status.',
    purpose: 'Overrides invalid and can show loading/success/error treatment.',
  },
  {
    name: 'statusMessage',
    type: 'ReactNode',
    def: '-',
    desc: 'Message rendered beneath the field.',
    purpose: 'Announces validation or loading context to assistive tech.',
  },
  {
    name: 'theme',
    type: "'light' | 'dark'",
    def: '-',
    desc: 'Forces a color scheme.',
    purpose: 'Omit it to follow the OS preference or surrounding page theme.',
  },
  {
    name: 'name',
    type: 'string',
    def: '-',
    desc: 'Native form name.',
    purpose: 'Forwarded to input and textarea for form submission.',
  },
  {
    name: 'id',
    type: 'string',
    def: '-',
    desc: 'Editable element id.',
    purpose: 'Pair with a label htmlFor value.',
  },
  {
    name: 'required',
    type: 'boolean',
    def: 'false',
    desc: 'Marks the field required.',
    purpose: 'Forwarded to input/textarea and reflected with aria-required.',
  },
  {
    name: 'readOnly',
    type: 'boolean',
    def: 'false',
    desc: 'Renders read-only and suppresses hints.',
    purpose: 'Show a value without allowing edits or completions.',
  },
  {
    name: 'maxLength',
    type: 'number',
    def: '-',
    desc: 'Maximum character length.',
    purpose: 'Forwarded to input and textarea surfaces.',
  },
  {
    name: 'form',
    type: 'string',
    def: '-',
    desc: 'External form id.',
    purpose: 'Associates input/textarea with a form outside its DOM subtree.',
  },
  {
    name: 'autoFocus',
    type: 'boolean',
    def: 'false',
    desc: 'Focuses the field on mount.',
    purpose: 'Useful for dialogs or focused writing tools.',
  },
  {
    name: 'autoComplete',
    type: 'string',
    def: "'off'",
    desc: 'Native autocomplete attribute.',
    purpose: 'Controls browser autofill behavior independently from ForeFill.',
  },
  {
    name: 'spellCheck',
    type: 'boolean',
    def: 'false',
    desc: 'Native spellcheck attribute.',
    purpose: 'Enable browser spelling assistance when useful.',
  },
  {
    name: 'acceptOnEnter',
    type: 'boolean',
    def: 'true',
    desc: 'Lets Enter accept visible hints.',
    purpose: 'When false, Enter commits typed text and Tab still accepts hints.',
  },
  {
    name: 'commitOnBlur',
    type: 'boolean',
    def: 'false',
    desc: 'Commits on blur.',
    purpose: 'Persist the current value when focus leaves the field.',
  },
  {
    name: 'partialAccept',
    type: 'boolean',
    def: 'true',
    desc: 'Accept one word with Ctrl/Cmd + ArrowRight.',
    purpose: 'Lets users take long hints gradually.',
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
  if (hash === 'documentation' || DOC_LINKS.some((link) => link.id === hash)) {
    return 'documentation';
  }
  return 'hero';
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
        {page === 'documentation' && <DocumentationPage />}
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
          <img src="/ForeFill.svg" alt="" className="h-8 w-14 dark:invert" />
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
  return (
    <main id="hero">
      <section className="border-b border-[#D7DEE9] bg-white dark:border-white/10 dark:bg-[#151923]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-4">
              <img src="/ForeFill.svg" alt="" className="h-14 w-24 dark:invert" />
              <span className="rounded-md border border-[#D7DEE9] px-2 py-1 text-xs font-bold text-[#526078] dark:border-white/10 dark:text-[#A8B3C7]">
                React inline autocomplete
              </span>
            </div>
            <p className="text-2xl font-black tracking-tight sm:text-3xl">
              Fore<span className="text-[#6F84B2]">Fill</span>
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight text-[#07154D] dark:text-white sm:text-6xl">
              Finish the sentence{' '}
              <span className="bg-gradient-to-r from-[#6F84B2] via-[#8398C1] to-[#A2B2D2] bg-clip-text text-transparent">
                before you type it
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#526078] dark:text-[#A8B3C7]">
              Ghost-text autocomplete for React textareas, inputs, and richtext
              fields. Watch it type, suggest, and accept completions using the same
              component you ship.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#documentation" className="inline-flex items-center gap-2 rounded-md bg-[#6F84B2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5A6F9C]">
                <BookOpen className="h-4 w-4" />
                Documentation
              </a>
              <a href="#playground" className="inline-flex items-center gap-2 rounded-md border border-[#D7DEE9] px-4 py-2.5 text-sm font-bold text-[#07154D] transition hover:bg-[#EEF2F7] dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                <Play className="h-4 w-4" />
                Playground
              </a>
            </div>
          </div>

          <div className="content-start">
            <HeroTypingShowcase theme={theme} />
          </div>
        </div>
      </section>

      <SampleSection theme={theme} />

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
        <Feature icon={<WandSparkles className="h-5 w-5" />} title="Any trigger" text="@, $, &, words, or your own custom strings." />
        <Feature icon={<Zap className="h-5 w-5" />} title="Existing text" text="Only the newly typed segment is completed." />
        <Feature icon={<SlidersHorizontal className="h-5 w-5" />} title="Full playground" text="Every API prop is documented next to live controls." />
      </section>
    </main>
  );
}

function HeroTypingShowcase({ theme }: { theme: ThemeMode }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState({ to: '', subject: '', body: '' });
  const [phase, setPhase] = useState<'typing' | 'hint' | 'accepted'>('typing');
  const item = HERO_TYPING_ITEMS[index];

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timers.push(window.setTimeout(fn, reduceMotion ? Math.min(delay, 180) : delay));
    };

    if (index === 0) {
      setValues({ to: '', subject: '', body: '' });
    }
    setPhase('typing');
    setValues((current) => ({ ...current, [item.field]: '' }));

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
    schedule(() => setPhase('hint'), typedAt + 760);
    schedule(() => {
      setValues((current) => ({ ...current, [item.field]: item.full }));
      setPhase('accepted');
    }, typedAt + 1520);
    schedule(
      () => setIndex((current) => (current + 1) % HERO_TYPING_ITEMS.length),
      typedAt + 3100
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [index, item.field, item.full, item.seed]);

  return (
    <div className="overflow-hidden rounded-md border border-[#D1DBE8] bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between border-b border-[#D1DBE8] bg-[#F8FAFD] px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F6C85F]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#6F84B2]" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
          New message
        </span>
      </div>

      <div className="space-y-3 p-4">
        <ComposeRow label="To">
          <ForeFill
            as="input"
            inputType="email"
            value={values.to}
            onChange={(value) => setValues((current) => ({ ...current, to: value }))}
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="recipient@"
            ariaLabel="Compose recipient"
            showHelper={false}
            previewActive={item.field === 'to' && phase !== 'accepted'}
            theme={theme}
          />
        </ComposeRow>

        <ComposeRow label="Subject">
          <ForeFill
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
            previewActive={item.field === 'subject' && phase !== 'accepted'}
            theme={theme}
          />
        </ComposeRow>

        <div>
          <ForeFill
            as="textarea"
            value={values.body}
            onChange={(value) => setValues((current) => ({ ...current, body: value }))}
            suggestions={DEFAULT_SUGGESTIONS}
            triggerSuggestions={TRIGGER_PRESETS.all}
            placeholder="Write the message..."
            ariaLabel="Compose message"
            rows={5}
            showHelper="idle"
            previewActive={item.field === 'body' && phase !== 'accepted'}
            theme={theme}
          />
        </div>
      </div>
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

function SampleSection({ theme }: { theme: ThemeMode }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.24 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`border-b border-[#D7DEE9] bg-[#F7F8FB] px-4 py-12 transition duration-700 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#10131A] ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-wider text-[#6F84B2] dark:text-[#A2B2D2]">
            Test ForeFill
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#07154D] dark:text-white">
            Try both completion styles
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DemoPanel title="Test triggers">
            <ForeFill
              as="input"
              placeholder="Type @g, $t, & sh, or Happy"
              ariaLabel="Trigger sample"
              suggestions={DEFAULT_SUGGESTIONS}
              triggerSuggestions={TRIGGER_PRESETS.all}
              showHelper="idle"
              theme={theme}
            />
            <p className="mt-3 text-sm text-[#526078] dark:text-[#A8B3C7]">
              Try <Code>@g</Code>, <Code>$t</Code>, <Code>& sh</Code>, or{' '}
              <Code>Happy</Code>.
            </p>
          </DemoPanel>

          <DemoPanel title="Test existing text">
            <ForeFill
              as="textarea"
              defaultValue="Happy to help - let me take a look. "
              placeholder="Type Thanks"
              ariaLabel="Existing text sample"
              suggestions={DEFAULT_SUGGESTIONS}
              rows={4}
              showHelper="idle"
              theme={theme}
            />
            <p className="mt-3 text-sm text-[#526078] dark:text-[#A8B3C7]">
              Type <Code>Thanks</Code> after the saved text, then accept the hint.
            </p>
          </DemoPanel>
        </div>
      </div>
    </section>
  );
}

function DocumentationPage() {
  return (
    <main id="documentation" className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-24 space-y-1 border-l border-[#D7DEE9] pl-4 dark:border-white/10">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#708096] dark:text-[#A8B3C7]">
            Documentation
          </p>
          {DOC_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="block rounded-md px-3 py-1.5 text-sm font-semibold text-[#526078] transition hover:bg-[#EEF2F7] hover:text-[#07154D] dark:text-[#A8B3C7] dark:hover:bg-white/10 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-12">
        <DocSection id="installation" title="Installation" icon={<Clipboard />}>
          <p>Install the package and import its stylesheet once in your app.</p>
          <CodeBlock code={`npm install ${PKG}`} filename="terminal" />
          <CodeBlock
            filename="App.tsx"
            code={`import { ForeFill } from '${PKG}';
import '${PKG}/styles.css';`}
          />
        </DocSection>

        <DocSection id="quick-start" title="Quick Start" icon={<Sparkles />}>
          <p>Pass a list of phrases and handle the committed value.</p>
          <CodeBlock
            filename="ReplyBox.tsx"
            code={`const replies = [
  'Thanks so much for reaching out!',
  'Happy to help - let me take a look.',
  'Let me know if you have any questions.',
];

export function ReplyBox() {
  return (
    <ForeFill
      suggestions={replies}
      placeholder="Write a reply..."
      showHelper="idle"
      onCommit={(value) => console.log(value)}
    />
  );
}`}
          />
        </DocSection>

        <DocSection id="trigger-suggestions" title="Trigger Suggestions" icon={<WandSparkles />}>
          <p>
            Configure any symbol or word as a trigger. Trigger suggestions use
            startsWith matching, keep the trigger text, and replace only the typed query
            after it.
          </p>
          <CodeBlock
            filename="Triggers.tsx"
            code={`<ForeFill
  as="input"
  triggerSuggestions={[
    { trigger: '@', suggestions: ['gmail.com', 'yahoo.com'] },
    { trigger: '$', suggestions: ['total', 'subtotal', 'tax'] },
    { trigger: 'Happy', suggestions: [' Birthday!'] },
  ]}
/>`}
          />
        </DocSection>

        <DocSection id="existing-values" title="Existing Values" icon={<Zap />}>
          <p>
            When a field starts with text, ForeFill treats newly appended text as the
            active query. Accepting a normal suggestion replaces that active segment and
            preserves the existing prefix.
          </p>
          <CodeBlock
            filename="ExistingValue.tsx"
            code={`<ForeFill
  defaultValue="Happy to help - let me take a look. "
  suggestions={['Thanks so much for reaching out!']}
/>`}
          />
        </DocSection>

        <DocSection id="async-suggestions" title="Async Suggestions" icon={<Code2 />}>
          <p>
            Async fetchers receive the active query, including appended text after an
            existing value. Use debounceMs to limit requests.
          </p>
          <CodeBlock
            filename="Async.tsx"
            code={`<ForeFill
  debounceMs={250}
  asyncSuggestions={async (query) => {
    const res = await fetch('/api/suggestions?q=' + encodeURIComponent(query));
    return res.json();
  }}
/>`}
          />
        </DocSection>

        <DocSection id="surfaces" title="Surfaces" icon={<SlidersHorizontal />}>
          <p>Use the same completion behavior in textarea, input/textbox, and richtext surfaces.</p>
          <CodeBlock
            code={`<ForeFill as="textarea" suggestions={data} />
<ForeFill as="input" suggestions={data} />
<ForeFill as="richtext" suggestions={data} />`}
          />
        </DocSection>

        <DocSection id="styling" title="Styling" icon={<Sun />}>
          <p>
            Pick a variant and size, or override CSS variables through className. The
            library stylesheet is plain CSS.
          </p>
          <CodeBlock
            filename="theme.css"
            code={`.my-forefill {
  --ff-accent: #2e7d73;
  --ff-radius: 8px;
  --ff-font: Inter, sans-serif;
}`}
          />
        </DocSection>

        <DocSection id="accessibility" title="Accessibility" icon={<Check />}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              'aria-autocomplete is inline.',
              'Loading and active hints are announced politely.',
              'Escape dismisses visible hints.',
              'Read-only and invalid states are reflected with ARIA.',
            ].map((item) => (
              <li key={item} className="rounded-md border border-[#D7DEE9] bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5">
                {item}
              </li>
            ))}
          </ul>
        </DocSection>
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
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [s, setS] = useState<PlaygroundState>({
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
    previewActive: false,
    acceptOnEnter: true,
    commitOnBlur: false,
    partialAccept: true,
    showHelper: 'idle',
    helperIdleMs: 900,
    helperText: '',
    status: 'idle',
    statusMessage: '',
    invalid: false,
    name: '',
    id: '',
    required: false,
    readOnly: false,
    maxLength: 0,
    form: '',
    autoFocus: false,
    autoComplete: 'off',
    spellCheck: false,
    disabled: false,
  });

  const set = useCallback(
    <K extends keyof PlaygroundState>(key: K, value: PlaygroundState[K]) =>
      setS((prev) => ({ ...prev, [key]: value })),
    []
  );

  const triggerSuggestions = useMemo(
    () => getTriggersForMode(s.triggerMode),
    [s.triggerMode]
  );

  const asyncFetcher = useMemo(
    () =>
      s.asyncMode
        ? async (query: string) => {
            await new Promise((resolve) => window.setTimeout(resolve, 350));
            return DEFAULT_SUGGESTIONS.filter((item) =>
              item.toLowerCase().includes(query.toLowerCase())
            );
          }
        : undefined,
    [s.asyncMode]
  );

  const generatedCode = useMemo(
    () => buildForeFillCode(s, triggerSuggestions),
    [s, triggerSuggestions]
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
            previewActive={s.previewActive}
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
            statusMessage={s.statusMessage || undefined}
            invalid={s.invalid}
            placeholder={s.placeholder}
            rows={s.rows}
            inputType={s.inputType}
            ariaLabel={s.ariaLabel || undefined}
            name={s.name || undefined}
            id={s.id || undefined}
            required={s.required}
            readOnly={s.readOnly}
            maxLength={s.maxLength > 0 ? s.maxLength : undefined}
            form={s.form || undefined}
            autoFocus={s.autoFocus}
            autoComplete={s.autoComplete}
            spellCheck={s.spellCheck}
            disabled={s.disabled}
            theme={s.themeChoice === 'auto' ? theme : s.themeChoice}
            onCommit={(value) => {
              setCommitted(value);
              setLastEvent('committed');
            }}
            onAccept={(_value, suggestion) =>
              setLastEvent(`accepted "${suggestion}"`)
            }
            onDismiss={() => setLastEvent('dismissed')}
          />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <StatusBox label="Last event" value={lastEvent ?? 'none'} />
            <StatusBox label="Committed value" value={committed || 'none'} />
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
              <Select value={s.as} onChange={(value) => set('as', value as ForeFillSurface)} options={['textarea', 'input', 'textbox', 'richtext']} />
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
              ['previewActive', s.previewActive, (value: boolean) => set('previewActive', value)],
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
            <Control name="statusMessage" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.statusMessage} onChange={(value) => set('statusMessage', value)} />
            </Control>
            <Control name="invalid" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <Toggle checked={s.invalid} onChange={(value) => set('invalid', value)} labels={['on', 'off']} />
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
            <Control name="form" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.form} onChange={(value) => set('form', value)} />
            </Control>
            <Control name="autoComplete" openHelp={openHelp} setOpenHelp={setOpenHelp}>
              <TextInput value={s.autoComplete} onChange={(value) => set('autoComplete', value)} />
            </Control>
            {[
              ['required', s.required, (value: boolean) => set('required', value)],
              ['readOnly', s.readOnly, (value: boolean) => set('readOnly', value)],
              ['autoFocus', s.autoFocus, (value: boolean) => set('autoFocus', value)],
              ['spellCheck', s.spellCheck, (value: boolean) => set('spellCheck', value)],
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
                <th className="py-3 font-bold">Purpose</th>
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
                  <td className="py-3 text-[#33415C] dark:text-[#CAD3E3]">{prop.desc}</td>
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
  triggerSuggestions: ForeFillTriggerSuggestion[] | undefined
): string {
  const lines: string[] = ['  suggestions={suggestions}'];
  const str = (name: string, value: string) => lines.push(`  ${name}="${value}"`);
  const raw = (name: string, value: string) => lines.push(`  ${name}={${value}}`);
  const flag = (name: string) => lines.push(`  ${name}`);

  if (triggerSuggestions) raw('triggerSuggestions', 'triggerSuggestions');
  if (s.asyncMode) raw('asyncSuggestions', 'fetchSuggestions');
  if (s.as !== 'textarea') str('as', s.as);
  if (s.placeholder) str('placeholder', s.placeholder);
  if (s.as === 'textarea' && s.rows !== 3) raw('rows', String(s.rows));
  if ((s.as === 'input' || s.as === 'textbox') && s.inputType !== 'text') str('inputType', s.inputType);
  if (s.ariaLabel) str('ariaLabel', s.ariaLabel);
  if (s.variant !== 'outline') str('variant', s.variant);
  if (s.size !== 'md') str('size', s.size);
  if (s.themeChoice !== 'auto') str('theme', s.themeChoice);
  if (s.matchMode !== 'substring') str('matchMode', s.matchMode);
  if (s.minQueryLength !== 1) raw('minQueryLength', String(s.minQueryLength));
  if (s.debounceMs !== 0) raw('debounceMs', String(s.debounceMs));
  if (s.disableInlineFill) flag('disableInlineFill');
  if (!s.enableArrowNavigation) raw('enableArrowNavigation', 'false');
  if (s.previewActive) flag('previewActive');
  if (!s.acceptOnEnter) raw('acceptOnEnter', 'false');
  if (s.commitOnBlur) flag('commitOnBlur');
  if (!s.partialAccept) raw('partialAccept', 'false');
  if (s.showHelper === 'true') flag('showHelper');
  if (s.showHelper === 'idle') str('showHelper', 'idle');
  if (s.helperIdleMs !== 900) raw('helperIdleMs', String(s.helperIdleMs));
  if (s.helperText) str('helperText', s.helperText);
  if (s.status !== 'idle') str('status', s.status);
  if (s.statusMessage) str('statusMessage', s.statusMessage);
  if (s.invalid) flag('invalid');
  if (s.name) str('name', s.name);
  if (s.id) str('id', s.id);
  if (s.required) flag('required');
  if (s.readOnly) flag('readOnly');
  if (s.maxLength > 0) raw('maxLength', String(s.maxLength));
  if (s.form) str('form', s.form);
  if (s.autoFocus) flag('autoFocus');
  if (s.autoComplete !== 'off') str('autoComplete', s.autoComplete);
  if (s.spellCheck) flag('spellCheck');
  if (s.disabled) flag('disabled');
  lines.push('  onCommit={(value) => setValue(value)}');

  const triggerBlock = triggerSuggestions
    ? `const triggerSuggestions = ${JSON.stringify(triggerSuggestions, null, 2)};\n\n`
    : '';

  return `${triggerBlock}<ForeFill\n${lines.join('\n')}\n/>`;
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

function DemoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#D7DEE9] bg-[#F7F8FB] p-5 shadow-sm dark:border-white/10 dark:bg-[#10131A]">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-[#526078] dark:text-[#A8B3C7]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-[#D7DEE9] bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-[#EEF2F8] text-[#6F84B2] dark:bg-[#6F84B2]/20 dark:text-[#A2B2D2]">
        {icon}
      </div>
      <h2 className="font-black text-[#07154D] dark:text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#526078] dark:text-[#A8B3C7]">{text}</p>
    </div>
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
