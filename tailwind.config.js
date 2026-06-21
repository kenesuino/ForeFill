/** @type {import('tailwindcss').Config} */
export default {
  // Demo-only. The published component (src/lib/**) is intentionally NOT
  // scanned — the library ships hand-written vanilla CSS with zero Tailwind.
  darkMode: 'class',
  content: ['./index.html', './src/App.tsx', './src/main.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
