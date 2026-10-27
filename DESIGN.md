---
name: MyCV
description: A quiet, dark-first CV page where the candidate's name is the artwork and one emerald accent does all the signalling.
colors:
  accent: "#047857"
  accent-strong: "#065f46"
  accent-ink: "#ffffff"
  accent-dark: "#4fd1a5"
  accent-strong-dark: "#7ee2bf"
  accent-ink-dark: "#04130d"
  paper: "#fafafa"
  surface: "#ffffff"
  line: "#e4e4e7"
  field-line: "#8a8a93"
  ink: "#09090b"
  copy: "#3f3f46"
  muted: "#5f5f68"
  meta: "#6e6e77"
  danger: "#dc2626"
  wash: "rgb(9 9 11 / 0.025)"
  midnight: "#09090b"
  surface-dark: "#111113"
  line-dark: "#26262b"
  field-line-dark: "#6b6b74"
  ink-dark: "#f4f4f5"
  copy-dark: "#b4b4bb"
  muted-dark: "#9e9ea6"
  meta-dark: "#85858e"
  danger-dark: "#f87171"
  wash-dark: "rgb(255 255 255 / 0.03)"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 8.5vw, 7rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.05em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
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
    backgroundColor: "{colors.surface}"
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

The candidate's name is the exhibit and everything else is gallery wall. A zinc-neutral canvas, a single emerald accent and a very large, tightly tracked name carry the page. Chrome stays small: mono eyebrow labels, pill buttons and a thin-lined portrait panel. The system is dark-first in feel but ships equal light and dark themes switched by the visitor.

Atmosphere comes from a faint grid, soft accent glows, film grain and a pointer-following spotlight, all low opacity and non-interactive. They add depth without competing with content. Motion is a short staggered rise-in, never a showpiece; the few signature moments (the name rising letter by letter and catching the spotlight, the initials being traced) all serve the name.

**Key Characteristics:**

- One accent colour on a zinc neutral scale; no second hue.
- Oversized display name (up to 7rem) with tight tracking, set against small mono labels.
- Pill-shaped actions, soft rounded panels, hairline borders.
- Flat surfaces; depth from ambient background, not stacked cards.
- Equal light and dark themes via semantic `cv-*` tokens.

## Colors

A restrained zinc palette with one emerald accent. Components use only the semantic `--cv-*` variables defined in `src/Frontend/src/index.css`, which `data-theme` on `<html>` swaps.

### Primary

