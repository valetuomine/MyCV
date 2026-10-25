# CV Background and Layout

Part of the `setup-frontend` skill. Read it before changing the CV background, the slides or their navigation.

`src/pages/components/Background.tsx` owns the page background and content layer. Keep the background decorative and behind the content, with `aria-hidden="true"` and `pointer-events-none`. It layers soft accent glows, a masked grid (`bg-cv-grid`), a grain overlay (`bg-cv-grain`, both custom `@utility` classes in `src/index.css`), and a mouse-following spotlight driven by Framer Motion values. Keep page content in a higher stacking context than the background. Use a single `<main>` landmark per page (`Background` renders a `div`).

The candidate CV shows the API-backed Profile (left text column plus the portrait on the right) followed by a "More to come" slide; it does not use a clickable navigation bar. Mouse-wheel input and ArrowDown/ArrowUp move between slides. Keep the selected index in Jotai through `useCandidateSectionNavigation`, clamp it to the available slide count, and pass its direction to `CandidateSectionTransition` so each slide animates in from the appropriate edge. `SectionNavigationHint` provides the visible slide count, progress, and navigation instructions. Keep these CV-specific components under `src/pages/Profile/components/CandidateCv/`.
