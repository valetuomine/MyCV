import { m as motion, type Variants } from "framer-motion"
import { useId, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { HomeFact } from "../../../../types"
import { headingClassName } from "../../../components/headingClassName"

interface HomeFactsProps {
  variants?: Variants
}

/**
 * What a CV's link gives its viewer: its own address, always the latest
 * version, and the same content as a PDF. Each fact sits under a Field
 * Border hairline, because a plain Hairline fades into the background's
 * light and reads as a smudge; the three stand side by side with equal
 * weight from `lg` up and stack below.
 *
 * @param props - The component props.
 * @param props.variants - The section's entrance, started by the page.
 * @returns The facts section.
 */
export default function HomeFacts({
  variants,
}: Readonly<HomeFactsProps>): JSX.Element {
  const { t } = useTranslation()
  const headingId = useId()

  return (
    <motion.section
      variants={variants}
      aria-labelledby={headingId}
      className="grid gap-8"
    >
      <h2 id={headingId} className={headingClassName}>
        {t("home.factsHeading")}
      </h2>
      <dl className="m-0 grid gap-y-10 lg:grid-cols-3 lg:gap-x-12">
        {Object.values(HomeFact).map((key) => (
          <div
            key={key}
            className="grid content-start gap-3 border-t border-cv-field-border pt-5"
          >
            <dt className="m-0 font-cv-display text-xl font-semibold tracking-tight text-balance text-cv-ink">
              {t(`home.facts.${key}.title`)}
            </dt>
            <dd className="m-0 max-w-[48ch] text-base leading-relaxed text-pretty text-cv-copy">
              {t(`home.facts.${key}.body`)}
            </dd>
          </div>
        ))}
      </dl>
    </motion.section>
  )
}
