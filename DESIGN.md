---
name: MyCV
description: A quiet, dark-first CV page where the candidate's name is the artwork and one emerald accent does all the signalling.
colors:
  accent: "#007761"
  accent-strong: "#035e4e"
  accent-ink: "#ffffff"
  accent-core: "#044e42"
  accent-deep: "#2dd4b0"
  accent-dark: "#3dd1b2"
  accent-strong-dark: "#75e2ca"
  accent-ink-dark: "#03130f"
  accent-core-dark: "#b1f7e4"
  accent-deep-dark: "#063d2f"
  paper: "#fafafa"
  surface: "#ffffff"
  line: "#e4e4e7"
  field-line: "#8a8a93"
  field-surface: "#ebf4f2"
  field-border: "#8dbbb4"
  ink: "#09090b"
  copy: "#3f3f46"
  muted: "#56565f"
  meta: "#6e6e77"
  danger: "#dc2626"
  wash: "rgb(9 9 11 / 0.025)"
  midnight: "#09090b"
  surface-dark: "#111113"
  line-dark: "#26262b"
  field-line-dark: "#6b6b74"
  field-surface-dark: "#152020"
  field-border-dark: "#2f675e"
  ink-dark: "#f4f4f5"
  copy-dark: "#b4b4bb"
  muted-dark: "#9e9ea6"
  meta-dark: "#85858e"
  danger-dark: "#f87171"
  wash-dark: "rgb(255 255 255 / 0.03)"
typography:
  name:
    fontFamily: "Great Vibes, cursive"
    fontSize: "clamp(2.5rem, calc(100cqi / var(--name-width, 6.5)), min(6rem, 18cqi))"
    fontWeight: 400
    lineHeight: 1.1
  display:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "clamp(2.75rem, 11cqi, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.05em"
  heading:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.1em"
rounded:
  input: "0.5rem"
  panel: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "2.5rem"
  xl: "3.5rem"
  page-gutter: "clamp(1.5rem, 5vw, 5.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "0.625rem 0.875rem"
  portrait-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

# Design System: MyCV

## Overview

**Creative North Star: "The Quiet Exhibit"**

The candidate's name is the exhibit and everything else is gallery wall. A zinc-neutral canvas, a single emerald accent and a large name signed in a script carry the page. Chrome stays small: mono eyebrow labels, pill buttons and a thin-lined portrait panel. The system is dark-first in feel but ships equal light and dark themes switched by the visitor.

Atmosphere comes from one directed emerald light that falls in from the top-left corner, the same way as on the portrait card, with a faint dot grid, film grain and a pointer-following spotlight on top, all low opacity and non-interactive. They add depth without competing with content. Motion has one authored moment: the directed light comes on from dark, two bands of light cross the page together, one from the left and one from the bottom, and hand over to the portrait's foil sweep while the name assembles letter by letter, each letter rising from its clipped baseline while it sharpens from a thin blur, the rest of the page follows in a short staggered rise-in. The background moves only for the name and the pointer: clicking or tapping the name sends another echo, and at rest the light and the dots stay still. Afterwards the page answers the mouse: the name catches the spotlight and glows, the dots under the spotlight swell slightly, the background's beam leans toward the pointer, the portrait card behaves like a physical object that tilts toward the pointer with its initials floating above it, and the actions lean toward the pointer. Every effect serves the name or the visitor's action. Pointer effects play only for a mouse (on touch screens a tap on the name sends its echo, and the home page's serif heading runs a weight wave), and everything stops for reduced motion.

**Key Characteristics:**

- One accent colour on a zinc neutral scale. Its light has depth, from a deep haze to a hot core.
- A large script name (up to 6rem), set against serif headings, a sans for facts and small mono labels.
- Pill-shaped actions, soft rounded panels, hairline borders.
- Flat surfaces; depth from ambient background, not stacked cards.
- Equal light and dark themes via semantic `cv-*` tokens.

## Colors

A restrained zinc palette with one emerald accent. The colour (hex) values live in the frontmatter above and in `src/Frontend/src/index.css`, and nowhere else; this text names the tokens and never repeats their values. Components use only the semantic `--cv-*` variables defined in `index.css`, which `data-theme` on `<html>` swaps.

### Primary

- **Deep Emerald** (`accent`, light theme): accent for the primary button, job title line and focus outlines. It leans a little toward cyan, the colour of green light in haze, with white ink on it at 5.5:1.
- **Mint Signal** (`accent-dark`, dark theme): the same role on dark; its ink colour is **Near-Black Green** (`accent-ink-dark`).
- **Accent Strong** (`accent-strong`): the primary button's hover fill, and accent text on the background's light, such as the text button, the CV's job title and the form fields' labels while the field has focus; deeper than the accent in light, brighter in dark.

### Light

The background's light is the accent at three depths, as real light in haze has: a deep haze around it, the accent as its surface and a hot core in its brightest points. Only the background's light uses these; text, buttons, fields and surfaces never do.

- **Hot Core** (`--cv-accent-core`, `accent-core`): the middle of a lit dot and the dots nearest the spotlight. A pale, nearly white mint in the dark theme. On the light theme's paper, light shows as saturation rather than brightness, so there the core is the deepest emerald. In the light theme it is also the edge glow's colour (`--cv-edge-glow`), the accent tone that stands out most from the pale page.
- **Deep Haze** (`--cv-accent-deep`, `accent-deep`): the haze that the light's tail and edges fade through, so they end in a dark green rather than in a grey see-through accent. A dark green in the dark theme and a fresh, bright one in the light theme. `--cv-haze` sets its strength (16% / dark 30%).

### Neutral

