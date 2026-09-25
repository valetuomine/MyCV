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

Use the component from `src/components/Grainient.tsx` and import it with:

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
