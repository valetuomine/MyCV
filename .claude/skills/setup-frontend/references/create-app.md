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

Start the local preview with:

```powershell
Push-Location src/Frontend
npm run dev -- --host 0.0.0.0 --port 3000
Pop-Location
```

The expected local URL is `http://localhost:3000/`.