- **Paper** (`paper`, dark `midnight`): page background.
- **Surface** (`surface`): panels and the portrait card.
- **Hairline** (`line`): decorative borders and dividers.
- **Field Line** (`field-line`): a grey at least 3:1 against the page, for the loading spinner's track. Form fields use Field Border instead, see Inputs / Fields.
- **Pane** (`bg-cv-pane`, from `--cv-pane-lit`, `--cv-pane-far` and `--cv-pane-rest`): the see-through, blurred surface of cards, form fields, floating panels, the language track and the featured card's skeleton, lit like the page (see Elevation & Depth). **Pane Neutral** (`pane-neutral`) is the same see-through Surface without accent, for an invalid field.
- **Field Surface** (`field-surface`) and **Field Border** (`field-border`): an accent tint over Surface (8%) and over Hairline (38%). The border frames form fields and cards; the opaque fill is left for the switch track and autofill.
- **Ink** (`ink`): headings and primary text.
- **Copy** (`copy`): body text.
- **Muted** (`muted`) and **Meta** (`meta`): secondary info; both at least 4.5:1 on page and surface. Small text in the background's lit area, such as the eyebrow's meta text (the CV's update date) and the form labels at rest, uses Muted, because Meta falls below 4.5:1 on the light, and small accent text there, such as the CV's job title and the form fields' labels, uses Accent Strong for the same reason. Field placeholders are Muted too, because the see-through Pane lets the light under it. Meta stays in the PDF, which has no background light.
- **Danger** (`danger`): validation errors only.

### Named Rules

**The One Voice Rule.** The accent marks identity, action and focus only. It never fills large areas. Glows stay at or below 10% opacity, with these exceptions. The edge glow of controls, fields and cards is one: 32% in the light theme and 24% in the dark at rest, 48% and 42% on hover, 60% and 50% on focus (see Shadow Vocabulary), because at 10% a control vanished into the background's light. The background's directed light is another, 16% at its peak in the top-left corner and carried past the first screen, and one band of it rests across the page at about 11% in the dark theme and 20% in the light theme, where the same accent shows far less. Both fade out with no visible end, so they read as light rather than as a coloured area. The name's halo is another exception: a thin drop-shadow around the letters nearest a mouse pointer, up to 70% accent in the dark theme and 30% in the light theme, because it has to show against the page's own light. The Pane is a further exception, because cards and fields sit in that light and would otherwise show as black boxes: in the dark theme its lit corner carries 12% accent over a mostly see-through Surface; in the light theme its far pane carries 6% accent over a half see-through Surface, with the 4% light of the bottom-right corner on top, so about 15% of the colour there is accent. Body text and placeholders (Muted) stay at 4.5:1 or more on the Pane's brightest point in the dark theme and its darkest point in the light theme, also over the background's light.

The light's Deep Haze and Hot Core are the same voice at other depths, not further colours. There is no second hue: a muted yellow-lime kept for thin rays of light was removed when the rays were left out (see Background, Rejected). Orange was rejected: it lies far enough from the green to read as a second brand colour, it sits beside Danger red, where it would look like a warning, and with green it turns the light into flames, which is a different picture from light in haze.

**The Semantic Token Rule.** Components use `cv-*` utilities, never raw hex or Tailwind palette colours, so both themes stay in sync.

## Typography

**Name Font:** Great Vibes (`--font-cv-name`, one weight, with cursive)
**Display Font:** Fraunces Variable (`--font-cv-display`, with its optical size axis, with ui-serif, Georgia)
**Profile Font:** Sora Variable (`--font-cv-profile`, with ui-sans-serif, system-ui)
**Body Font:** Geist Variable (`--font-cv-sans`)
**Label/Mono Font:** Geist Mono Variable (`--font-cv-mono`, with ui-monospace)

All five are self-hosted through Fontsource packages imported in `src/Frontend/src/main.tsx`, never loaded from Google Fonts. Every one is under the SIL Open Font License.

**Character:** Each voice has one job. The candidate's name is signed in a script, the one personal, hand-made mark on the page. Headings and the home page's text speak in a soft variable serif, so the product reads as its own rather than as the default sans of many apps. The profile's details beside the name (the job title, the cards, the portrait's initials and the printed CV) are a geometric sans, which keeps facts crisp next to the script. Body copy stays in Geist and metadata in Geist Mono. Hierarchy still comes mostly from scale, tracking and colour; the families separate roles, not levels.

### Hierarchy

