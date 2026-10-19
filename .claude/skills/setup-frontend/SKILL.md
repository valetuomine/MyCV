---
name: setup-frontend
description: 'Set up or recreate the MyCV frontend with React, TypeScript, Vite, Tailwind CSS, and the dark emerald-accent CV design. Use when rebuilding the frontend shell, typography, theme, or background.'
argument-hint: '[optional frontend setup or background change]'
user-invocable: true
---

# Set Up The Frontend

Use this workflow when recreating the MyCV frontend inside `src/Frontend`.

## Stack

- React with TypeScript
- Vite using the `react-ts` template
- Tailwind CSS v4 with `@tailwindcss/vite`
- CSS-layered background (glows, grid, grain, cursor spotlight) with light and dark themes through CSS custom properties
- Framer Motion for motion, Jotai for UI state (section index, theme)
- Geist headings/body text and Geist Mono labels
- Node.js `24.21.0` managed with NVM

## Frontend Conventions

- Prefer Tailwind utility classes for new UI styling, including layout, spacing, sizing, typography, colors, borders, shadows, responsive behavior, and interaction states.
- Create one focused React component per `.tsx` file. Use PascalCase filenames and default-export the component, for example `Header.tsx`, `Navigation.tsx`, or `ContentSection.tsx`.
- Keep shared page components under `src/pages/components/` and feature-specific components near their owning feature, such as `src/pages/Profile/components/CandidateCv/`.
- Define a local props interface for every component that accepts props. Use `ReactNode` for layout components that render arbitrary content through `children`.
- Keep page state and data selection in the page component. Pass selected data and event handlers into child components through typed props instead of duplicating state in presentational components.
- Build complex page sections through small composable components. A layout component such as `Background` or `HeaderRow` should accept `children`, while focused components such as `Navigation` or `ContentSection` should receive the data they render.
- Use `type JSX` and `type ReactNode` imports from `react` when needed, and keep component files free of unused React imports.
- Treat `useEffect` as the last resort, used only to synchronize with something outside React: browser APIs (`document.title`, `<html>` attributes, timers), MSAL, or router state that has to change after render. Before writing one, reach for the simpler tool:
  - Derive values during render. `useMemo` is fine when a value is costly or must keep its identity, such as mapped form values passed to React Hook Form's `values`.
  - Run logic caused by a user action in that action's event handler.
  - Render `<Navigate replace>` when the destination follows from current state, instead of calling `navigate()` from an effect.
  - Read one-shot values, such as session-storage markers, in a `useState` initializer.
  - Fetch with RTK Query, never from an effect.
  - Reset a component's state for a different entity with a `key`.
  - Set app-wide state, such as the MSAL active account, once in its module (`src/auth/entraAuth.ts`) rather than from each route.

  Keep the effect when the alternative would be harder to follow, for example a timer that must be cancelled on unmount. Do not add refs or extra handlers only to avoid one. Every effect that subscribes or starts something returns its cleanup. Never silence a `react-hooks` lint rule to keep an effect.
