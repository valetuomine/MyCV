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
  field-surface: "#ebf4f2"
  field-border: "#8fbbb0"
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
  field-surface-dark: "#16201f"
  field-border-dark: "#36675a"
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
    backgroundColor: "{colors.field-surface}"
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

Atmosphere comes from one directed emerald light that falls in from the top-left corner, the same way as on the portrait card, with a faint dot grid, film grain and a pointer-following spotlight on top, all low opacity and non-interactive. They add depth without competing with content. Motion has one authored moment: two bands of light cross the page together, one from the left and one from the bottom, and hand over to the portrait's foil sweep while the name assembles letter by letter, each letter rising from its clipped baseline while it sharpens from a thin blur into its full weight, the rest of the page follows in a short staggered rise-in. The background moves only for the name and the pointer: clicking or tapping the name sends another echo, and at rest the light and the dots stay still. Afterwards the page answers the mouse: the name moves along the font's weight axis and catches the spotlight, the dots under the spotlight swell slightly, the background's beam leans toward the pointer, the portrait card behaves like a physical object that tilts toward the pointer with its initials floating above it, and the actions lean toward the pointer. Every effect serves the name or the visitor's action. Pointer effects play only for a mouse (touch screens get a weight wave through the name instead), and everything stops for reduced motion.

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
- **Accent Strong** (#065f46 / dark #7ee2bf): the primary button's hover fill, and accent text on the background's light, such as the text button, the CV's job title and the form fields' labels; deeper than the accent in light, brighter in dark.

### Neutral

- **Paper** (#fafafa / dark #09090b): page background.
- **Surface** (#ffffff / dark #111113): panels and the portrait card.
- **Hairline** (#e4e4e7 / dark #26262b): decorative borders and dividers.
- **Field Line** (#8a8a93 / dark #6b6b74): a grey at least 3:1 against the page, for the loading spinner's track. Form fields use Field Border instead, see Inputs / Fields.
- **Field Surface** (≈ #ebf4f2 / dark ≈ #16201f) and **Field Border** (≈ #8fbbb0 / dark ≈ #36675a): the resting fill and border of form fields and the profile preview, an accent tint over Surface (8%) and over Hairline (38%). The tint is capped at 8% because Meta must stay at 4.5:1 or more on the fill.
- **Ink** (#09090b / dark #f4f4f5): headings and primary text.
- **Copy** (#3f3f46 / dark #b4b4bb): body text.
- **Muted** (#56565f / dark #9e9ea6) and **Meta** (#6e6e77 / dark #85858e): secondary info and placeholders; both at least 4.5:1 on page and surface. Small text in the background's lit area, such as the CV's update date and the PDF view's eyebrow, uses Muted, because Meta falls below 4.5:1 on the light, and small accent text there, such as the CV's job title and the form fields' labels, uses Accent Strong for the same reason. Meta stays in the PDF, which has no background light.
- **Danger** (#dc2626 / dark #f87171): validation errors only.

### Named Rules

**The One Voice Rule.** The accent marks identity, action and focus only. It never fills large areas. Glows stay at or below 10% opacity; the background's directed light is the one exception, 16% at its peak in the top-left corner and carried past the first screen, and one band of it rests across the page at about 11% in the dark theme and 20% in the light theme, where the same accent shows far less. Both fade out with no visible end, so they read as light rather than as a coloured area. The name's halo is a further exception: a thin drop-shadow around the letters nearest a mouse pointer, up to 70% accent in the dark theme and 30% in the light theme, because it has to show against the page's own light. A second exception is the resting surface of form fields and the profile preview, an 8% accent tint (its maximum), because they sit in that light and would otherwise show as black boxes.

**The Semantic Token Rule.** Components use `cv-*` utilities, never raw hex or Tailwind palette colours, so both themes stay in sync.

## Typography

**Display Font:** Geist Variable (self-hosted via Fontsource, with ui-sans-serif, system-ui)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with ui-monospace)

**Character:** One family at extreme size contrast, plus a mono voice for metadata. Hierarchy comes from scale, tracking and colour rather than from font changes.

### Hierarchy

- **Display** (600, clamp(3rem, 8.5vw, 7rem), 0.95, tracking -0.05em): the candidate's name, which glows under a mouse pointer and sweeps between weights 540 and 800 on touch screens (see Name) while every letter keeps its weight-600 width. Section titles use clamp(3rem, 7vw, 5.5rem) at line-height 1.
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
- **Text:** an underlined Accent Strong label without a fill, such as Read more; hover turns the label and underline to Ink.
- **Brand:** the Microsoft and Google sign-in buttons in each provider's own colours, the providers' light variant in the light theme and their dark variant in the dark theme, each with a faint inner hairline (the dark Microsoft button also gets a visible `#6b6b6b` border, because the guideline has none and it would vanish into the dark background); stacked at one width (20rem, at most the screen less the gutters) with Open a CV and the other secondary action under them, 0.75rem apart. The "Last used" badge sits on the top edge of its button, ringed in the page colour; hover lays a faint 8% layer of the button's own text colour over it, which shows on any brand colour in both themes.
- **Hover rule:** every usable button changes visibly on hover; a shadow alone doesn't count. Unavailable and loading buttons don't react.
- **Press / Focus:** `scale-[0.97]` on active (icons 0.92); 2px accent outline, 2px offset on focus-visible; 200ms ease-out. Reduced motion keeps the colour changes and drops the press scale. External links add a "↗" that nudges up and right on hover.
- **Pointer pull:** with a mouse, the CV's actions (Copy CV link, View as PDF, GitHub, LinkedIn, Edit profile) lean toward the pointer by about a quarter of its offset from their centre, a little more vertically, on a spring (stiffness 220, damping 15). Not in the edit view, and off for touch and reduced motion.
- **Copy link:** the label swaps to an accent check mark and "Copied" in the same grid cell (200ms, the check draws in over 300ms), so the width never jumps, and each successful copy sprays 14 small accent dots outward from the button's centre (950ms, `cubic-bezier(0.16, 1, 0.3, 1)`). It resets after 2 seconds and announces the copy to screen readers. No dots for reduced motion.
- **Loading:** a small spinner and the loading label ("Saving…") replace the label in place, so the button keeps its width; it keeps focus and ignores clicks.
- **Unavailable:** 60% opacity and a not-allowed cursor. A button whose reason is shown beside it, or that becomes unavailable while focused, stays focusable (`aria-disabled`).

### Inputs / Fields

Every field is `RHFInput` or `RHFTextarea`, framed by the shared `FormField` (`src/Frontend/src/pages/components/`). Floating labels are not used: the mono label above the field is the design.

- **Style:** 0.5rem radius, 1px hairline border in an accent-tinted line colour (`--cv-field-border`, 38% accent over Line) and an opaque, accent-tinted surface fill (`--cv-field-surface`, 8% accent over Surface), like the preview panel, so the fields and the preview read as one set, belong to the background's emerald light, and the page's dot grid doesn't show through. An invalid field returns to the neutral Surface fill so the green doesn't mix with the error red. Mono uppercase label above with the character count at its right. The surface is drawn by the `FormField` frame and the field itself is transparent, so the hover tint sits between the surface and the text.
- **Why no 3:1 border:** the field border is deliberately below 3:1 against the page in the light theme (about 3:1 in the dark theme). A field is always identified by its visible label, and its hover border, focus ring and error ring all stand out clearly. Keeping the grey field-line border with only the fill changed was considered and rejected, because the fields would no longer match the preview panel. The tint is capped at 8% accent: above that the placeholder (Meta) falls below 4.5:1.
- **Hover (mouse):** the border darkens to Muted, and an accent light follows the pointer around the border (an 8rem radial gradient at 70% accent, masked to the field's outer 2px) with an 8% tint in the fill under it (a wider 10rem radial gradient). Its position goes to CSS variables once per animation frame. No light for touch, reduced motion or disabled fields; on an invalid field it is danger-coloured.
- **Focus:** a 3px accent ring at 20%, the label turns accent, and an accent light travels around the border, one lap every 8s like the panels' sweep (a comet a fifth of the border long that brightens smoothly from tail to head, built from ten overlapping 6rem radial glows like the hover light, that follow the border on a CSS motion path (`offset-path: inset(0 round 0.5rem)`) a little apart; it shows on the field's outer 2px, the thickness of the orbiting light on the portrait panel). Browsers without shape motion paths show no travelling light. The border keeps its accent-tinted resting colour, so the travelling light reads as the brighter accent on it. Unlike the panels' angular sweep, the light follows the border, so it keeps its speed on the long and short edges of a wide field and its tail bends around the corners without pausing. It runs only on the focused field and is paused on the others.
- **Drift (hover and focus):** a soft accent light, half the field wide (a radial gradient at 22% accent, a deliberate small exception to the 10% glow cap so the drift reads on the accent-tinted surface, where its peak lowers the placeholder contrast to about 3:1 for as long as it passes; it fades out from its centre and covers only part of a small field), sways slowly from side to side inside the field, 6s each way on an ease-in-out curve, on its own timing apart from the border lights. It fades in over 300ms, pauses where it is when the field is left, and resumes from there. It sits under the text like the hover tint, turns danger on an invalid field, and is off for reduced motion and disabled fields.
- **Error:** danger border and 3px danger ring at 20%, with or without focus, and no travelling light. The message opens below the field (`grid-template-rows` 0fr to 1fr with a fade, 200ms) in a `role="alert"` element, and keeps its text while closing. When a submit leaves the field invalid it shakes once sideways (±4px, settling, 300ms); typing never shakes it.
- **Character count:** on every field with `maxLength`, in mono `tabular-nums` (`12 / 100`). Muted and shown only while the field has focus, then always visible from 90% of the limit in accent, and danger at the limit. It is part of the field's `aria-describedby`, never a live region, so screen readers don't read it on every keystroke.
- **Description:** an optional hint below the field and its message, in muted 0.875rem text, that is also part of the field's `aria-describedby`, such as the CV link preview in the create view.
- **Action:** an optional control in the field's row, such as the home page's Open CV button, as tall as the field and level with it however the label wraps. Focusing it doesn't light the label or the count.
- **Textarea:** grows with its text (`field-sizing: content`, at least 4 lines, at most 70dvh, then it scrolls); browsers without `field-sizing` fall back to fitting the height in script.
- **Autofill:** an opaque inset shadow in the field surface colour and an ink text fill keep autofilled fields on theme in both themes.
- **Disabled:** 60% opacity on the whole field, surface included, and a not-allowed cursor.
- **Reduced motion:** no pointer light, travelling light, drifting light, shake or height animation; a focused border turns accent instead, and the colour, ring and message still change, so every state stays distinct.
- **Placeholders:** realistic examples (`https://github.com/username`, `Helsinki, Suomi`) or none, never "Enter …"; the label already says what goes in.
- **Text link** (the CV link in the edit view): a half-strength accent underline at rest; on hover the text turns accent and a full accent underline draws over it from the left (250ms). Reduced motion keeps only the colour change.

### Edit View

- Same two-column grid as the CV: the form on the left, a sticky **live preview** on the right from `lg` up. The preview is a portrait-style panel with the orbiting border highlight that shows the Finnish CV (name, title, location, summary, link pills) updating as the fields change. It repeats the form, so it is `aria-hidden`.
- **Width:** from `2xl` (1536px) up the edit view widens past `max-w-7xl` to 84.6rem, and only the edit view: the CV keeps `max-w-7xl`. The form column keeps the 45.6rem it has at 80rem, so all the extra room goes to the preview, which grows from about 30rem to 35rem. That fits a long name such as "Valtteri Tuominen Azure" on one row with a little room to its right; a wider card left too much empty space beside the text.
- **Preview lights:** the preview card lights up like the fields. With a mouse, a light follows the pointer around its border and tints the surface beneath the text (the fields' hover light, on the panel's 2px border). While the card is hovered or any field has focus, the fields' drift light sways slowly from side to side inside the card, under the text, and pauses where it is otherwise, so the card wakes while the profile is edited rather than moving all the time. On the card's larger surface the drift is 16% accent, because the fields' 22% reads as a heavy blob there. Touch gets no pointer light, and reduced motion neither light.
- Header: accent-dot mono eyebrow "Editing" above the "Edit profile" title. The CV link is shown as the full address with a Copy link button, not as a disabled field.
- **Profile picture:** a section between the CV link and the fields, at every width (not in the preview), set off by hairlines above and below. Its heading matches the language sections, with a mono "Saved right away" tag, because each picture change is saved at once through its own request and Save and Cancel leave it alone; the hint says so. A 6.5 × 8rem portrait tile (1.5rem radius) shows the picture, or the initials over the accent wash. Small buttons: Choose picture (Change picture once there is one), which opens the device's picker (camera or gallery on a phone), Use Google picture for a Google sign-in only, and Remove picture, which asks in place with a danger Remove and Keep. The busy button shows its spinner while the others are disabled. The outcome shows below as a status or, for failures, an alert in the danger colour, worded by the status code: too large, wrong file type, no permission, changed elsewhere at the same time, a service not answering, storage not set up.
- Basic details: full name on its own row, GitHub and LinkedIn side by side from `sm` up.
- **Action bar:** a floating panel (1.5rem radius, hairline border, 85% surface with backdrop blur, panel shadow) sticky 1rem above the bottom edge. Save is disabled until something changes; a mono status reads "No changes" or "Unsaved changes" with an accent dot. Cancel with unsaved changes swaps the bar to "Discard your unsaved changes?" with Keep editing (primary) and Discard; closing the tab with unsaved changes asks the browser to confirm.
- **Focus:** entering edit mode focuses the title; leaving it (Save, Cancel or Discard) focuses the Edit profile button.
- **Transition:** the outgoing view fades and lifts 1rem, then the incoming one rises 1.5rem and fades in, 250ms `cubic-bezier(0.23, 1, 0.32, 1)`, one at a time. Returning to the CV replays its entrance. A successful save shows a "Profile saved" notice.

### Notice

- Bottom-centre pill (hairline border, surface fill, accent dot) that fades and rises 8px in for 4 seconds, inside an always-present `role="status"` region. Used for "You've signed out" and "Profile saved".

### Loading Skeleton

- **Structure:** `ProfileSkeleton` repeats the CV's layout line for line, in the same page wrapper (`py-12 sm:py-16`, `overflow-y-clip`) and grid: the eyebrow, a two-line name at the name's own size, the title, the location, the summary (four lines, seven below `sm`, where the same text wraps into the narrow column) and a row of four 44px pills, beside a portrait card the height of the photo card (clamp(20rem, 68dvh, 40rem), 2px hairline border, panel shadow), because the CV's profile has a photo. Each line carries its text's size and leading and is one line tall (`h-lh`), with the bar centred inside it. Measured at 1440 × 900 and 390 × 844 with a two-line name and a summary of about four lines, the text column and the portrait land on the CV's coordinates; a shorter name, a longer summary (over 300 characters it also gets Read more) or a profile without a photo still moves a little. Text bars are `rounded-lg` (the name's `rounded-xl`); only the pills are full pills. The PDF route has its own `ProfilePdfRouteSkeleton` in the PDF view's layout (the way back, eyebrow, name, two pills and the empty frame), so its loading doesn't show a CV's shape.
- **Fill:** shapes are Overlay and the cards and frames are see-through Wash, never an opaque Surface. While anything loads, the page's light and dots stay visible through it, which a solid near-black panel in the dark theme and a white one in the light theme cut out. The same applies to the PDF frame and to the portrait card while its photo loads.
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

- Display type with an ink-to-muted fade, set one element per letter so each letter rises from behind its word's clipped bottom edge while it sharpens from a 14px blur and weight 200 into weight 600 and fades in: 0.9s, `cubic-bezier(0.22, 1, 0.36, 1)`, letters spread over at most 0.6s. The weight moves in 10-unit steps on the same curve, because each weight of the variable font is its own font instance that the browser builds during layout; the rise, blur and fade run off the main thread. The edge clips only vertically, so the blur isn't cut at the sides. Screen readers get the whole name from a visually hidden copy.
- **Wrapping:** words break after a hyphen, and a part wider than the whole line wraps between its letters, so a long name never overflows at 320px.
- Splitting the letters drops the font's kerning, so each letter carries its pair kerning back as an end margin, measured with canvas at the heading's weight and tracking. Every letter box bleeds 0.1em sideways and 0.15em / 0.08em vertically (taken back with negative margins), because background-clipped text only paints inside its own box.
- **Sheen:** once the letters are in, a soft oval of light (`radial-gradient(11rem 6.5rem …)`, solid to 30%) clipped to the same letters follows a mouse pointer on the spotlight's spring (stiffness 100, damping 20), so the name catches the spotlight on the pointer's line only. Its colour is the `--cv-name-light` token: Ink mixed 62% toward the accent in the dark theme, the plain accent in the light theme, where a mix with dark ink would stay near-black. Its letters copy the name's weights and widths, so it stays on the glyphs. Hidden for reduced motion, print and forced colours.
- **Glow (mouse):** once the letters are in and a mouse pointer comes within a line height of the name, the letters nearest it get a soft accent halo: a Gaussian falloff over 1.35em (vertical distance counted 1.6 times) sets each letter's glow, which scales a `drop-shadow(0 0 <spread> accent <glow × strength>%)`. The glow eases about a fifth of the way per 60 Hz frame, scaled to the actual frame time so the speed is the same on 120 and 144 Hz displays. Strength and spread are the `--cv-name-glow-strength` and `--cv-name-glow-spread` tokens (70% and 0.12em in the dark theme, 30% and 0.07em in the light one), so a theme change updates the halo at once. The halo needs vertical room above and below each word's clip, which the letter bleed provides. Weight, spacing and baseline never change under the mouse, and the halo is off in print and forced colours.
- **Weight wave (touch):** on touch screens one weight wave runs through the name from start to end (1.5s) once the letters are in, and tapping the name repeats it. A scroll that starts on the name and a mouse click don't. The wave has no glow. Every letter keeps the width it has at weight 600, measured from a hidden copy once the font is ready and whenever the heading resizes, so the wave never reflows the lines.
- **Echo:** when the reveal starts, the name sends one echo into the background together with the sweep, a band of light from the bottom up (see Background), and every click or tap on the name sends another. A mouse click sends the echo but still doesn't start the weight wave; on touch screens the echo and the weight wave start together.
- Reduced motion shows the letters at weight 600 straight away, with no blur, glow, sheen, wave or echo.

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

### Theme Toggle

- 2.75rem (44px) circle, hairline border, wash fill; fixed top right.

### Background

- Non-interactive layer behind the content, as tall as the page, on every framed page, carrying on the portrait card's look: one light from the top-left corner, emerald fading into the dark. From the bottom: a faint shade in the far corner of the light theme (`--cv-shade`, 3.5% zinc; none in the dark theme, where near-black has so few steps that a shade showed as diagonal stripes), the directed light in a box one screen tall (at least 48rem), a 24px dot grid (1px dots in `--cv-dot`) masked toward the light (`radial-gradient(78% 72% at 20% 12%, #000 18%, transparent 100%)`) and out under the resting band, a spring-following accent spotlight moved by transform (mouse pointers only, disabled for reduced motion) that also lights the dots under it to 75% accent and lights the name (see Name), and 6% grain. No blur filter anywhere.
- **Directed light:** a diagonal wash, the card's own gradient at page scale, at 16% accent (`--cv-light`) with eased stops that run out at the corners of a box 130% of the screen's size, so the light reaches past the first screen with no edge, and a soft conic beam at 55% of that strength from a source 8rem outside the corner, whose sides and end are eased too, because a straight ramp's corners show as edges on near-black. The beam's box reaches 35% below the screen, so the beam runs out before the box ends on a page taller than the screen. Forced colours leave the light and the shade out.
- **Resting band:** one band of light stays across the page at all times, as if a passing echo had stopped with its middle 55% down the box, at the same tilt, at 70% of the light's strength in the dark theme and at 20% accent in the light theme (`--cv-light-rest`), where a band as weak as the running one barely showed. Only the reflection stays: the static dots fade out under the band over an eased edge, which leaves the name and the small text with nothing but light behind them. A passing sweep, echo or spotlight still lights the dots there for as long as it passes. It is plain CSS, so the canvas stays empty at rest. It doesn't move, so reduced motion keeps it; forced colours and print leave it out.
- **Sweep:** when the name's reveal starts, one band of light at the foil's 105° angle crosses the page, 70vw wide at 70% of the light's strength, in 1.8s on the foil's `cubic-bezier(0.45, 0, 0.2, 1)`, moved by transform and opacity. It reaches the portrait about when the card's foil sweep starts, so they read as one light rather than two effects. The name's echo crosses the page at the same time from the bottom. The dots under the band light up in the accent, never past the lit dots' 75%, and grow to about 2.4px without moving. It runs once per reveal, only on the CV, also on touch screens. Off for reduced motion.
- **Beam lean:** a mouse pointer leans the beam around its source toward the pointer, by 35% of the pointer's angle from the beam's rest and at most 9°, on the spotlight's spring (stiffness 100, damping 20). It settles back when the pointer leaves the page. Off for touch and reduced motion.
- **Name echo:** in the same frame as the sweep, and on every click or tap on the name, a copy of the sweep crosses the page from the bottom up (`LightEcho`): a band 70% of the screen tall, at the same strength, duration and curve, with the same closing fade, turned a quarter of a circle so it keeps the foil's tilt. The dots under it light up in the accent, never past the lit dots' 75%, and grow from 1px to about 2.4px without moving, as under the sweep. A quick second echo doesn't cut the first one off, and at most four run at once on the canvas. Off for reduced motion.
- **Lit dots:** a canvas over the dots (`DotEcho`) that is transparent at rest and draws only the dots that the sweep, an echo or the spotlight reaches, on the same grid and through the dots' first mask, so they land on the static dots, and under the resting band, where no static dots show, they appear on their own.
- **Spotlight swelling:** while the CV shows, the dots under a mouse's spotlight grow from 1px to 1.6px in their own colours, with the lit dots' falloff and on the spotlight's spring, without moving.
- **Budget:** the canvas draws only while an echo or the sweep runs or the spotlight moves, on Framer Motion's frame loop, which a hidden tab pauses. It is at most 2× the CSS pixels, and 1× on a page over 4 million CSS pixels. Other pages (sign-in, error pages, the PDF view) keep an empty 0×0 canvas. Reduced motion leaves the canvas out, and print and forced colours hide it.
- **Rejected:** lit dots under the resting band, both as hard and bright as under a passing band and softened with a small core and a long edge, because they stayed right behind the small text all the time, and the band reads better as a plain reflection; a ring of light spreading from the name, and dots pushed outward by a wave, because the second light reads best as a copy of the first one from another direction, and a second light that starts when the reveal ends, because the two read as one moment when they cross together; a comet that circles the page without end, dots that dodge the pointer and ripple from clicks anywhere, and a depth layer that shifts against the pointer. The comet and the dodging dots compete with the name's weight play and the portrait's tilt, and the comet is an endless decorative loop; the depth layer was too faint to notice. For the directed light, compared in the real app in both themes: removing the dots, which keeps a cleaner surface but loses the echo and the material the sweep lights up; a 10% peak, which leaves the light too quiet in the dark theme; and a slow endless drift of the beam (±2.5° over 28s), which would make the background move on its own.

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
- **Do** use the shared spring (stiffness 100, damping 20) and an 18px rise for entrances; respect reduced motion: no letter blur, photo reveal, name glow, weight wave, tilt, foil sweep, pointer pull, copy burst, name echo, light sweep or beam lean. Animate `transform` and `opacity`; the only exceptions are the name's blur, halo `filter` and weight axis (with every letter's width locked), the portrait photo's blur as it sharpens in, the pointer lights' `background-image` and `background-position` (the name's sheen, the portrait's border light and foil), the loading skeletons' shimmer `background-position`, and the background's lit dots under the echo and the sweep, which a canvas draws only while they move.
- **Do** keep pointer effects to mouse input (`pointerType === "mouse"`); touch gets the name's weight wave instead.
- **Do** keep focus-visible outlines on every interactive element.

### Don't:

- **Don't** add a second accent colour or gradient fills beyond the name's ink-to-muted fade, the portrait placeholder's accent wash, the portrait foil and the background's directed light.
- **Don't** put shadows or cards on content by default.
- **Don't** use mono type for body copy.
- **Don't** let background effects exceed ~10% opacity or capture pointer events. There are three exceptions: the directed light peaks at 16% in the top-left corner, the resting band at about 11% in the dark theme and 20% in the light theme in its middle, and a lit dot, under the spotlight, the sweep or the echo, reaches 75% accent, because each is only a few pixels wide.
- **Don't** let the background move on its own or answer anything but the name and the pointer: no endless loops, no dots that dodge the pointer, no ripples from clicks elsewhere on the page. The sweep runs once per name reveal, the echo with it and once per click or tap on the name, and the beam only leans with a mouse.