- **Name** (Great Vibes 400, clamp(2.5rem, 100cqi / the name's width, min(6rem, 18cqi)), 1.1, no tracking): the candidate's name on the CV. The script reads best on one line, like a signature, so its size fits the name itself on one line in its column: the column's width divided by the name's measured width on one line in em, so a long name gets smaller instead of wrapping. Only a name too long to fit at 2.5rem wraps, and a short name stops at 18% of its column, so it never towers over a narrow one. Until the font is measured, and in the skeleton, a usual two-part name's 6.5em holds; the script's Latin file is preloaded (`index.html`), so the measured size usually lands before the reveal. It has one weight, so it glows under a mouse pointer but has no weight play or weight wave (see Name). The edit view's preview sets it at 3.25rem and the home page's featured card fits it the same way beside the portrait, between 1.625rem and min(3rem, 18cqi), so a usual two-part name stays on one line on a phone too and the card reads as a preview of the CV it opens.
- **Display** (Fraunces 600, clamp(2.75rem, 11cqi, 4.5rem), 1.02, tracking -0.05em): the home page's heading, which reveals and plays its weight axis like the name used to (see Name), while every letter keeps its weight-600 width. Beside the featured card it stays on at most three lines.
- **Title** (Sora 500, 1.25-1.5rem, tracking -0.025em): job title in accent colour. The portrait's initials and the printed CV's name are Sora 600.
- **Body** (400, 1.125rem, 1.625): summary text, capped at 52ch.
- **Heading** (Fraunces 600, 1.25rem, 1.25, tracking -0.025em, balanced, Ink): every secondary heading (`h2`) in the app's views, such as Open a CV by its link, Profile picture, Sign-in methods and the sign-out warning, from one shared class (`headingClassName`, `src/Frontend/src/pages/components/headingClassName.ts`). Layout and spacing are added where it is used. The name on the featured CV card is set in the Name's script, not as a secondary heading, and the printed CV keeps its own section headings.
- **Label** (500 mono, 0.75rem, line height 1rem, tracking 0.08em, uppercase, Muted): form field labels (Accent Strong while the field has focus), the edit view's CV link label and short hints beside a heading, such as Profile picture's "Saved right away", from one shared class (`labelClassName`, `src/Frontend/src/pages/components/labelClassName.ts`). The printed CV keeps its own labels.
- **Eyebrow** (the `Eyebrow` component, `src/Frontend/src/pages/components/Eyebrow.tsx`): the small line above a page's or section's heading, such as "Curriculum vitae | Updated 2.11.2026" on the CV. An 8px status dot (the accent, red for an error, pulsing for a live or pending state except for reduced motion and in print), then the label in the Label style (500 mono, 0.75rem, tracking 0.08em, uppercase) but in Ink rather than Muted, so it reads crisply on the background's light. Optional meta text, such as the update date, follows a thin 12px rule (Muted at 40%) in Geist sans at 0.8125rem with tabular figures in Muted, which keeps 4.5:1 on the light. The meta text and its rule wrap together, and the row keeps a 1rem line height, which the skeletons reserve. Every eyebrow line above a heading in the app's views comes from this component; the printed CV keeps its own.

### Named Rules

**The Mono Whisper Rule.** Geist Mono is for labels and metadata only, always small; never for paragraphs.

**The Container Size Rule.** Display text (the name, the home heading, the featured card's name) is sized by the column it sits in, never by the window: its nearest real container is a container query container (`@container`), and the size is a `clamp()` in `cqi`, from one shared class each (`displayTypeClassNames.ts`). So the text shrinks when a card beside it takes room and grows back when the column widens. Body copy, labels, buttons and `h2` headings keep fixed sizes: body copy stays at 16px or more, and every button keeps a touch target of at least 44px.

## Layout

A single full-height column (`min-h-dvh`) with a fluid page gutter of clamp(1.5rem, 5vw, 5.5rem). The profile view is a two-column grid at `lg` (1.5fr text, 1fr portrait) with 3.5rem to 4rem gaps; below `lg` it stacks. When the owner hides the picture section, the grid has one column and the text caps at `max-w-5xl`, so the name and summary fill the top of the page instead of leaving an empty column. Text blocks are left-aligned with `max-w` caps (52ch body). The page controls (see Page Controls) are pinned top right in the gutter. Spacing rhythm is generous and uneven on purpose: tight between label, name and title, then 2.5rem before actions.

## Elevation & Depth

Flat by default. Surfaces are separated by hairline borders and tonal difference, not shadows. Depth lives in the background layer.

**Pane:** cards, fields and floating panels are see-through with a 16px backdrop blur, so the page's light, haze and sweeps show through softly and the dot grid blurs away. Along the box's diagonal (`to bottom right`, so it holds at any aspect ratio) the top-left corner fades on the background light's own stops to the far pane by 40%; a weaker accent light rises on the same stops mirrored from 60% to the bottom-right corner. In the dark theme the lit corner is lighter and more see-through and the far pane darker and denser; in the light theme the lit corner is the denser, whiter one and the far pane more see-through and faintly tinted. Either way the one dark part is the band from the bottom-left to the top-right corner. Floating panels (the action bar, the sign-out warning, the notice) add a 75% Surface under it (`bg-cv-pane-dense`), so the text and fields they float over don't show through. It adds no motion of its own: the background's moves show through. A fading ancestor switches the blur off until the fade ends (it becomes the blur's backdrop root), so on the home page the open form and the address pill rise in without a fade and the featured card and the pill fade only their content. The edit view's 250ms swap keeps its fade, and its Panes blur once it ends.

### Shadow Vocabulary

- **Panel** (`0 2rem 4rem -2rem rgb(24 24 27 / 0.18)`, dark `rgb(0 0 0 / 0.8)`): the portrait panel, cards and floating panels at rest.
- **Accent glow** (`0 0.5rem 2rem -0.75rem` accent at 55%): appears only on primary button hover.
- **Edge glow** (`shadow-cv-edge`, `0 0 0.875rem -0.125rem`): a halo at rest on primary, secondary, danger (in Danger), icon and switch buttons, the language track, fields and cards (`shadow-cv-card` adds it to Panel). Its colour (`--cv-edge-glow`) is the accent tone that stands out from the background, so a control stays distinct from the page in both themes: Hot Core, the deepest emerald, at 32% on the light theme's pale page, where the accent at 10% vanished into the background's own light, and the accent at 24% on the dark theme's near-black. A mouse hover strengthens it to `shadow-cv-edge-hover` (`0 0 1.125rem -0.0625rem`, 48% light, 42% dark) on every button but Text, Brand included, on fields that aren't disabled and on cards (`shadow-cv-card-hover`), so a hovered control lights up rather than turning grey or dark; on the primary button it joins the accent glow (`shadow-cv-accent-hover`). Focus strengthens it most, to `shadow-cv-edge-focus` (`0 0 1.25rem 0`, 60% light, 50% dark) beside the focus outline or ring, which stay: on a button a keyboard focus (`:focus-visible`), on a text field any focus, as the browser shows focus-visible for every text field focus. Every button variant gets the focus glow, Brand, Text and Segment included, though Brand gets none at rest, because its colours are the provider's; a disabled button has none. 200ms ease-out; no transition for reduced motion; off in print, and forced colours drop it with the other shadows.
- **Text glow** (`text-shadow-cv-edge-hover`, `0 0 0.625rem`; `text-shadow-cv-edge-focus`, `0 0 0.75rem`): the edge glow's colour and hover and focus strengths drawn round a text link's letters, which also lights its underline, because links have no edge to glow. An underline drawn as a background (`bg-cv-underline`, the edit view's CV link) takes the same glow as a drop shadow (`drop-shadow-cv-edge-hover`, `-focus`). Hover gets the hover strength, a keyboard focus the focus strength beside the outline, which stays. 200ms ease-out (250ms on the CV link, with its underline); no transition for reduced motion; off in print and in forced colours.
- **Rim** (`inset-shadow-cv-rim`, 1px inset at the top, white at 80% in the light theme and 6% in the dark): the light catching the top edge of cards and floating panels.

### Named Rules

**The Flat-By-Default Rule.** Shadows are earned: the portrait panel, cards and floating panels get one at rest, and buttons none: their hover strengthens the edge glow instead. The edge glow and the rim are light, not elevation, so they don't count against it.

## Shapes

Three radii: **pill** (full) for buttons and the theme toggle, **panel** (1.5rem) for the portrait card, **input** (0.5rem) for form fields. 1px hairline borders everywhere. Corners never mix within a component.

## Components

### Buttons

Every button and button-styled link is the shared `Button` component (`src/Frontend/src/pages/components/Button.tsx`); no component writes its own button styles.

- **Shape:** pill (9999px), padding 0.625rem 1.25rem, 0.875rem medium text, at least 44px tall. The small size looks 36px tall but keeps a 44px touch target.
- **Primary:** accent fill with accent ink text; hover deepens the fill to Accent Strong and adds the accent glow and the hover edge glow.
- **Secondary** (the default)**:** faint wash with the accent-tinted Field Border as its hairline, like the fields, so the pill's edge shows on the background's light in both themes; hover turns the border to the accent at 70%, tints the fill with 8% accent and strengthens the edge glow, so the pill lights up rather than turning grey. "Edit profile" uses the same style with a dashed border.
- **Danger:** danger text and a half-strength danger border; hover makes the border full strength, adds a 10% danger tint and strengthens the danger-coloured edge glow. Used to confirm a removal.
- **Icon:** a 44px circle with the secondary look, for the theme toggle; it needs an `aria-label`.
- **Text:** an underlined Accent Strong label without a fill, such as Read more; hover turns the label and underline to Ink and lights the text glow round both (see Shadow Vocabulary), and a keyboard focus lights it strongest beside the focus outline. The edit view's CV link, whose accent underline grows from the left on hover, glows the same way.
- **Brand:** the Microsoft and Google sign-in buttons in each provider's own colours, the providers' light variant in the light theme and their dark variant in the dark theme, each with a faint inner hairline (the dark Microsoft button also gets a visible `#6b6b6b` border, because the guideline has none and it would vanish into the dark background); stacked at one width (20rem, at most the screen less the gutters) with Open a CV and the other secondary action under them, 0.75rem apart. The "Last used" badge sits on the top edge of its button, ringed in the page colour; hover lays a faint 8% layer of the button's own text colour over it, which shows on any brand colour in both themes, and lights the accent edge glow around it, outside the provider's colours.
- **Hover rule:** every usable button changes visibly on hover; a shadow alone doesn't count. Unavailable and loading buttons don't react.
- **Press / Focus:** `scale-[0.97]` on active (icons 0.92); 2px accent outline, 2px offset on focus-visible, with the edge glow strengthened beside it (see Shadow Vocabulary); 200ms ease-out. Reduced motion keeps the colour changes and drops the press scale. External links add a "↗" that nudges up and right on hover.
- **Pointer pull:** with a mouse, the CV's actions (Copy CV link, View as PDF, GitHub, LinkedIn, Edit profile) lean toward the pointer by about a quarter of its offset from their centre, a little more vertically, on a spring (stiffness 220, damping 15). Not in the edit view, and off for touch and reduced motion.
- **Link logos:** the GitHub and LinkedIn links show the brand's monochrome logo (`BrandIcon`, 1em, in the text colour, hidden from screen readers) before the label on the CV, the featured card and the edit preview. The PDF's Links section shows the logo and the user name of a GitHub or LinkedIn profile (the address as typed, without its scheme, for any other link) instead of the full address, and the link stays clickable.
- **Copy link:** the label swaps to an accent check mark and "Copied" in the same grid cell (200ms, the check draws in over 300ms), so the width never jumps, and each successful copy sprays 14 small accent dots outward from the button's centre (950ms, `cubic-bezier(0.16, 1, 0.3, 1)`). It resets after 2 seconds and announces the copy to screen readers. No dots for reduced motion.
- **Loading:** a small spinner and the loading label ("Saving…") replace the label in place, so the button keeps its width; it keeps focus and ignores clicks.
- **Unavailable:** 60% opacity and a not-allowed cursor. A button whose reason is shown beside it, or that becomes unavailable while focused, stays focusable (`aria-disabled`).

### Inputs / Fields

Every field is `RHFInput` or `RHFTextarea`, framed by the shared `FormField` (`src/Frontend/src/pages/components/`). Floating labels are not used: the mono label above the field is the design.

- **Style:** 0.5rem radius, 1px hairline border in an accent-tinted line colour (`--cv-field-border`, 38% accent over Line) and the Pane as its surface (see Elevation & Depth), like the preview panel, so the fields and the preview read as one set, belong to the background's emerald light, and the page's dot grid blurs away behind them. The resting edge glow sits around the frame and strengthens on focus. An invalid field returns to Pane Neutral, with a danger-coloured edge glow, so the green doesn't mix with the error red. Mono uppercase label above with the character count at its right. The surface is drawn by the `FormField` frame and the field itself is transparent, so the hover tint sits between the surface and the text.
- **Why no 3:1 border:** the field border is deliberately below 3:1 against the page in the light theme (about 3:1 in the dark theme). A field is always identified by its visible label, and its hover border, focus ring and error ring all stand out clearly. Keeping the grey field-line border with only the fill changed was considered and rejected, because the fields would no longer match the preview panel.
- **Hover (mouse):** the border turns to the accent at 60% and the edge glow strengthens (`shadow-cv-edge-hover`, danger-coloured on an invalid field), and an accent light follows the pointer around the border (an 8rem radial gradient at 70% accent, masked to the field's outer 2px) with an 8% tint in the fill under it (a wider 10rem radial gradient). Its position goes to CSS variables once per animation frame. No light for touch, reduced motion or disabled fields; on an invalid field it is danger-coloured.
- **Focus:** a 3px accent ring at 20%, the label turns accent, and an accent light travels around the border, one lap every 8s like the panels' sweep (a comet a fifth of the border long that brightens smoothly from tail to head, built from ten overlapping 6rem radial glows like the hover light, that follow the border on a CSS motion path (`offset-path: inset(0 round 0.5rem)`) a little apart; it shows on the field's outer 2px, the thickness of the orbiting light on the portrait panel). Browsers without shape motion paths show no travelling light. The border keeps its accent-tinted resting colour, so the travelling light reads as the brighter accent on it. Unlike the panels' angular sweep, the light follows the border, so it keeps its speed on the long and short edges of a wide field and its tail bends around the corners without pausing. It runs only on the focused field and is paused on the others.
- **Drift (hover and focus):** a soft accent light, half the field wide (a radial gradient at 22% accent, a deliberate small exception to the 10% glow cap so the drift reads on the accent-tinted surface, where its peak lowers the placeholder contrast to about 3:1 for as long as it passes; it fades out from its centre and covers only part of a small field), sways slowly from side to side inside the field, 6s each way on an ease-in-out curve, on its own timing apart from the border lights. It fades in over 300ms, pauses where it is when the field is left, and resumes from there. It sits under the text like the hover tint, turns danger on an invalid field, and is off for reduced motion and disabled fields.
- **Error:** danger border and 3px danger ring at 20%, with or without focus, and no travelling light. The message opens below the field (`grid-template-rows` 0fr to 1fr with a fade, 200ms) in a `role="alert"` element, and keeps its text while closing. When a submit leaves the field invalid it shakes once sideways (±4px, settling, 300ms); typing never shakes it.
- **Character count:** on every field with `maxLength`, in mono `tabular-nums` (`12 / 100`). Muted and shown only while the field has focus, then always visible from 90% of the limit in accent, and danger at the limit. It is part of the field's `aria-describedby`, never a live region, so screen readers don't read it on every keystroke.
- **Description:** an optional hint below the field and its message, in muted 0.875rem text, that is also part of the field's `aria-describedby`, such as the CV link preview in the create view.
- **Action:** an optional control in the field's row, such as the home page's Open CV button, as tall as the field and level with it however the label wraps. Focusing it doesn't light the label or the count.
- **Textarea:** grows with its text (`field-sizing: content`, at least 4 lines, at most 70dvh, then it scrolls); browsers without `field-sizing` fall back to fitting the height in script.
- **Autofill:** an opaque inset shadow in the field surface colour and an ink text fill keep autofilled fields on theme in both themes. It stays opaque rather than see-through like the Pane, because the browser's own autofill colour sits underneath and can't be cleared reliably, so an autofilled field shows the flat Field Surface tint inside its frame.
- **Disabled:** 60% opacity on the whole field, surface included, and a not-allowed cursor.
- **Reduced motion:** no pointer light, travelling light, drifting light, shake or height animation; a focused border turns accent instead, and the colour, ring and message still change, so every state stays distinct.
- **Placeholders:** realistic examples (`https://github.com/username`, `Helsinki, Suomi`) or none, never "Enter …"; the label already says what goes in.
- **Rejected surfaces:** compared in the real app in both themes with a switch: (A) a flat see-through pane with the same blur, which still read as a box of one tone against the page's diagonal light; and (B) copies of the background's light painted on an opaque base against the viewport (`background-attachment: fixed`), which can't follow the beam's lean, the sweep, the echo or scrolling, and left the dark field darker than the page. The chosen pane is A's blur under the diagonal light described in Elevation & Depth. The Task's first brief kept the bottom-right corner dark; the user chose a lit corner, so the only dark part is the middle band.
- **Text link** (the CV link in the edit view): a half-strength accent underline at rest; on hover the text turns accent and a full accent underline draws over it from the left (250ms). Reduced motion keeps only the colour change.

### Edit View

- Same two-column grid as the CV: the form on the left, a sticky **live preview** on the right from `lg` up. The preview is a portrait-style panel with the orbiting border highlight that shows the Finnish CV (name, title, location, summary, link pills) updating as the fields change. It repeats the form, so it is `aria-hidden`.
- **Width:** from `2xl` (1536px) up the edit view widens past `max-w-7xl` to 84.6rem, and only the edit view: the CV keeps `max-w-7xl`. The form column keeps the 45.6rem it has at 80rem, so all the extra room goes to the preview, which grows from about 30rem to 35rem. That fits a long name such as "Valtteri Tuominen Azure" on one row with a little room to its right; a wider card left too much empty space beside the text.
- **Preview lights:** the preview card lights up like the fields. With a mouse, a light follows the pointer around its border and tints the surface beneath the text (the fields' hover light, on the panel's 2px border). While the card is hovered or any field has focus, the fields' drift light sways slowly from side to side inside the card, under the text, and pauses where it is otherwise, so the card wakes while the profile is edited rather than moving all the time. On the card's larger surface the drift is 16% accent, because the fields' 22% reads as a heavy blob there. Touch gets no pointer light, and reduced motion neither light.
- Header: accent-dot mono eyebrow "Editing" above the "Edit profile" title. The CV link is shown as the full address with a Copy link button, not as a disabled field.
- **Profile picture:** a section between the CV link and the fields, at every width (not in the preview), set off by hairlines above and below. Its heading matches the language sections, with a mono "Saved right away" tag, because each picture change is saved at once through its own request and Save and Cancel leave it alone; the hint says so. A 6.5 × 8rem portrait tile (1.5rem radius) shows the picture, or the initials over the accent wash. Small buttons: Choose picture (Change picture once there is one), which opens the device's picker (camera or gallery on a phone), Use Google picture for a Google sign-in only, and Remove picture, which asks in place with a danger Remove and Keep. The busy button shows its spinner while the others are disabled. The outcome shows below as a status or, for failures, an alert in the danger colour, worded by the status code: too large, wrong file type, no permission, changed elsewhere at the same time, a service not answering, storage not set up.
- Basic details: full name on its own row, GitHub and LinkedIn side by side from `sm` up.
- **Action bar:** a floating panel (1.5rem radius, hairline border, Pane with the rim, panel shadow) sticky 1rem above the bottom edge. Save is disabled until something changes; a mono status in Copy (not Muted, which can drop below 4.5:1 where bright text lies behind the see-through bar in the dark theme) reads "No changes" or "Unsaved changes" with an accent dot. Cancel with unsaved changes swaps the bar to "Discard your unsaved changes?" with Keep editing (primary) and Discard; closing the tab with unsaved changes asks the browser to confirm.
- **Focus:** entering edit mode focuses the title; leaving it (Save, Cancel or Discard) focuses the Edit profile button.
- **Transition:** the outgoing view fades and lifts 1rem, then the incoming one rises 1.5rem and fades in, 250ms `cubic-bezier(0.23, 1, 0.32, 1)`, one at a time. Returning to the CV replays its entrance. A successful save shows a "Profile saved" notice.

### Notice

- Bottom-centre pill (hairline border, Pane with the rim, accent dot) that fades and rises 8px in for 4 seconds, inside an always-present `role="status"` region. Used for "You've signed out" and "Profile saved".

### Loading Skeleton

- **Structure:** `ProfileSkeleton` repeats the CV's layout line for line, in the same page wrapper (`py-12 sm:py-16`, `overflow-y-clip`) and grid: the eyebrow, a one-line name at the name's own size, sized like a usual two-part name of about 17 letters (the script name fits one line, like a signature), the title, the location, the summary (four lines, seven below `sm`, where the same text wraps into the narrow column) and a row of four 44px pills, beside a portrait card the height of the photo card (clamp(20rem, 68dvh, 40rem), 2px hairline border, panel shadow), because the CV's profile has a photo. Each line carries its text's size and leading and is one line tall (`h-lh`), with the bar centred inside it. Measured at 1440 × 900 and 390 × 844 with a one-line name and a summary of about four lines, the text column and the portrait land on the CV's coordinates; a name that wraps, a longer summary (over 300 characters it also gets Read more) or a profile without a photo still moves a little. Text bars are `rounded-lg` (the name's `rounded-xl`); only the pills are full pills. The PDF route has its own `ProfilePdfRouteSkeleton` in the PDF view's layout (the way back, eyebrow, name, two pills and the empty frame), so its loading doesn't show a CV's shape.
- **Fill:** shapes are Overlay and the cards and frames are see-through Wash, never an opaque Surface. The featured CV's skeleton is the exception: it wears the card's own frame (Field Border, Pane, rim and card shadow), because the card that replaces it is a Pane. While anything loads, the page's light and dots stay visible through it, which a solid near-black panel in the dark theme and a white one in the light theme cut out. The same applies to the PDF frame and to the portrait card while its photo loads.
- **Timing:** the shapes stay invisible for the first 300ms of a load and then fade in over 200ms (`animate-cv-fade-in-delayed`), so a load under 300ms goes straight to the content. The clock runs from the load's first skeleton (`useSkeletonTiming`), so when the route's `Suspense` fallback hands over to the route's own skeleton, a skeleton already on screen stays and its shimmer keeps its phase. The `role="status"` text and `aria-busy` are there from the start.
- **Shimmer:** every shape is `cv-skeleton`: one band of the background's light (`--cv-light` at 60%, about 10% accent) at the portrait foil's 105° angle, in 2.4s rounds, 70% of each on the foil's `cubic-bezier(0.45, 0, 0.2, 1)`, then a rest. The shapes paint it against the viewport (`background-attachment: fixed`), so one light runs across all of them rather than one per shape. Where a browser treats `fixed` as `scroll` (iOS Safari, and under a transformed ancestor such as the tilting portrait card), each shape gets its own band, still in step. The CV, PDF and sign-in methods skeletons, the PDF's indicator page and the portrait's photo placeholder share it. Reduced motion stops it, and the shapes stand still.
- **Rejected:** the skeleton pulse, compared with the shimmer in the real app in both themes. The pulse is quieter, but the shimmer reads as the page's own light passing and was preferred. The page skeletons shimmer only before the CV arrives, so they never play together with the name's sweep, which stays the page's one authored moment. The one shimmer that can overlap it is the portrait's photo placeholder while a slow photo loads, a light confined to that one card, which reads as the card waiting rather than as a second sweep across the page.

### PDF View

- **Frame:** the PDF sits in one panel (1.5rem radius, hairline border, see-through wash fill, panel shadow), `min(80dvh, 70rem)` tall, so nothing moves between loading, failure and the viewer.
- **Indicator:** a small page in A4 proportions (0.5rem radius, hairline border, wash fill) with the PDF's first page in skeleton bars, and below it "Preparing the PDF…" in Copy with a Muted hint that it can take a few seconds. A skeleton, because the PDF is the content on its way; the orbit loader keeps turning under reduced motion, and this has to stand still. The page shrinks with the frame on short screens.
- **Timing:** a first print takes about 1.5 to 5 seconds and a cached PDF about 20 ms, so the indicator holds for 300ms and then fades in over 200ms. A cached PDF never shows it. The shimmer stops as soon as the PDF has arrived, and the indicator stays under the transparent viewer until the viewer paints over it.
- **Failure:** a danger line and Try again, centred in the frame, like the fallback for browsers without a PDF viewer.
- **Print:** Ctrl + P prints only the CV's A4 layout, the same light CV on white as the download, in either screen theme. The frame, controls, heading, buttons and viewer stay off the paper.
- **Reduced motion:** the bars stand still; the indicator's fade stays.

### Name

`ProfileName` sets the CV's name in the Name style and, with `typeface="display"`, the home page's heading in the Display style. Both share everything below; what depends on the weight axis plays only in the variable serif, because the script has one weight.

- Type with an ink-to-muted fade, set one element per letter so each letter rises from behind its word's clipped bottom edge while it sharpens from a 14px blur and fades in: 0.9s, `cubic-bezier(0.22, 1, 0.36, 1)`, letters spread over at most 0.6s. In the serif the letters also move from weight 200 into weight 600, in 10-unit steps on the same curve, because each weight of the variable font is its own font instance that the browser builds during layout; the rise, blur and fade run off the main thread. The edge clips only vertically, so the blur isn't cut at the sides. Screen readers get the whole name from a visually hidden copy.
- **Wrapping:** words break after a hyphen, and a part wider than the whole line wraps between its letters, so a long name never overflows at 320px.
- Splitting the letters drops the font's kerning, so each letter carries its pair kerning back as an end margin, measured with canvas in the heading's own font, read from its font token, so the measure can't drift from the token. Background-clipped text only paints inside its own box, and a script's swashes, loops and descenders reach well past a letter's advance and line box, so every letter box bleeds as far as the font's ink reaches (taken back with negative margins). The reach is measured with canvas (`actualBoundingBox*`) for the name's own letters at the heaviest weight shown once the font has loaded, at least 0.1em sideways and 0.15em / 0.08em vertically for the glow and the blur, and written to the heading's `--name-bleed-*` properties; no font gets hand-tuned constants. The edit view's preview, which is plain text, keeps fixed room of 0.35em sideways and 0.3em / 0.35em vertically.
- **Sheen:** once the letters are in, a soft oval of light (`radial-gradient(11rem 6.5rem …)`, solid to 30%) clipped to the same letters follows a mouse pointer on the spotlight's spring (stiffness 100, damping 20), so the name catches the spotlight on the pointer's line only. Its colour is the `--cv-name-light` token: Ink mixed 62% toward the accent in the dark theme, the plain accent in the light theme, where a mix with dark ink would stay near-black. Its letters copy the name's weights and widths, so it stays on the glyphs. Hidden for reduced motion, print and forced colours.
- **Glow (mouse):** once the letters are in and a mouse pointer comes within a line height of the name, the letters nearest it get a soft accent halo: a Gaussian falloff over 1.35em (vertical distance counted 1.6 times) sets each letter's glow, which scales a `drop-shadow(0 0 <spread> accent <glow × strength>%)`. The glow eases about a fifth of the way per 60 Hz frame, scaled to the actual frame time so the speed is the same on 120 and 144 Hz displays. Strength and spread are the `--cv-name-glow-strength` and `--cv-name-glow-spread` tokens (70% and 0.12em in the dark theme, 30% and 0.07em in the light one), so a theme change updates the halo at once. The halo needs vertical room above and below each word's clip, which the letter bleed provides. Weight, spacing and baseline never change under the mouse, and the halo is off in print and forced colours.
- **Weight wave (touch, serif only):** on touch screens one weight wave runs through the home page's heading from start to end (1.5s) once the letters are in, and tapping the name repeats it. A scroll that starts on the name and a mouse click don't. The wave has no glow. Every letter keeps the width it has at weight 600, measured from a hidden copy once the font is ready and whenever the heading resizes, so the wave never reflows the lines.
- **Echo:** when the reveal starts, the name sends one echo into the background together with the sweep, a band of light from the bottom up (see Background), and every click or tap on the name sends another. A mouse click sends the echo but still doesn't start the weight wave; on touch screens the echo and the weight wave start together.
- Reduced motion shows the letters at their resting weight straight away, with no blur, glow, sheen, wave or echo.
- **Rejected:** for the fonts, compared in the real app in both themes: Bricolage Grotesque, which felt cramped at the heading's tight tracking; Mona Sans, too close to Geist; Epilogue and Archivo, less distinct than Sora; and for the name Fraunces Italic, Dancing Script, Arizonia, Playwrite NO, Playwrite IT Moderna and Pinyon Script. Great Vibes was chosen for the name on the condition that no swash is ever cut off, which the measured bleed guarantees. Losing the name's weight play was accepted with it.

### Portrait Panel

- 1.5rem radius, 2px line border that carries the orbiting highlight, surface fill (see-through Wash with a photo), panel shadow. With a photo it is clamp(20rem, 68dvh, 40rem) tall. With no photo it shows the initials over a faint diagonal accent wash, at clamp(16rem, 46dvh, 26rem) from `lg` up and a compact 11rem below `lg`.
- **Depth:** the card is a 3D object (`preserve-3d`, 900px perspective). The initials float 70px above its surface and cast a soft, blurred 30% accent shadow on it, 14px below them, that lands as they fill in.
- **Initials:** traced once in a 1.25px accent outline (1.6s, `cubic-bezier(0.65, 0, 0.35, 1)`, after 0.5s), then filled to 80% accent. Shown filled straight away for reduced motion.
- **Hover (mouse):** tilts up to 11° toward the pointer on a spring (stiffness 140, damping 16), and the initials' shadow shifts against the tilt. The border lights up in accent under the pointer (a 220px radial glow at 85% on the 2px border), a soft glare follows the pointer (25% accent), and a foil of thin accent and ink bands slides across with the tilt. An accent highlight orbits the border.
- **Foil sweep:** 0.9s after load the foil sweeps across the card once (1.6s, `cubic-bezier(0.45, 0, 0.2, 1)`), also on touch screens. Off for reduced motion; foil, border light and shadow are hidden in print.
- **With a photo:** the card is the photo's height from the first frame, so nothing moves when the photo arrives; until it loads, the card is see-through Wash with the skeleton's shimmer crossing it. The border's line and lights sit in a layer masked to the 2px ring (`mask-cv-ring`), so they never show through the card. The photo then fades in, sharpening from a 10px blur and settling from 1.03 scale (0.8s, the name's `cubic-bezier(0.22, 1, 0.36, 1)`), and the foil sweep crosses it 0.5s after it loads. The tilt, the orbiting highlight and the border light under the pointer stay in the accent, because the border carries the CV's identity. Over the photo, the glare (40%) and the foil bands (40% and 18%) are neutral light (`--color-cv-sheen`, the same in both themes) laid on with `mix-blend-overlay`, so they brighten the photo without tinting it green. Reduced motion shows the photo at rest as soon as it loads. A photo that fails to load gives way to the monogram. The photo is cropped to the card with `object-cover`; there is no cropping UI. A photo with transparent areas shows the page's light and dots through them, since the card under it is Wash.
- **Why no colour from the photo:** picking a highlight colour from the photo was rejected. It would be a second hue against the One Voice Rule, and a grey or beige photo would give a muddy border whose contrast can't be guaranteed in either theme.
- **In the PDF:** the photo sits beside the name in the header, 7rem square and rounded like the card, with a hairline border. Without one, the header is unchanged.
- **Scroll (stacked layout, below `lg`):** a CSS scroll-driven animation (`animation-timeline: view()`) rises the panel from 3rem lower, tipped back 14°, at 40% opacity, and settles it by the time it is fully in view. A panel already in view on load is at rest. Browsers without scroll timelines, and reduced motion, show it at rest.

### Page Controls

- `PageControls` (`src/Frontend/src/pages/components/PageControls.tsx`) is the row in the page's top corner, pinned inside the gutter (1.25rem from the top), with sign-out, the language toggle and the theme toggle, 0.5rem apart. It is an `aside` named by `controls.label`, so a screen reader user finds it by landmark. The row wraps only on screens too narrow for it, stays clear of the light traces, and is not printed.

### Theme Toggle

- 2.75rem (44px) circle, Field Border hairline, wash fill; the last control in Page Controls.

### Language Toggle

- `LanguageToggle` (`src/Frontend/src/pages/components/LanguageToggle.tsx`) switches the UI between Finnish and English: a pill track (44px tall, Field Border hairline, Pane with the edge glow, 0.25rem padding) with one Segment per language, Finnish first, each showing only its flag (`LanguageFlag`, in the languages' official colours, the one place outside the accent that colours appear). The active segment is marked by `aria-pressed`. Every segment is named in its own language ("Suomeksi", "In English") and carries that `lang`, so it is read correctly whichever language is active. The choice is saved as `cv-language`, starting from the browser's language.

### Segment

- One option of a choice inside a pill track: the `Segment` variant of `Button`, 36px tall and at least 44px wide inside the 44px track, with a full-height touch target. At rest it has Copy text and no fill; hover adds an 8% accent tint, Ink text and the hover edge glow; the chosen segment (`aria-pressed`) has the accent fill and accent ink, deepening to Accent Strong on hover. Presses scale to 0.97.

### Home Page

- The home page (`Home.tsx`) is a landing page for a CV's viewers. Its hero's heading ("One link to a CV that stays up to date") is set with the Name's reveal (`ProfileName` with its own size, clamp(2.75rem, 11cqi, 4.5rem) of the text column, 1.02), so it lights the background, sends the sweep and the echo and answers the pointer like a CV's name; the name stays the largest element on a CV, and the heading is the home page's one exhibit. Under the intro, the featured CV's link stands as an address to use, not a technical one: a 44px pill on the Pane (Field Border hairline, rim, edge glow) with the host in Muted and the path in Ink, and the Copy link button beside it. A long host is cut short before the path. Its frame shows from the start, and only the address and the button rise in once the CV loads.
- From `lg` up the hero has two columns, the text on the left and the featured card, whose View CV is the page's one primary action, on the right, as tall as the text column, so its top lines up with the eyebrow and its bottom with the address row; below `lg` they stack. The card is 30rem wide at `lg` and 36rem from `xl` up, so the text column keeps room for the heading on at most three lines and the address on one row, which keeps the card low, and the card keeps room for a usual two-part name on one line: a 42rem card left the text column about 416px at 1280px, where the heading took four lines, the address stacked and the card grew into a tall box with a narrow portrait. From `lg` up the address row stays on one line, and a long address is cut short rather than pushing the Copy link button under it. Under the hero come the facts about the link (its own address, always the latest version, the same content as a PDF), three of equal weight side by side from `lg` up, each under a hairline, with their heading starting over the middle fact from `lg` up, and, last and quiet, the form that opens any CV with a secondary Open CV button and the owner's sign-in link, under a hairline too. Both hairlines are Field Border, not Hairline, because the plain zinc line faded into the background's light and read as a dim smudge above the text. The hero keeps the light traces away, and a language switch replays the heading's reveal as a whole, with the sweep and the echo, while the directed light stays on. Without a featured CV the hero is the text alone, in one column. The page claims only what MyCV does (`PRODUCT.md`): no invented testimonials, figures or sign-up pitch.

### Featured CV Card

- On the home page, the `FeaturedCvCard` (`src/Frontend/src/pages/Profile/components/FeaturedCv/`) shows the CV the API features (`useFeaturedCv`), as a `LitCard` whose surface lights up like the edit view's preview card. Inside: an eyebrow with a pulsing dot, the featured label (`home.featuredLabel`) and the date the CV last changed, which shows that the link always leads to the latest version, the name (in the Name's script, 2.25 to 3rem, see Name), the job title in accent, the location in Muted with a pin icon, an 80px square portrait (rounded 1rem; the initials when there is no photo) that grows to 12rem wide on `sm` and up (9rem at `lg` and 10rem from `xl` up in the hero's narrower card, so the name keeps its line), and the primary View CV button and small GitHub and LinkedIn buttons, each with the brand's monochrome logo before the label (1em, in the text colour). Between `sm` and `lg`, where the card is wide, the portrait runs the height of the text and buttons and the buttons sit under the text; below `sm` and in the hero from `lg` up the buttons take the card's full width under the text and portrait, so all three stay on one row in the hero's 30 to 36rem card. When the hero stretches the card to its text column, the eyebrow stays at the top and the name, title and location sit on the buttons, so the extra height opens under the eyebrow, not between the location and the buttons, and the portrait fills the height of the text.
- Its content rises into place once its data arrives (the shared spring, 18px), while the card itself stays put, because a fading card would switch off its Pane's blur. Until then `FeaturedCvSkeleton` holds the same grid in the card's own frame (Field Border, Pane, rim and card shadow), so the card neither moves nor changes surface. When no CV is featured or a request fails, the section renders nothing and the home page works without it.

### Background

- Non-interactive layer behind the content, as tall as the page, on every framed page, carrying on the portrait card's look: one light from the top-left corner, emerald fading into the dark. From the bottom: a faint shade in the far corner of the light theme (`--cv-shade`, 3.5% zinc; none in the dark theme, where near-black has so few steps that a shade showed as diagonal stripes), the directed light in a box one screen tall (at least 48rem), a 24px dot grid (1px dots in `--cv-dot`) masked toward the light (`radial-gradient(78% 72% at 20% 12%, #000 18%, transparent 100%)`) and out under the resting band, a spring-following accent spotlight moved by transform (mouse pointers only, disabled for reduced motion) that also lights the dots under it to 75% accent, hottest in the middle, where the light runs from Hot Core to the accent over the first 45% of its radius, and lights the name (see Name), and 6% grain. No blur filter anywhere.
- **Directed light:** a diagonal wash, the card's own gradient at page scale, at 16% accent (`--cv-light`) with eased stops that run out at four fifths of the way to the other two corners of a box 162.5% of the screen's size, so the light reaches past the first screen with no edge, and a soft conic beam at 55% of that strength from a source 8rem outside the corner, whose sides and end are eased too, because a straight ramp's corners show as edges on near-black. The beam's box reaches 35% below the screen, so the beam runs out before the box ends on a page taller than the screen. Forced colours leave the light and the shade out.
- **Ignition:** on the CV, the wash and the beam stay dark while the page loads, behind the skeleton and until the name's reveal, and come on in the same frame as the sweep: opacity from 0 to 1 in 500ms on `cubic-bezier(0.23, 1, 0.32, 1)`, so most of the light is there within the first 150ms, like a lamp switched on, and the rest settles. The resting band, the dots and the grain show from the start, so the loading page is never empty. A load that ends in an error lights the light too. It runs once per reveal, on the CV and on the home page, whose heading reveals like the name (see Home Page): other pages have the light on from their first paint. Reduced motion shows the light at once, during the load too.
- **Haze:** every light has a second layer under it in Deep Haze, at `--cv-haze` (30% in the dark theme, 16% in the light theme) times the layer's own share. It lies where the accent fades out and leaves at most a faint trace under a light's peak (a tenth of the layer's haze under the sweep's middle, a fiftieth under the beam's): in the wash's tail (from where the accent has fallen to about half, strongest at half of `--cv-haze` where the accent is nearly out, ending a little past it), on the two sides of the beam and of the sweep, and under the two skirts of the resting band and the echo, with nothing under their middle. The rule is that the light's brightness falls steadily outward: the haze fills the accent's tail and never makes a peak or a band of its own. A haze beside the resting band showed as a second, parallel band, and a haze that reached the box's corners put a second pool of light in the middle of the screen and tinted the whole first screen green; both were rejected, so the far parts of the first screen stay clear of it. The haze also stays out from under the small text, because the date line there has almost no contrast to spare (about 4.6:1 in the dark theme at 1440px, as before the haze).
- **Resting band:** one band of light stays across the page at all times, as if a passing echo had stopped with its middle 55% down the box, at the same tilt, at 70% of the light's strength in the dark theme and at 20% accent in the light theme (`--cv-light-rest`), where a band as weak as the running one barely showed. Only the reflection stays: the static dots fade out under the band over an eased edge, which leaves the name and the small text with nothing but light behind them. A passing sweep, echo or spotlight still lights the dots there for as long as it passes. It is plain CSS, so the canvas stays empty at rest. It doesn't move, so reduced motion keeps it; forced colours and print leave it out.
- **Sweep:** when the name's reveal starts, one band of light at the foil's 105° angle crosses the page, 70vw wide at 70% of the light's strength, in 1.8s on the foil's `cubic-bezier(0.45, 0, 0.2, 1)`, moved by transform and opacity. It reaches the portrait about when the card's foil sweep starts, so they read as one light rather than two effects. The name's echo crosses the page at the same time from the bottom. The dots under the band light up in the accent, never past the lit dots' 75%, with a Hot Core in their middle (see Lit dots), and grow to about 2.4px without moving. It runs once per reveal, on the CV and on the home page, also on touch screens. Off for reduced motion.
- **Beam lean:** a mouse pointer leans the beam around its source toward the pointer, by 35% of the pointer's angle from the beam's rest and at most 9°, on the spotlight's spring (stiffness 100, damping 20). It settles back when the pointer leaves the page. Off for touch and reduced motion.
- **Name echo:** in the same frame as the sweep, and on every click or tap on the name, a copy of the sweep crosses the page from the bottom up (`LightEcho`): a band 70% of the screen tall, whose accent keeps to the middle four fifths of it so the haze fits under its skirts, at the same strength, duration and curve, with the same closing fade, turned a quarter of a circle so it keeps the foil's tilt. The dots under it light up in the accent, never past the lit dots' 75%, with a Hot Core in their middle, and grow from 1px to about 2.4px without moving, as under the sweep. A quick second echo doesn't cut the first one off, and at most four run at once on the canvas. Off for reduced motion.
- **Lit dots:** a canvas over the dots (`DotEcho`) that is transparent at rest and draws only the dots that the sweep, an echo or the spotlight reaches, on the same grid and through the dots' first mask, so they land on the static dots, and under the resting band, where no static dots show, they appear on their own. Each dot under a band has a Hot Core over the accent, a smaller dot 60% of its radius, whose strength follows the square of the band's light, so it shows only near the band's crest and the dot's edge stays accent. At the crest the core is fully opaque, the one exception to the lit dots' 75%, because it is a pixel or two wide and has to read as the light's hottest point. Under the spotlight the swollen dots turn toward Hot Core the nearer they are to the pointer, like the CSS layer under them.
- **Light traces:** while the sweep and each echo cross the page, their light sends a few traces along the dot grid, like a laser drawing from dot to dot: up to three per band, one every 100ms from the dots the band's light is just reaching, at most four on screen at once. Each runs once along a route of 6 to 14 cells (32% of the light box's shorter side) with one or two right-angle turns of a cell or two, all to the right, the echo's along its level band, in 450ms on `cubic-bezier(0.3, 0, 0.25, 1)`, so it sets off quickly and settles. The lit piece is a quarter of the route long, a 1.25px line whose tail fades linearly from the lit dots' 75% accent to nothing, with a 6px Hot Core head and a soft accent glow around it at 30%; it fades in and out over the first and last 15% of its run. Routes stay where the static dots show at least 45%, through both of the dots' masks, and half a cell clear of the CV's text (the eyebrow, the name, the title and the rest of the hero column) and of the page's controls in the top corner, because on a phone the text sits above the resting band's mask; the echo sends its traces until it is nine tenths of the way up, because on a phone the only room clear of the text is above it; so they never pass behind the name or the small text, and they fade with the dots. The band soon passes its traces, so they read as the paths its light leaves behind. A click or tap on the name sends them again with its echo, and they leave with it. Off for reduced motion, print and forced colours.
- **Spotlight swelling:** while the CV's name or the home page's heading shows, the dots under a mouse's spotlight grow from 1px to 1.6px in their own colours, with the lit dots' falloff and on the spotlight's spring, without moving.
- **Budget:** the canvas draws only while an echo, the sweep or a trace runs or the spotlight moves, at most four traces at once with twelve tail pieces each, on Framer Motion's frame loop, which a hidden tab pauses. It is at most 2× the CSS pixels, and 1× on a page over 4 million CSS pixels. Other pages (sign-in, error pages, the PDF view) keep an empty 0×0 canvas. Reduced motion leaves the canvas out, and print and forced colours hide it.
- **Rejected:** lit dots under the resting band, both as hard and bright as under a passing band and softened with a small core and a long edge, because they stayed right behind the small text all the time, and the band reads better as a plain reflection; a ring of light spreading from the name, and dots pushed outward by a wave, because the second light reads best as a copy of the first one from another direction, and a second light that starts when the reveal ends, because the two read as one moment when they cross together; a comet that circles the page without end, dots that dodge the pointer and ripple from clicks anywhere, and a depth layer that shifts against the pointer. The comet and the dodging dots compete with the name's weight play and the portrait's tilt, and the comet is an endless decorative loop; the depth layer was too faint to notice. For the directed light, compared in the real app in both themes: removing the dots, which keeps a cleaner surface but loses the echo and the material the sweep lights up; a 10% peak, which leaves the light too quiet in the dark theme; and a slow endless drift of the beam (±2.5° over 28s), which would make the background move on its own. Thin rays inside the beam, compared in the real app in both themes against the plain beam: three rays one to two degrees wide from the beam's source, at up to 10%, in a muted yellow-lime and in the accent. The plain beam was chosen, and the yellow token was removed with the rays. The rays also had to stay in the beam's upper half, because in its middle a full lean carried them over the date line, which has no contrast to spare. A light that comes on only when the reveal starts, after showing during the load, because it would go out and come on again. For the colours, compared in the real app in both themes: the earlier, less cyan accent, and a black that leans toward green under either accent. The more cyan accent on the unchanged zinc black was chosen. For the light traces, compared in the real app: one trace per band in the muted yellow-lime, because as a 1.25px line beside the green dots it read as a faded olive, and darker still in the light theme, so the traces stay in the accent; a tail that fades with the square of its length, because only the head showed; traces that keep pace with the band, because a band crosses the page about seven times faster than a 450ms trace runs; the echo's traces running up the page, because on a wide screen almost every such route crossed the name or ran where the dots fade out, so a click rarely drew one; and an endless or pattern-switching run of traces, four to six changes a second, because it flickers and makes the background move on its own.

## Do's and Don'ts

### Do:

- **Do** use `cv-*` tokens and keep both themes working.
- **Do** keep the accent to identity, action and focus.
- **Do** let the name be the largest element on the page.
- **Do** use the shared spring (stiffness 100, damping 20) and an 18px rise for entrances; respect reduced motion: no letter blur, photo reveal, name glow, weight wave, tilt, foil sweep, pointer pull, copy burst, name echo, light sweep, light ignition or beam lean. Animate `transform` and `opacity`; the only exceptions are the name's blur, halo `filter` and weight axis (with every letter's width locked), the portrait photo's blur as it sharpens in, the pointer lights' `background-image` and `background-position` (the name's sheen, the portrait's border light and foil), the loading skeletons' shimmer `background-position`, and the background's lit dots and light traces under the echo and the sweep, which a canvas draws only while they move.
- **Do** keep pointer effects to mouse input (`pointerType === "mouse"`); touch gets one-off equivalents instead, such as the name's echo on a tap and the home heading's weight wave.
- **Do** keep focus-visible outlines on every interactive element.

### Don't:

- **Don't** add a second accent colour or gradient fills beyond the name's ink-to-muted fade, the portrait placeholder's accent wash, the portrait foil and the background's directed light.
- **Don't** add a second hue to the light: no yellow, no orange, no flames, and no green flood across the whole page: the far parts of the first screen stay clear of the light.
- **Don't** use Hot Core or Deep Haze outside the background's light, and don't put more than a faint trace of haze under a light's peak, and none under small text that stays in the light.
- **Don't** put shadows or cards on content by default.
- **Don't** use mono type for body copy.
- **Don't** let background effects exceed ~10% opacity or capture pointer events. There are four exceptions: the directed light peaks at 16% in the top-left corner, the resting band at about 11% in the dark theme and 20% in the light theme in its middle, a lit dot, under the spotlight, the sweep or the echo, reaches 75% accent with a Hot Core in its middle, which is fully opaque at a band's crest, and a light trace's tail reaches the same 75% with a fully opaque Hot Core head, because each is only a few pixels wide.
- **Don't** let the background move on its own or answer anything but the name and the pointer: no endless loops, no dots that dodge the pointer, no ripples from clicks elsewhere on the page. The light comes on and the sweep runs once per name reveal, the echo with it and once per click or tap on the name, and the beam only leans with a mouse.
