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
- Layered background (a directed light from the top-left corner that comes on with the CV name's reveal, dot grid, grain, cursor spotlight, and the lit dots of the name's sweep and echo drawn on a canvas) with light and dark themes through CSS custom properties
- Framer Motion for motion, Jotai for UI state (theme, language, the name's echo, the light's sweep and ignition)
- Great Vibes for the CV's name, Fraunces for headings, Sora for the profile's details, Geist body text and Geist Mono labels, all self-hosted from Fontsource
- Node.js `24.21.0` managed with NVM

## Frontend Conventions

- Prefer Tailwind utility classes for new UI styling, including layout, spacing, sizing, typography, colors, borders, shadows, responsive behavior, and interaction states.
- Create one focused React component per `.tsx` file. Use PascalCase filenames and default-export the component, for example `Background.tsx`, `PageControls.tsx`, or `ProfileName.tsx`.
- Keep shared page components under `src/pages/components/` and feature-specific components near their owning feature, such as `src/pages/Profile/components/CandidateCv/`.
- Define a local props interface for every component that accepts props. Use `ReactNode` for layout components that render arbitrary content through `children`.
- Keep page state and data selection in the page component. Pass selected data and event handlers into child components through typed props instead of duplicating state in presentational components.
- Build complex page sections through small composable components. A layout component such as `Background` should accept `children`, while focused components such as `PageControls` or `ProfileName` should receive the data they render.
- Use `type JSX` and `type ReactNode` imports from `react` when needed, and keep component files free of unused React imports.
- Document code with JSDoc summaries only, by the rules in `.claude/rules/frontend-jsdoc.md`. Read it before documenting code.
- Treat `useEffect` as the last resort, used only to synchronize with something outside React. Before writing one, read [references/effects.md](references/effects.md) and the `react-useeffect` skill for the simpler tool to reach for.
- Follow `vercel-react-best-practices` for React performance, but skip its Next.js and server rules: this is a Vite single-page app. Where it differs from these conventions, these conventions win.
- Follow `vercel-composition-patterns` when designing a reusable component's API: explicit variants instead of boolean modes, `children` instead of render props, and `ref` as a plain prop (React 19, no `forwardRef`). Where it differs from these conventions, these conventions win.
- Put shared application types in `src/types.ts`, then import them where needed. For finite string values used both at runtime and as prop types, export a `const` object with `as const` and derive the corresponding type from its values (for example, `export const InputType = { Email: "email" } as const` and `export type InputType = (typeof InputType)[keyof typeof InputType]`). This supports named values without TypeScript enums, which are incompatible with `erasableSyntaxOnly`. The same goes for a fixed set of strings used only at runtime, such as the DOM event names a hook listens to (`ActivityEvent`) or the types of messages between tabs (`IdleMessageType`): name them in `src/types.ts` and iterate with `Object.values()`, rather than keeping an array of bare strings in the module. Keep component-only props interfaces local to their component.
- Define recurring colors as themed `--cv-*` variables exposed through `@theme inline` in `src/index.css`, and fonts and other tokens in `@theme`, then use their generated utilities (for example, `bg-cv-accent` and `font-cv-mono`) instead of repeating arbitrary values. Never use `white`, `black`, or hex values in components.
- Prefer Tailwind's standard scale when it matches the intended value (for example, use `max-w-7xl` for `80rem`). Use arbitrary values only when the standard scale does not express the design cleanly.
- Add custom CSS only when Tailwind cannot express the behavior clearly, such as complex animations, pseudo-elements, WebGL or canvas surfaces, or reusable behavior that would make JSX difficult to read.
- Keep custom CSS scoped to its owning component or an intentional shared global concern. Do not add a custom CSS class when an equivalent, readable Tailwind composition is available.
- Never write UI text into a component, not even an `aria-label`, a loading line or an error message. Every text lives in both `src/i18n/locales/en.ts` and `src/i18n/locales/fi.ts` and is read with `t()` from `useTranslation()`. `en.ts` sets the keys, `fi.ts` is typed against it, and `src/i18n/i18next.d.ts` types `t`, so a key missing from either language, or misspelled, fails the build. Add a new text to both languages in the same change. Brand names (MyCV, GitHub, LinkedIn, Microsoft, Google) and the language names in `LanguageToggle` stay as they are. Word texts at render, not when they are stored: keep the key or the cause in state (see `SignInMethodsSection`, `ProfileForm`), and write Zod messages with `validationMessage()` from `src/i18n/validationMessage.ts`, which `useFormField` translates. Format dates with `i18n.language`. The language lives in `languageAtom` (`src/state/languageAtoms.ts`: saved choice, then `navigator.language`, then English), `LanguageToggle` keeps i18next on it, and `src/i18n/i18n.ts` sets `<html lang>`, the title and the meta description on every change; the public CV is fetched in it.
- Build every form with a Zod schema and React Hook Form, and the profile edit mode in one form with Save and Cancel. Read [references/forms.md](references/forms.md) before creating or changing a form.
- Install npm packages from `src/Frontend`, on Node `24.21.0`. The commands are in [references/create-app.md](references/create-app.md).

## Design System

The look is a modern, editorial developer CV: left-aligned asymmetric layouts, a large script name over serif headings, one emerald accent, and quiet surfaces. It was designed with the taste-skill set (`design-taste-frontend`, `redesign-existing-projects`) installed in the git-ignored `src/Frontend/.agents/skills` and `.claude/skills` folders and recorded in `src/Frontend/skills-lock.json`; read those skills for deeper guidance before redesigning.

Theme variables, `ThemeToggle` and the first-paint script are in [references/theming.md](references/theming.md). Read it before changing a colour, a theme or the toggle.

