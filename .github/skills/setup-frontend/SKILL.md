---
name: setup-frontend
description: 'Set up the MyCV frontend with React, TypeScript, Vite, Tailwind CSS, and the official React Bits Grainient background. Use when recreating the frontend shell or rebuilding the CV background from the documented palette and motion settings.'
argument-hint: '[optional frontend setup or background change]'
user-invocable: true
---

# Set Up The Frontend

Use this workflow when recreating the MyCV frontend inside `src/Frontend`.

## Stack

- React with TypeScript
- Vite using the `react-ts` template
- Tailwind CSS v4 with `@tailwindcss/vite`
- Official React Bits Grainient component installed through the shadcn registry
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
npm install tailwindcss @tailwindcss/vite ogl
npm install -D @types/node
Pop-Location
```

Configure the Vite alias `@` to resolve to `src`, add `@/*` to `tsconfig.app.json`, and import Tailwind in `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');
@import "tailwindcss";
```

Then install the official component:

```powershell
Push-Location src/Frontend
npx shadcn@4.20.0 add @react-bits/Grainient-TS-TW
Pop-Location
```

Use the component from `src/pages/components/Grainient.tsx` and import it from page components with:

```tsx
import Grainient from './components/Grainient'
```

## Grainient Preset

This is the current preferred CV background. Keep `timeSpeed` at `0.5`.

```tsx
<Grainient
  timeSpeed={0.5}
  colorBalance={-0.14}
  warpStrength={0.68}
  warpFrequency={4.6}
  warpSpeed={0.28}
  warpAmplitude={42}
  blendAngle={63}
  blendSoftness={0.48}
  rotationAmount={160}
  noiseScale={2.05}
  grainAmount={0.01}
  grainScale={2}
  grainAnimated={false}
  contrast={1.24}
  gamma={0.98}
  saturation={0.76}
  centerX={-0.55}
  centerY={0.12}
  zoom={1.7}
  color1="#22B8A7"
  color2="#1B496F"
  color3="#07111D"
/>
```

Place it as a full-screen, non-interactive background behind the CV content. Use a class such as `position: absolute; inset: 0; z-index: 0; pointer-events: none;` and keep content above it with a higher stacking context.

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
