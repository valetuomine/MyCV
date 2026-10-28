# Theming (light and dark)

Part of the `setup-frontend` skill. Read it before changing a colour, a theme or the theme toggle.

- Raw palette variables (`--cv-background`, `--cv-surface`, `--cv-line`, `--cv-ink`, `--cv-copy`, `--cv-muted`, `--cv-meta`, `--cv-accent`, `--cv-accent-strong`, `--cv-accent-ink`, `--cv-danger`, `--cv-wash`, `--cv-overlay`, `--cv-grid-line`, `--cv-shadow-panel`) live in two blocks in `src/index.css`: `:root, :root[data-theme="light"]` and `:root[data-theme="dark"]`. Retuning or adding a theme edits only those blocks.
- `@theme inline` maps them to Tailwind utilities (`bg-cv-background`, `text-cv-ink`, `border-cv-line`, `bg-cv-overlay`, `shadow-cv-panel`). Components use only these semantic utilities.
- Light theme uses a darker emerald accent for contrast; dark theme uses a mint accent. `--cv-accent-strong` is the primary button's hover fill (deeper in light, brighter in dark). `--cv-accent-ink` is the text colour on accent fills.
- `ThemeToggle` (rendered by `Background`, top-right) stores the choice in `themeAtom` (`src/state/themeAtoms.ts`, Jotai `atomWithStorage`, key `cv-theme`, default from `prefers-color-scheme`) and sets `data-theme` on `<html>`. An inline script in `index.html` applies the theme before first paint to avoid a flash; keep its storage key in sync with `themeStorageKey`.
- The `Theme` const object lives in `src/types.ts`.
- Two kinds of colour are the same in both themes and sit in `@theme` instead of the theme blocks: the language flags' official colours (`--color-cv-flag-*`), which only `LanguageFlag` uses, and the neutral light `--color-cv-sheen`, which `ProfilePortrait` lays over a photo with `mix-blend-overlay` for its glare and foil, so a photo keeps its own colours.
