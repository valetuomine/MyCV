---
name: setup-frontend
description: 'Set up or recreate the MyCV frontend with React, TypeScript, Vite, Tailwind CSS, and the white radial-gradient CV design. Use when rebuilding the frontend shell, typography, theme, or background.'
argument-hint: '[optional frontend setup or background change]'
user-invocable: true
---

# Set Up The Frontend

Use this workflow when recreating the MyCV frontend inside `src/Frontend`.

## Stack

- React with TypeScript
- Vite using the `react-ts` template
- Tailwind CSS v4 with `@tailwindcss/vite`
- CSS radial-gradient background, themed through CSS custom properties
- DM Serif Display headings and IBM Plex Sans interface/body text
- Node.js `24.21.0` managed with NVM

## Frontend Conventions

- Prefer Tailwind utility classes for new UI styling, including layout, spacing, sizing, typography, colors, borders, shadows, responsive behavior, and interaction states.
- Create one focused React component per `.tsx` file. Use PascalCase filenames and default-export the component, for example `Header.tsx`, `Navigation.tsx`, or `ContentSection.tsx`.
- Keep page-specific components under `src/pages/components/` and import them with paths relative to the page, such as `./components/Header`.
- Define a local props interface for every component that accepts props. Use `ReactNode` for layout components that render arbitrary content through `children`.
- Keep page state and data selection in the page component. Pass selected data and event handlers into child components through typed props instead of duplicating state in presentational components.
- Build complex page sections through small composable components. A layout component such as `Background` or `HeaderRow` should accept `children`, while focused components such as `Navigation` or `ContentSection` should receive the data they render.
- Use `type JSX` and `type ReactNode` imports from `react` when needed, and keep component files free of unused React imports.
- Define recurring colors, fonts, and shadows as named `@theme` tokens in `src/index.css`, then use their generated utilities (for example, `bg-cv-accent` and `font-cv-mono`) instead of repeating arbitrary values.
- Prefer Tailwind's standard scale when it matches the intended value (for example, use `max-w-7xl` for `80rem`). Use arbitrary values only when the standard scale does not express the design cleanly.
- Add custom CSS only when Tailwind cannot express the behavior clearly, such as complex animations, pseudo-elements, WebGL or canvas surfaces, or reusable behavior that would make JSX difficult to read.
- Keep custom CSS scoped to its owning component or an intentional shared global concern. Do not add a custom CSS class when an equivalent, readable Tailwind composition is available.
- Create a Zod schema whenever creating a form. Keep the schema next to the form when it is local to that form, or in the form's feature folder when it is shared.
- Infer form input types from the Zod schema where practical so validation and TypeScript types stay aligned.
- Build forms with React Hook Form (`react-hook-form`) and `@hookform/resolvers/zod`. Wrap RHF-backed sections in `FormProvider` and make reusable inputs read state with `useFormContext`/`useWatch`, using typed field names.
- `RHFInput` renders the profile's story text normally. When `useIsAdmin()` from `src/auth/useIsAdmin.ts` is true, show a contextual edit button on hover/focus (and an Add action for empty values); clicking opens the RHF input inline. Done validates the field and closes the editor. Edits remain local form state for now; implement persistence separately when the Save mutation is added. The current auth hook is a stub and returns `false`, so admin edit controls are disabled.
- Install npm packages from the directory containing the package's `package.json`. For this repository, frontend packages must be installed from `src/Frontend`, not the repository root:

```powershell
Push-Location src/Frontend
npm install <package-name>
Pop-Location
```

Use the installed Node version before running the setup commands:

```powershell
nvm use 24.21.0
node --version
```

## Create The App

From the repository root:

```powershell
Remove-Item src/Frontend/.gitkeep -ErrorAction SilentlyContinue
Push-Location src/Frontend
npx create-vite@6.5.0 . --template react-ts
npm install
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node
Pop-Location
```

Configure the Vite alias `@` to resolve to `src`, add `@/*` to `tsconfig.app.json`, and import Tailwind in `src/index.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");
@import "tailwindcss";
```

Define design colors and font families as `@theme` variables in `src/index.css`.

## CV Background and Layout

`src/pages/components/Background.tsx` owns the page background and content layer. Keep the background decorative and behind the content, with `aria-hidden="true"` and `pointer-events-none`. The current treatment is a radial gradient from white near the top center to the slate edge color:

```css
radial-gradient(
  125% 125% at 50% 10%,
  var(--color-cv-background) 40%,
  var(--color-cv-gradient-edge) 100%
)
```

Define both colors in the `@theme` section of `src/index.css`; don't hardcode repeated palette values in components. Keep page content in a higher stacking context than the background. The current CV layout uses a left-aligned navigation and content, DM Serif Display for headings, and IBM Plex Sans for navigation and body copy.

## Verification

Run from the repository root:

```powershell
Push-Location src/Frontend
npm run build
npm run lint
Pop-Location
```

Start the local preview with:

```powershell
Push-Location src/Frontend
npm run dev -- --host 0.0.0.0 --port 3000
Pop-Location
```

The expected local URL is `http://localhost:3000/`.
