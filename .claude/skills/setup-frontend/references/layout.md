# CV Background and Layout

Part of the `setup-frontend` skill. Read it before changing the CV background, the name's echo in it, or the CV page's layout.

## Background

`src/pages/components/Background.tsx` frames every page except the print route (`src/pages/App.tsx`) and owns the page background and content layer. Keep the background decorative and behind the content, inside one `aria-hidden="true"`, `pointer-events-none` layer as tall as the page. Its layers, from the bottom:

- Two static accent glows (`bg-cv-glow`).
- The dot grid: `bg-cv-dots` with `bg-cv-dots-fade`, 1px `--cv-dot` dots in the middle of 24px cells, masked by `radial-gradient(70% 60% at 50% 30%, #000 20%, transparent 100%)`.
- The spotlight (`bg-cv-spotlight`) and the lit dots under it (`bg-cv-dots-lit`, 75% accent), which follow a mouse pointer on a spring (stiffness 100, damping 20). Touch and reduced motion keep them off screen.
- `DotEcho`, the name's echo (see below).
- Grain (`bg-cv-grain` at 6%).

The utilities and the `--cv-dot` token are custom `@utility` classes and variables in `src/index.css`. Keep page content in a higher stacking context than the background. Use a single `<main>` landmark per page (`Background` renders a `div`).

## The Name's Echo

`src/pages/components/DotEcho.tsx` is a canvas over the dot layers. It is transparent at rest and draws only the dots that a wave or the spotlight reaches. Keep these properties when changing it:

- **Same grid.** It draws on the 24px grid, with dot centres 12px into each cell from the layer's top-left, and through the same fade mask (`fadeMask`), so its dots land on the static ones. When `bg-cv-dots`, `bg-cv-dots-fade` or `bg-cv-dots-lit` changes, change the matching constants and masks in `DotEcho` too.
- **Driven by the name only.** Waves come from `nameEchoAtom` (`src/state/nameEchoAtom.ts`). `useNameWeightPlay` writes `{ id, x, y }` in page coordinates when the name's reveal ends (from the middle of its letters) and on every click or tap on the name (from the pressed point), and sets it back to null when the name unmounts. `DotEcho` subscribes with `store.sub`, so an echo doesn't re-render it, and swells the dots under the spotlight only while the atom isn't null, which leaves the other pages' backgrounds unchanged. Don't start waves from anything else, such as clicks elsewhere on the page.
- **Draws only while something moves.** It schedules frames with Framer Motion's `frame.render`, so the swollen dots move in the same frame as the spotlight's spring, and stops once no wave runs and the spring rests. Waves age by the frame loop's `delta`, so a hidden tab pauses them. Check in the browser that the canvas draws nothing at rest.
- **Small canvas.** It sizes itself on its first draw, and again on the next draw after a resize or a move to a screen with another pixel density, at most 2× the CSS pixels and 1× above 4 million CSS pixels, so pages that never draw keep a 0×0 canvas. The colours come from `--cv-dot` and `--cv-accent` and are read again when `data-theme` changes.
- **Off for reduced motion.** Reduced motion leaves the canvas out and `useNameWeightPlay` writes no echo. Print and forced colours hide the canvas.

The values (wave speed, crest, fade, swell and push) and the directions that were tried and rejected are in `DESIGN.md` under Background.

## Layout

The candidate CV is a single section: the API-backed Profile, with the text column on the left and the portrait on the right from `lg` up, stacked below that (`src/pages/Profile/components/ProfilePage.tsx`). The slides, their wheel and arrow-key navigation and the progress hint were removed while the only second slide was a "More to come" placeholder. `DESIGN.md` keeps their behaviour under Section Transitions for when real content sections exist.
