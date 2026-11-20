import type { Variants } from "framer-motion"

/**
 * The featured CV card's grid: its text and portrait side by side, with the
 * buttons under them. On phones and in the hero from `lg` up the buttons take
 * the card's full width, so all three stay on one row in the narrow hero
 * card; between `sm` and `lg`, where the card is wide, the portrait runs from
 * the top of the content to the bottom of the buttons. From `lg` up the card
 * is as tall as the hero's text column, so the eyebrow stays at the top and
 * the name, title and location sit on the buttons. The card and its skeleton
 * share it so the skeleton keeps the card's size.
 */
export const featuredCvGridClassName =
  "grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto] gap-x-5 gap-y-7 p-6 [grid-template-areas:'text_portrait'_'actions_actions'] sm:gap-x-8 sm:p-8 sm:[grid-template-areas:'text_portrait'_'actions_portrait'] lg:h-full lg:[grid-template-areas:'text_portrait'_'actions_actions']"

/**
 * The featured card's text area in `featuredCvGridClassName`: the eyebrow at
 * the top and the name, title and location at the bottom, so the room that a
 * tall card leaves goes under the eyebrow instead of between the location and
 * the buttons. It is the name's container (`featuredCvNameSizeClassName`).
 * The card and its skeleton share it.
 */
export const featuredCvTextClassName =
  "@container grid min-w-0 content-between [grid-area:text]"

/**
 * The portrait's place and size in `featuredCvGridClassName`: an 80 px
 * square beside the name on phones, and as tall as its rows on wider screens:
 * 192 px wide in the wide card between `sm` and `lg`, and in the hero's
 * narrower card 144 px at `lg` and 160 px from `xl` up, so a usual two-part
 * name stays on one line beside it. The card and its skeleton share it.
 */
export const featuredCvPortraitClassName =
  "size-20 self-start rounded-2xl [grid-area:portrait] sm:h-auto sm:w-48 sm:self-stretch lg:w-36 xl:w-40"

/**
 * Lets the card's content rise into place once its data has arrived. Only
 * the content fades, never the card or anything around it: a fading
 * ancestor would switch off the Pane's backdrop blur until it ends.
 */
export const featuredCvReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
}

/**
 * The featured CV address's pill: as tall as the copy button beside it, on
 * the Pane with the Field Border hairline, the rim and the edge glow, like
 * the language track. It is never wider than its row, so a long address is
 * cut short inside it. The address and its skeleton share it.
 */
export const featuredCvAddressFrameClassName =
  "m-0 flex h-11 max-w-full min-w-0 items-center rounded-full border border-cv-field-border bg-cv-pane px-5 text-sm shadow-cv-edge inset-shadow-cv-rim forced-colors:shadow-none print:shadow-none"
