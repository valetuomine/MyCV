import { useId, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"

interface PictureVisibilitySwitchProps {
  checked: boolean
  busy: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

/**
 * The Show profile picture on CV switch: the app's `Button` in its switch
 * look with `role="switch"`, so Space and Enter toggle it and a screen reader
 * reads its label, its hint and whether it is on. Its label toggles it too,
 * and the button keeps a 44 px touch target. While its own change saves, it
 * is `loading`, which keeps it focusable with `aria-busy` and ignores
 * presses, so focus doesn't drop to the page; another picture change
 * disables it outright. The thumb slides without motion when reduced motion
 * is preferred.
 *
 * @param props - The component props.
 * @param props.checked - Whether the CV shows the picture section.
 * @param props.busy - Whether the switch's own change is saving.
 * @param props.disabled - Whether another picture change is under way.
 * @param props.onChange - Saves the new value.
 * @returns The switch with its label and hint.
 */
export default function PictureVisibilitySwitch({
  checked,
  busy,
  disabled,
  onChange,
}: Readonly<PictureVisibilitySwitchProps>): JSX.Element {
  const { t } = useTranslation()
  const switchId = useId()
  const hintId = useId()

  return (
    <div className="flex items-start gap-3">
      <Button
        id={switchId}
        variant={ButtonVariant.Switch}
        role="switch"
        aria-checked={checked}
        aria-describedby={hintId}
        loading={busy}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="mt-px"
      >
        <span
          aria-hidden="true"
          className={`size-4.5 rounded-full shadow-cv-panel transition-transform duration-200 ease-out motion-reduce:transition-none ${checked ? "translate-x-5.5 bg-cv-accent-ink" : "translate-x-0.5 bg-cv-muted"}`}
        />
      </Button>
      <div className="grid gap-0.5">
        <label
          htmlFor={switchId}
          className={`text-sm font-medium text-cv-ink ${busy || disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {t("profilePicture.showOnCv")}
        </label>
        <p id={hintId} className="m-0 max-w-[56ch] text-xs text-cv-muted">
          {t("profilePicture.showOnCvHint")}
        </p>
      </div>
    </div>
  )
}