- Follow `vercel-react-best-practices` for React performance, but skip its Next.js and server rules: this is a Vite single-page app. Where it differs from these conventions, these conventions win.
- Put shared application types in `src/types.ts`, then import them where needed. For finite string values used both at runtime and as prop types, export a `const` object with `as const` and derive the corresponding type from its values (for example, `export const InputType = { Email: "email" } as const` and `export type InputType = (typeof InputType)[keyof typeof InputType]`). This supports named values without TypeScript enums, which are incompatible with `erasableSyntaxOnly`. Keep component-only props interfaces local to their component.
- Define recurring colors as themed `--cv-*` variables exposed through `@theme inline` in `src/index.css`, and fonts and other tokens in `@theme`, then use their generated utilities (for example, `bg-cv-accent` and `font-cv-mono`) instead of repeating arbitrary values. Never use `white`, `black`, or hex values in components.
- Prefer Tailwind's standard scale when it matches the intended value (for example, use `max-w-7xl` for `80rem`). Use arbitrary values only when the standard scale does not express the design cleanly.
- Add custom CSS only when Tailwind cannot express the behavior clearly, such as complex animations, pseudo-elements, WebGL or canvas surfaces, or reusable behavior that would make JSX difficult to read.
- Keep custom CSS scoped to its owning component or an intentional shared global concern. Do not add a custom CSS class when an equivalent, readable Tailwind composition is available.
- Create a Zod schema whenever creating a form. Keep the schema next to the form when it is local to that form, or in the form's feature folder when it is shared.
- Infer form input types from the Zod schema where practical so validation and TypeScript types stay aligned.
- Build forms with React Hook Form (`react-hook-form`) and `@hookform/resolvers/zod`. Wrap RHF-backed sections in `FormProvider` and make reusable inputs read state with `useFormContext`/`useWatch`, using typed field names.
- Keep profile content in its normal story layout for viewing. When `useCanEditProfile(profileId)` from `src/auth/useCanEditProfile.ts` returns `canEdit`, show one form-level Edit action; edit all fields together in a conventional form with Save and Cancel actions, not per-field edit buttons. Use React Hook Form and the Zod resolver to validate the full form before leaving edit mode, reset changes on Cancel, and render each validation message beneath its field with `aria-describedby`. Forward applicable native input attributes while keeping React Hook Form-controlled props internal. Save persists through `useUpdateProfileMutation`. `canEdit` only hides or shows controls; the API enforces who may edit.
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
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
@import "tailwindcss";
```

Define the theme variables, font tokens, and the `bg-cv-grid`/`bg-cv-grain` utilities in `src/index.css` as described in the design system below.

## Design System

The look is a modern, editorial developer CV: left-aligned asymmetric layouts, large tight Geist display type, one emerald accent, and quiet surfaces. It was designed with the taste-skill set (`design-taste-frontend`, `redesign-existing-projects`) installed in the git-ignored `src/Frontend/.agents/skills` and `.claude/skills` folders and recorded in `src/Frontend/skills-lock.json`; read those skills for deeper guidance before redesigning.

### Theming (light and dark)

- Raw palette variables (`--cv-background`, `--cv-surface`, `--cv-line`, `--cv-ink`, `--cv-copy`, `--cv-muted`, `--cv-meta`, `--cv-accent`, `--cv-accent-ink`, `--cv-danger`, `--cv-wash`, `--cv-overlay`, `--cv-grid-line`, `--cv-shadow-panel`) live in two blocks in `src/index.css`: `:root, :root[data-theme="light"]` and `:root[data-theme="dark"]`. Retuning or adding a theme edits only those blocks.
- `@theme inline` maps them to Tailwind utilities (`bg-cv-background`, `text-cv-ink`, `border-cv-line`, `bg-cv-overlay`, `shadow-cv-panel`). Components use only these semantic utilities.
- Light theme uses a darker emerald accent for contrast; dark theme uses a mint accent. `--cv-accent-ink` is the text colour on accent fills.
- `ThemeToggle` (rendered by `Background`, top-right) stores the choice in `themeAtom` (`src/state/themeAtoms.ts`, Jotai `atomWithStorage`, key `cv-theme`, default from `prefers-color-scheme`) and sets `data-theme` on `<html>`. An inline script in `index.html` applies the theme before first paint to avoid a flash; keep its storage key in sync with `themeStorageKey`.
- The `Theme` const object lives in `src/types.ts`.

### Visual rules

- One accent colour only, saturation kept moderate, one neutral (zinc) gray family. No purple/blue "AI gradient", no pure `#000`, no warm cream/brass palettes.
- Typography: Geist for display and body, Geist Mono for small uppercase labels and metadata. Display text uses negative tracking (`tracking-tighter`), tight leading, `text-balance`; body copy stays within about 52–65ch with `text-pretty`. No serif fonts.
- Layout: left-aligned and asymmetric (text column plus portrait column), `max-w-7xl` container, `min-h-dvh` instead of `100vh`, generous whitespace. Avoid centered heroes and three-equal-card rows.
- Surfaces: use borders (`border-cv-line`), `divide-y`, or spacing instead of heavy cards; shadows come from `shadow-cv-panel`/`shadow-cv-accent` and are tinted, never plain black. One radius scale: full pills for buttons and toggles, `rounded-3xl` for large framed media, `rounded-lg` for inputs.
- Buttons come from `src/pages/components/buttonStyles.ts` (`primaryButton`, `secondaryButton`, `externalLinkArrow`) and always have hover, `active` press feedback (`active:scale-[0.98]`), and a visible `focus-visible` outline.
- Do not duplicate information: the role appears once (hero subtitle). Location (with pin icon) and the last-updated date appear in the left hero text.