### Visual rules

- One accent colour only, saturation kept moderate, one neutral (zinc) gray family. No purple/blue "AI gradient", no pure `#000`, no warm cream/brass palettes.
- Typography: one font token per role in `@theme` of `src/index.css`, each from a Fontsource package imported in `src/main.tsx` (never a Google Fonts import): `font-cv-name` (Great Vibes, one weight) for the CV's name only, `font-cv-display` (Fraunces Variable, with its optical size axis) for headings and the home page's heading, `font-cv-profile` (Sora Variable) for the profile's details beside the name (the job title, the cards, the portrait's initials, the PDF and printed CV), `font-cv-sans` (Geist) for body copy and `font-cv-mono` (Geist Mono) for small uppercase labels and metadata. Serif display text uses negative tracking (`tracking-tighter`), tight leading, `text-balance`; the script name has no tracking and a 1.1 leading for its swashes; body copy stays within about 52–65ch with `text-pretty`. Display text (the CV's name, the home page's heading, the featured card's name) is sized by its column, never the window: mark its nearest real container with `@container` and size the text with `text-[length:clamp(min,…cqi,max)]`, never `vw`. A name in the script divides the container's width by its own measured one-line width (`--name-width`: `ProfileName` sets it, `useNameLineWidth` gives it to other names; the shared display sizes, `cvNameSizeClassName`, `featuredCvNameSizeClassName` and `homeHeadingClassName`, live in `src/pages/Profile/components/displayTypeClassNames.ts`; add a new one there, never inline), and a short name stops at 18cqi, so it stays on one line until its minimum and only then wraps. A heading whose size follows its container locks its letters' widths in em, never px, so a resize never reflows them. Body copy (16px or more), labels, buttons and `h2` headings keep fixed sizes. No serif or script fonts for body copy and labels. A new font must be under the OFL and come from Fontsource; a font the name's weight reveal plays needs a variable weight axis covering 200–800. Code that measures a font reads its family from the token (`tokenFont` in `nameKerning.ts`), never a hard-coded family name. Never hand-write these three: every eyebrow line above a heading is the `Eyebrow` component (`src/pages/components/Eyebrow.tsx`), every secondary `h2` in the views takes `headingClassName`, and every small mono label (form labels, hints beside a heading) takes `labelClassName` (both in `src/pages/components/`).
- Layout: left-aligned and asymmetric (text column plus portrait column), `max-w-7xl` container, `min-h-dvh` instead of `100vh`, generous whitespace. Avoid centered heroes and three-equal-card rows.
- Surfaces: use borders (`border-cv-line`), `divide-y`, or spacing instead of heavy cards; shadows come from `shadow-cv-panel`, `shadow-cv-accent`, the edge glow (`shadow-cv-edge`, `shadow-cv-edge-focus`, `shadow-cv-card`) and the rim (`inset-shadow-cv-rim`) and are tinted, never plain black. One radius scale: full pills for buttons and toggles, `rounded-3xl` for large framed media, `rounded-lg` for inputs.
- Every button and button-styled link is `src/pages/components/Button.tsx`; never write button classes by hand. Its variants, sizes, states and hover rules are in [references/buttons.md](references/buttons.md). Read it before adding or changing a button.
- Do not duplicate information: the role appears once (hero subtitle). Location (with pin icon) and the last-updated date appear in the left hero text.

### Motion

- Use Framer Motion with spring physics (`type: "spring", stiffness: 100, damping: 20`) and staggered entry (`staggerChildren`) instead of linear easing or mounting everything at once. Animate only `transform` and `opacity`, with these exceptions, none of which changes layout: the CV name's letters reveal through `filter: blur()`, and in the variable serif (the home page's heading) also move along the font's weight axis, because each letter's width is locked to its weight-600 width so the weight never reflows the lines (the reveal moves the weight in 10-unit steps, because every weight of a variable font is its own font instance, built during layout the first time it is used, and smooth fractional weights build a new one for nearly every letter on every frame); the portrait photo sharpens in from a `filter: blur()` once it loads; the pointer lights (the name's sheen, the portrait's border light and foil) and the loading skeletons' shimmer move their `background-image` and `background-position`; and the background's lit dots, under the name's echo and the light's sweep, are drawn on a canvas, only while they move (see [references/layout.md](references/layout.md)).
- Keep pointer effects (tilt, pull, the name's glow) to `pointerType === "mouse"` and turn them off for reduced motion; give touch screens a one-off equivalent, like the name's echo on a tap or the home heading's weight wave, rather than nothing.
- Wrap CV pages in `MotionConfig reducedMotion="user"` so reduced-motion preferences are honored.
- Keep infinite loops to small status details (pulse dot, hint arrow, skeleton shimmer).
- Give screens that usually resolve in well under a second (auth redirects, callbacks) `animate-cv-fade-in-delayed` from `src/index.css`. It holds them invisible for 300ms before fading in, so fast paths never flash. `RouteMessage` applies it with `delayed`.

## More References

| File | Read when |
| --- | --- |
| [references/states.md](references/states.md) | Loading, error, empty and not-found screens, sign-in and sign-out states, skeletons, form errors, the profile photo |
| [references/layout.md](references/layout.md) | Changing the CV background, the name's echo in it, or the CV page's layout |
| [references/create-app.md](references/create-app.md) | Recreating the app, installing packages, or running the build and the local preview |

Check every UI change in the browser with the `playwright` MCP server before it is shipped: desktop and mobile, both themes, the changed interactions, reduced motion and the console. The full checklist is in `references/checks.md` of the `create-pull-request` skill.
