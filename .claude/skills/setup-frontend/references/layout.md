# CV Background and Layout

Part of the `setup-frontend` skill. Read it before changing the CV background, the name's echo in it, or the CV page's layout.

## Background

`src/pages/components/Background.tsx` frames every page except the print route (`src/pages/App.tsx`) and owns the page background and content layer. Keep the background decorative and behind the content, inside one `aria-hidden="true"`, `pointer-events-none` layer as tall as the page. Its layers, from the bottom:

- The far corner's shade (`bg-cv-light-falloff`, `--cv-shade`), in the light theme only.
- The directed light, in a box one screen tall (at least 48rem): the diagonal wash (`bg-cv-light-wash`) in its own box 130% of that size, the beam (`bg-cv-light-beam`), which a mouse pointer leans around its source on a spring, in a box that reaches 35% below the screen, the resting band, a still copy of the echo's box (`bg-cv-light-echo`) that stays across the page, `LightSweep`, the one band of light (`bg-cv-light-sweep`) that crosses the page from the left when the name's reveal starts, and `LightEcho`, its copy from the bottom up (`bg-cv-light-echo`), which starts in the same frame and again on every click or tap on the name. `--cv-light` sets the strength of all five. Reduced motion stops the lean, the sweep and the echo but keeps the resting band, which doesn't move, and forced colours hide the light and the shade.
- The dot grid: `bg-cv-dots` with `bg-cv-dots-fade`, 1px `--cv-dot` dots in the middle of 24px cells, masked by `radial-gradient(78% 72% at 20% 12%, #000 18%, transparent 100%)`, toward the light, and by a second mask that fades them out under the resting band. That mask follows the band's 15° tilt and middle, so change it together with the band's position in `Background`.
- The spotlight (`bg-cv-spotlight`) and the lit dots under it (`bg-cv-dots-lit`, 75% accent), which follow a mouse pointer on a spring (stiffness 100, damping 20). Touch and reduced motion keep them off screen.
- `DotEcho`, the lit dots under the sweep and the echo (see below).
- Grain (`bg-cv-grain` at 6%).

The utilities and the `--cv-dot` token are custom `@utility` classes and variables in `src/index.css`. Keep page content in a higher stacking context than the background. Use a single `<main>` landmark per page (`Background` renders a `div`).

## The Name's Echo

`src/pages/components/LightEcho.tsx` draws the echo's light and `src/pages/components/DotEcho.tsx` the dots under it. `DotEcho` is a canvas over the dot layers. It is transparent at rest and draws only the dots that a band of light or the spotlight reaches. Keep these properties when changing it:

- **Same grid.** It draws on the 24px grid, with dot centres 12px into each cell from the layer's top-left, and through the same fade mask (`fadeMask`), so its dots land on the static ones. It leaves out the mask that hides the static dots under the resting band, so a passing band lights the dots there too. When `bg-cv-dots`, `bg-cv-dots-fade` or `bg-cv-dots-lit` changes, change the matching constants and masks in `DotEcho` too.
- **Driven by the name only.** The echo's bands come from `nameEchoAtom` (`src/state/nameEchoAtom.ts`). `useNameWeightPlay` writes a new number when the name's reveal starts and on every click or tap on the name, and sets it back to null when the name unmounts. It also adds one to `lightSweepAtom` (`src/state/lightSweepAtom.ts`) when the reveal starts, unless motion is reduced. `DotEcho` reads both atoms along with `LightSweep` and `LightEcho`, so each band on the canvas starts together with its band of light. `DotEcho` subscribes with `store.sub`, so neither atom re-renders it, and swells the dots under the spotlight only while the echo atom isn't null, which leaves the other pages' backgrounds unchanged. Don't start bands from anything else, such as clicks elsewhere on the page.
- **Same sweep and echo.** The canvas's bands have the duration, curve, angles (105° and 15°) and travel of `animate-cv-light-sweep` and `animate-cv-light-echo`. When the keyframes, the bands' size or the height of the sweep's box change, change `bandMs`, `bandEase`, `bandStart`, `bandTravel`, `bandFadeShare`, `sweepBandShare`, `sweepBoxRem`, `echoBandShare` and `bandDirections` in `DotEcho` too. `maxEchoes` in `nameEchoAtom.ts` limits both the canvas's and `LightEcho`'s echoes, and `DotEcho` drops its echoes when the atom goes back to null, as `LightEcho` does.
- **Draws only while something moves.** It schedules frames with Framer Motion's `frame.render`, so the swollen dots move in the same frame as the spotlight's spring, and stops once no band runs and the spring rests. The bands take their age from the frame's `timestamp`, the clock of their CSS animations, because `delta` is capped at 40ms and would fall behind the band on long frames. Check in the browser that the canvas draws nothing at rest.
- **Small canvas.** It sizes itself on its first draw, and again on the next draw after a resize or a move to a screen with another pixel density, at most 2× the CSS pixels and 1× above 4 million CSS pixels, so pages that never draw keep a 0×0 canvas. The colours come from `--cv-dot` and `--cv-accent` and are read again when `data-theme` changes.
- **Off for reduced motion.** Reduced motion leaves the canvas out and `useNameWeightPlay` writes no echo or sweep. Print and forced colours hide the canvas.

The values (band size, strength, swell) and the directions that were tried and rejected are in `DESIGN.md` under Background.

## Layout

The candidate CV is a single section: the API-backed Profile, with the text column on the left and the portrait on the right from `lg` up, stacked below that (`src/pages/Profile/components/ProfilePage.tsx`). The slides, their wheel and arrow-key navigation and the progress hint were removed while the only second slide was a "More to come" placeholder. `DESIGN.md` keeps their behaviour under Section Transitions for when real content sections exist.
