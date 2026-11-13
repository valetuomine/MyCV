# Create The App

Part of the `setup-frontend` skill. Read it when recreating the app, installing packages, or running the build and the local preview.

## Packages And Node

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

Define the theme variables, font tokens, and the `bg-cv-grid`/`bg-cv-grain` utilities in `src/index.css` as described in *Design System* in `SKILL.md` and in [theming.md](theming.md).

## Verification

Run from the repository root:

```powershell
Push-Location src/Frontend
npm run build
npm run lint
Pop-Location
```

`npm run lint` also runs the Sonar rules: `eslint.config.js` has its own block that extends `sonarjs.configs.recommended` (from `eslint-plugin-sonarjs`) and ignores `src/generated/**`, like the JSDoc block. Fix a finding in the code instead of silencing the rule: replace a nested ternary with a helper function or an `if` chain, split a function that is too complex, and wrap a component's props type in `Readonly<...>`. The first block also turns on ESLint's `no-await-in-loop`, which is Sonar's S9382: don't `await` inside a `for` or `while` loop. Check independent candidates in parallel with `Promise.all`, and replace a polling loop with a recursive helper that checks, tests the deadline and waits one interval before calling itself (`pollUntil` in `e2e/autoSignIn.ts`). Steps that must stay in order, such as one sign-in window after another, run through `reduce` over a promise chain, never `Promise.all`. The same block turns on `@typescript-eslint/no-base-to-string` (S6551: keep the caught failure as an `Error` instead of calling `String()` on an `unknown`) and `@typescript-eslint/no-floating-promises` (S9383: `await` a promise, or mark one that is deliberately not awaited, such as React Router's `navigate()`, with `void`). A separate block turns on `unicorn/prefer-top-level-await` (S7785) for `e2e/**` only: a Node script ends with `try { await main() } catch { ... }` instead of `main().catch(...)`. The browser app can't use it, because its build target (ES2020) has no top-level await. Sonar's S6772 (`react/jsx-child-element-spacing`) has no rule here, because `eslint-plugin-react` supports ESLint 9 at most: wrap text that follows an element in its own `<span>`. Sonar's S6819 (`jsx-a11y/prefer-tag-over-role`) is covered by two `no-restricted-syntax` selectors, because `eslint-plugin-jsx-a11y` supports ESLint 9 at most: `JSXAttribute[name.name='role'] Literal[value='status']` asks for `<output>` and the same with `'group'` asks for `<fieldset>`. The status selector also matches the `"status"` branch of a conditional role, so a conditional live region is an `<output role={isError ? "alert" : undefined}>`, whose implicit role is `status`; a container that holds headings or paragraphs stays a `<div role={isError ? "alert" : undefined}>`, which announces nothing in its non-error state: use it only when that state needs no announcement, and otherwise put the phrasing part in an `<output>`. An `<output>` is inline and takes phrasing content, so give it `block`, `flex` or `grid` and use `<span>` children, and give a `<fieldset>` `min-w-0`.

Check the ports first, as described in *Servers* in `references/checks.md` of `/create-pull-request`, and start the local preview only when port 3000 is free:

```powershell
Push-Location src/Frontend
npm run dev -- --host 0.0.0.0 --port 3000 --no-open
Pop-Location
```

The expected local URL is `http://localhost:3000/`. If you started the preview yourself, stop it afterwards as *Servers* describes.