### Motion

- Use Framer Motion with spring physics (`type: "spring", stiffness: 100, damping: 20`) and staggered entry (`staggerChildren`) instead of linear easing or mounting everything at once. Animate only `transform` and `opacity`.
- Wrap CV pages in `MotionConfig reducedMotion="user"` so reduced-motion preferences are honored.
- Keep infinite loops to small status details (pulse dot, hint arrow, skeleton pulse).
- Give screens that usually resolve in well under a second (auth redirects, callbacks) `animate-cv-fade-in-delayed` from `src/index.css`. It holds them invisible for 300ms before fading in, so fast paths never flash. `RouteMessage` applies it with `delayed`.

### States

- Loading, error, empty, not-found, and auth screens render through `RouteMessage`; never show bare unstyled text. `tone` takes the `Tone` const from `src/types.ts`: `Tone.Neutral`, `Tone.Pending` (the dot pulses with `animate-cv-pulse`, hidden under reduced motion; sets `aria-busy`), or `Tone.Error` (danger dot, `role="alert"`). Pass `onRetry`/`showHomeButton` for the default Try again and Open a CV buttons, or `actions` to replace them. Put identifiers such as a public URL segment in `<code>` inside the heading; `RouteMessage` styles it as a chip.
- Every message screen needs a way forward: a failure offers Try again plus a way back (Back to CV or Open a CV); never leave the user on a dead end.
- All sign-in states render through `src/auth/SignInMessage.tsx`: not configured, cancelled (neutral tone), failed (error tone), pending (names what is being signed in to, for example "Signing in to manage `segment`"), and slow. After 5 seconds without a redirect, the pending screen offers Reload page rather than calling MSAL again, because a second login call while one is in flight fails with `interaction_in_progress`.
- `Background` renders `SignOutButton` and `ThemeToggle` top-right. When signed in, `SignOutButton` shows the account name (email in the `title`) beside Sign out, hidden below `sm`. `Background` also renders `SignedOutNotice`, a bottom-centred pill that confirms a sign-out for 4 seconds inside an always-present `role="status"` region.
- Placeholder content uses skeleton bars (`motion-safe:animate-pulse`), not spinners.
- Form errors render inline under the field with `role="alert"` and `aria-describedby`, using `text-cv-danger`.
- The profile photo slot is `ProfilePortrait`: it shows the image when an `imageUrl` exists, otherwise a monogram. The API has no photo field yet.

## CV Background and Layout

`src/pages/components/Background.tsx` owns the page background and content layer. Keep the background decorative and behind the content, with `aria-hidden="true"` and `pointer-events-none`. It layers soft accent glows, a masked grid (`bg-cv-grid`), a grain overlay (`bg-cv-grain`, both custom `@utility` classes in `src/index.css`), and a mouse-following spotlight driven by Framer Motion values. Keep page content in a higher stacking context than the background. Use a single `<main>` landmark per page (`Background` renders a `div`).

The candidate CV shows the API-backed Profile (left text column plus the portrait on the right) followed by a "More to come" slide; it does not use a clickable navigation bar. Mouse-wheel input and ArrowDown/ArrowUp move between slides. Keep the selected index in Jotai through `useCandidateSectionNavigation`, clamp it to the available slide count, and pass its direction to `CandidateSectionTransition` so each slide animates in from the appropriate edge. `SectionNavigationHint` provides the visible slide count, progress, and navigation instructions. Keep these CV-specific components under `src/pages/Profile/components/CandidateCv/`.

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
