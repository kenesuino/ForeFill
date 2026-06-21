// Tailwind powers the DEMO/docs site only (scoped via tailwind.config.js
// content paths). The published library under src/lib/** uses no Tailwind —
// its stylesheet is hand-authored vanilla CSS copied verbatim to dist.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
