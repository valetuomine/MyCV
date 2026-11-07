/**
 * The featured CV card's grid: its text and portrait side by side, with the
 * buttons under the text. On phones the buttons take the full width under
 * both; on wider screens the portrait runs from the top of the content to the
 * bottom of the buttons. The card and its skeleton share it so the skeleton
 * keeps the card's size.
 */
export const featuredCvGridClassName =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-7 p-6 [grid-template-areas:'text_portrait'_'actions_actions'] sm:gap-x-8 sm:p-8 sm:[grid-template-areas:'text_portrait'_'actions_portrait']"

/**
 * The portrait's place and size in `featuredCvGridClassName`: an 80 px
 * square beside the name on phones, and 192 px wide and as tall as the
 * content on wider screens. The card and its skeleton share it.
 */
export const featuredCvPortraitClassName =
  "size-20 self-start rounded-2xl [grid-area:portrait] sm:h-auto sm:w-48 sm:self-stretch"