- **Deep Emerald** (#047857, light theme): accent for the primary button, job title line and focus outlines.
- **Mint Signal** (#4fd1a5, dark theme): the same role on dark; its ink colour is **Near-Black Green** (#04130d).
- **Accent Strong** (#065f46 / dark #7ee2bf): the primary button's hover fill, and the text button's hover colour; deeper than the accent in light, brighter in dark.

### Neutral

- **Paper** (#fafafa / dark #09090b): page background.
- **Surface** (#ffffff / dark #111113): panels and the portrait card.
- **Hairline** (#e4e4e7 / dark #26262b): decorative borders and dividers.
- **Field Line** (#8a8a93 / dark #6b6b74): a grey at least 3:1 against the page, for the loading spinner's track. Form fields use Hairline instead, see Inputs / Fields.
- **Ink** (#09090b / dark #f4f4f5): headings and primary text.
- **Copy** (#3f3f46 / dark #b4b4bb): body text.
- **Muted** (#5f5f68 / dark #9e9ea6) and **Meta** (#6e6e77 / dark #85858e): secondary info, placeholders, update dates; both at least 4.5:1 on page and surface.
- **Danger** (#dc2626 / dark #f87171): validation errors only.

### Named Rules

**The One Voice Rule.** The accent marks identity, action and focus only. It never fills large areas; glows stay at or below 10% opacity.

**The Semantic Token Rule.** Components use `cv-*` utilities, never raw hex or Tailwind palette colours, so both themes stay in sync.

## Typography

**Display Font:** Geist Variable (self-hosted via Fontsource, with ui-sans-serif, system-ui)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with ui-monospace)

**Character:** One family at extreme size contrast, plus a mono voice for metadata. Hierarchy comes from scale, tracking and colour rather than from font changes.

### Hierarchy

- **Display** (600, clamp(3rem, 8.5vw, 7rem), 0.95, tracking -0.05em): the candidate's name. Section titles use clamp(3rem, 7vw, 5.5rem) at line-height 1.
- **Title** (500, 1.25-1.5rem, tracking -0.025em): job title in accent colour.
- **Body** (400, 1.125rem, 1.625): summary text, capped at 52ch.
- **Label** (400 mono, 0.75rem, tracking 0.1em, uppercase): eyebrows, "Curriculum vitae", form labels.

### Named Rules

**The Mono Whisper Rule.** Geist Mono is for labels and metadata only, always small; never for paragraphs.

## Layout

A single full-height column (`min-h-dvh`) with a fluid page gutter of clamp(1.5rem, 5vw, 5.5rem). The profile view is a two-column grid at `lg` (1.5fr text, 1fr portrait) with 3.5rem to 4rem gaps; below `lg` it stacks. Text blocks are left-aligned with `max-w` caps (52ch body, 14ch section titles). The theme toggle is pinned top right in the gutter. Spacing rhythm is generous and uneven on purpose: tight between label, name and title, then 2.5rem before actions.

## Elevation & Depth

Flat by default. Surfaces are separated by hairline borders and tonal difference, not shadows. Depth lives in the background layer.

### Shadow Vocabulary

- **Panel** (`0 2rem 4rem -2rem rgb(24 24 27 / 0.18)`, dark `rgb(0 0 0 / 0.8)`): the portrait panel at rest, and secondary and brand buttons on hover.
- **Accent glow** (`0 0.5rem 2rem -0.75rem` accent at 55%): appears only on primary button hover.

### Named Rules

**The Flat-By-Default Rule.** Shadows are earned: the portrait panel gets one at rest, buttons only on hover.

## Shapes

Three radii: **pill** (full) for buttons and the theme toggle, **panel** (1.5rem) for the portrait card, **input** (0.5rem) for form fields. 1px hairline borders everywhere. Corners never mix within a component.

## Components

### Buttons

Every button and button-styled link is the shared `Button` component (`src/Frontend/src/pages/components/Button.tsx`); no component writes its own button styles.

- **Shape:** pill (9999px), padding 0.625rem 1.25rem, 0.875rem medium text, at least 44px tall. The small size looks 36px tall but keeps a 44px touch target.
- **Primary:** accent fill with accent ink text; hover deepens the fill to Accent Strong and adds the accent glow.
- **Secondary** (the default)**:** faint wash with a hairline border; hover darkens the border, adds an overlay and the panel shadow. "Edit profile" uses the same style with a dashed border.
- **Danger:** danger text and a half-strength danger border; hover makes the border full strength and adds a 10% danger tint. Used to confirm a removal.
- **Icon:** a 44px circle with the secondary look, for the theme toggle; it needs an `aria-label`.
- **Text:** an underlined accent label without a fill, such as Read more; hover turns the label and underline to Accent Strong.
- **Brand:** the Microsoft and Google sign-in buttons in each provider's own colours; hover lays a faint 8% layer of the button's own text colour over it, which shows on any brand colour in both themes.
- **Hover rule:** every usable button changes visibly on hover; a shadow alone doesn't count. Unavailable and loading buttons don't react.
- **Press / Focus:** `scale-[0.97]` on active (icons 0.92); 2px accent outline, 2px offset on focus-visible; 200ms ease-out. Reduced motion keeps the colour changes and drops the press scale. External links add a "↗" that nudges up and right on hover.
- **Loading:** a small spinner and the loading label ("Saving…") replace the label in place, so the button keeps its width; it keeps focus and ignores clicks.
- **Unavailable:** 60% opacity and a not-allowed cursor. A button whose reason is shown beside it, or that becomes unavailable while focused, stays focusable (`aria-disabled`).

### Inputs / Fields

Every field is `RHFInput` or `RHFTextarea`, framed by the shared `FormField` (`src/Frontend/src/pages/components/`). Floating labels are not used: the mono label above the field is the design.

- **Style:** 0.5rem radius, 1px hairline border and an opaque surface fill, like the preview panel, so the fields and the preview read as one set and the page's dot grid doesn't show through. Mono uppercase label above with the character count at its right. The surface is drawn by the `FormField` frame and the field itself is transparent, so the hover tint sits between the surface and the text.
- **Why no 3:1 border:** the hairline is deliberately below 3:1 against the page. A field is always identified by its visible label, and its hover border, focus ring and error ring all stand out clearly. Keeping the grey field-line border with only the fill changed was considered and rejected, because the fields would no longer match the preview panel.
- **Hover (mouse):** the border darkens to Muted, and an accent light follows the pointer around the border (an 8rem radial gradient at 70% accent, masked to the field's outer 2px) with an 8% tint in the fill under it (a wider 10rem radial gradient). Its position goes to CSS variables once per animation frame. No light for touch, reduced motion or disabled fields; on an invalid field it is danger-coloured.
- **Focus:** a 3px accent ring at 20%, the label turns accent, and an accent light travels around the border, one lap every 8s like the panels' sweep (a comet a fifth of the border long that brightens smoothly from tail to head, built from ten overlapping 6rem radial glows like the hover light, that follow the border on a CSS motion path (`offset-path: inset(0 round 0.5rem)`) a little apart; it shows on the field's outer 2px, the thickness of the orbiting light on the portrait panel). Browsers without shape motion paths show no travelling light. The border itself stays neutral so the light shows. Unlike the panels' angular sweep, the light follows the border, so it keeps its speed on the long and short edges of a wide field and its tail bends around the corners without pausing. It runs only on the focused field and is paused on the others.
- **Drift (hover and focus):** a soft accent light, half the field wide (a radial gradient at 14% accent, a deliberate small exception to the 10% glow cap so the drift reads on the surface; it fades out from its centre and covers only part of a small field), sways slowly from side to side inside the field, 6s each way on an ease-in-out curve, on its own timing apart from the border lights. It fades in over 300ms, pauses where it is when the field is left, and resumes from there. It sits under the text like the hover tint, turns danger on an invalid field, and is off for reduced motion and disabled fields.
- **Error:** danger border and 3px danger ring at 20%, with or without focus, and no travelling light. The message opens below the field (`grid-template-rows` 0fr to 1fr with a fade, 200ms) in a `role="alert"` element, and keeps its text while closing. When a submit leaves the field invalid it shakes once sideways (±4px, settling, 300ms); typing never shakes it.
- **Character count:** on every field with `maxLength`, in mono `tabular-nums` (`12 / 100`). Muted and shown only while the field has focus, then always visible from 90% of the limit in accent, and danger at the limit. It is part of the field's `aria-describedby`, never a live region, so screen readers don't read it on every keystroke.
- **Description:** an optional hint below the field and its message, in muted 0.875rem text, that is also part of the field's `aria-describedby`, such as the CV link preview in the create view.
- **Action:** an optional control in the field's row, such as the home page's Open CV button, as tall as the field and level with it however the label wraps. Focusing it doesn't light the label or the count.
- **Textarea:** grows with its text (`field-sizing: content`, at least 4 lines, at most 70dvh, then it scrolls); browsers without `field-sizing` fall back to fitting the height in script.
- **Autofill:** an opaque inset shadow in the surface colour and an ink text fill keep autofilled fields on theme in both themes.
- **Disabled:** 60% opacity on the whole field, surface included, and a not-allowed cursor.
- **Reduced motion:** no pointer light, travelling light, drifting light, shake or height animation; a focused border turns accent instead, and the colour, ring and message still change, so every state stays distinct.
- **Placeholders:** realistic examples (`https://github.com/username`, `Helsinki, Suomi`) or none, never "Enter …"; the label already says what goes in.
- **Text link** (the CV link in the edit view): a half-strength accent underline at rest; on hover the text turns accent and a full accent underline draws over it from the left (250ms). Reduced motion keeps only the colour change.

### Edit View

- Same two-column grid as the CV: the form on the left, a sticky **live preview** on the right from `lg` up. The preview is a portrait-style panel with the orbiting border highlight that shows the Finnish CV (name, title, location, summary, link pills) updating as the fields change. It repeats the form, so it is `aria-hidden`.
- **Width:** from `2xl` (1536px) up the edit view widens past `max-w-7xl` to 84.6rem, and only the edit view: the CV keeps `max-w-7xl`. The form column keeps the 45.6rem it has at 80rem, so all the extra room goes to the preview, which grows from about 30rem to 35rem. That fits a long name such as "Valtteri Tuominen Azure" on one row with a little room to its right; a wider card left too much empty space beside the text.
- **Preview lights:** the preview card lights up like the fields. With a mouse, a light follows the pointer around its border and tints the surface beneath the text (the fields' hover light, on the panel's 2px border). While the card is hovered or any field has focus, the fields' drift light sways slowly from side to side inside the card, under the text, and pauses where it is otherwise, so the card wakes while the profile is edited rather than moving all the time. On the card's larger surface the drift is 10% accent, within the glow cap, because the fields' 14% reads as a heavy blob there. Touch gets no pointer light, and reduced motion neither light.
- Header: accent-dot mono eyebrow "Editing" above the "Edit profile" title. The CV link is shown as the full address with a Copy link button, not as a disabled field.
- Basic details: full name on its own row, GitHub and LinkedIn side by side from `sm` up.
- **Action bar:** a floating panel (1.5rem radius, hairline border, 85% surface with backdrop blur, panel shadow) sticky 1rem above the bottom edge. Save is disabled until something changes; a mono status reads "No changes" or "Unsaved changes" with an accent dot. Cancel with unsaved changes swaps the bar to "Discard your unsaved changes?" with Keep editing (primary) and Discard; closing the tab with unsaved changes asks the browser to confirm.
- **Focus:** entering edit mode focuses the title; leaving it (Save, Cancel or Discard) focuses the Edit profile button.
- **Transition:** the outgoing view fades and lifts 1rem, then the incoming one rises 1.5rem and fades in, 250ms `cubic-bezier(0.23, 1, 0.32, 1)`, one at a time. Returning to the CV replays its entrance. A successful save shows a "Profile saved" notice.

### Notice

- Bottom-centre pill (hairline border, surface fill, accent dot) that fades and rises 8px in for 4 seconds, inside an always-present `role="status"` region. Used for "You've signed out" and "Profile saved".

### Name

- Display type with an ink-to-muted fade, set one element per letter so each letter rises from behind its word's clipped bottom edge: 0.9s, `cubic-bezier(0.22, 1, 0.36, 1)`, letters spread over at most 0.6s. Screen readers get the whole name from a visually hidden copy.
- Splitting the letters drops the font's kerning, so each letter carries its pair kerning back as an end margin, measured with canvas at the heading's weight and tracking. Every letter box bleeds 0.1em sideways and 0.15em / 0.08em vertically (taken back with negative margins), because background-clipped text only paints inside its own box.
- **Sheen:** once the letters are in, an accent radial gradient clipped to the same letters follows a mouse pointer on the spotlight's spring (stiffness 100, damping 20), so the name catches the spotlight. Hidden for reduced motion, print and forced colours.

### Portrait Panel

- 1.5rem radius, 2px line border that carries the orbiting highlight, surface fill, panel shadow. With a photo it is clamp(20rem, 68dvh, 40rem) tall. With no photo it shows the initials over a faint diagonal accent wash, at clamp(16rem, 46dvh, 26rem) from `lg` up and a compact 11rem below `lg`.
- **Initials:** traced once in a 1.25px accent outline (1.6s, `cubic-bezier(0.65, 0, 0.35, 1)`, after 0.5s), then filled to 80% accent. Shown filled straight away for reduced motion.
- **Hover (mouse):** tilts up to 6° toward the pointer with a soft glare; an accent highlight orbits the border.
- **Scroll (stacked layout, below `lg`):** a CSS scroll-driven animation (`animation-timeline: view()`) rises the panel from 3rem lower, tipped back 14°, at 40% opacity, and settles it by the time it is fully in view. A panel already in view on load is at rest. Browsers without scroll timelines, and reduced motion, show it at rest.

### Theme Toggle

- 2.75rem (44px) circle, hairline border, wash fill; fixed top right.

### Background

- Fixed non-interactive layer: two static radial-gradient glows (no blur filter), a 4rem grid masked to the upper centre, a spring-following accent spotlight moved by transform (mouse pointers only, disabled for reduced motion) that also lights the dots and the name (see Name), and 6% grain.

### Section Transitions (reserved; not in the UI while the CV has one section)

The CV once paged between full-viewport sections. That code was removed when the only second section was a "More to come" placeholder. Bring these behaviours back when real content sections exist:

- **Transition:** outgoing and incoming section each move 1.5rem on the Y axis and fade, 250ms, `cubic-bezier(0.23, 1, 0.32, 1)`, one section at a time (wait mode). Moving forward enters from below and exits upward; moving back reverses. Animate `y`, never a raw `transform` string, so reduced motion applies.
- **Section content entrance:** the shared spring (stiffness 100, damping 20), 18px rise, 0.09s stagger. A section built from `ContentSection` used an eyebrow in accent mono, an h1 capped at 14ch (clamp(3rem, 7vw, 5.5rem)) and a 52ch description, entering with a 0.25s delay.
- **Progress hint:** a bottom bar above a hairline top border: a mono counter ("01 / 02"), one 2.5rem-wide bar per section (active in accent at full width, inactive hairline at half width, scaled on X over 150ms), a "Scroll to explore" line with an arrow, and a key hint (`kbd`) visible from `sm` up. It appeared only with more than one section.
- **Input:** wheel with a 700ms throttle, and ArrowUp and ArrowDown (ignored while focus is in an input, button, link or editable field, and when Ctrl, Alt or Meta is held).
- **Known problems to fix when rebuilding:** wheel capture must not block Ctrl+wheel zoom or scrolling of content taller than the viewport, and touch needs a path (swipe or visible next and previous controls). Prefer one tall scroll with anchors if sections are read like a page.

## Do's and Don'ts

### Do:

- **Do** use `cv-*` tokens and keep both themes working.
- **Do** keep the accent to identity, action and focus.
- **Do** let the name be the largest element on the page.
- **Do** use the shared spring (stiffness 100, damping 20) and an 18px rise for entrances; respect reduced motion.
- **Do** keep focus-visible outlines on every interactive element.

### Don't:

- **Don't** add a second accent colour or gradient fills beyond the name's ink-to-muted fade.
- **Don't** put shadows or cards on content by default.
- **Don't** use mono type for body copy.
- **Don't** let background effects exceed ~10% opacity or capture pointer events.
