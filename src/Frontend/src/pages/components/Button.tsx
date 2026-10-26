import type {
  AnchorHTMLAttributes,
  AriaAttributes,
  ButtonHTMLAttributes,
  JSX,
  MouseEvent,
  ReactNode,
  Ref,
} from "react"
import { useTranslation } from "react-i18next"
import { Link, type LinkProps } from "react-router-dom"
import { ButtonSize, ButtonVariant } from "../../types"

interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

interface NativeButtonProps
  extends
    ButtonStyleProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  ref?: Ref<HTMLButtonElement>
  loading?: boolean
  loadingText?: ReactNode
}

interface RouterLinkButtonProps
  extends ButtonStyleProps, Omit<LinkProps, "className" | "children"> {
  ref?: Ref<HTMLAnchorElement>
}

interface ExternalLinkButtonProps
  extends
    ButtonStyleProps,
    Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "className" | "children" | "href" | "target" | "rel"
    > {
  ref?: Ref<HTMLAnchorElement>
  href: string
}

type ButtonProps =
  NativeButtonProps | RouterLinkButtonProps | ExternalLinkButtonProps

type ButtonShape = "pill" | "icon" | "text" | "segment"

/** Which shape, and so which size classes, each variant takes. */
const variantShapes: Record<ButtonVariant, ButtonShape> = {
  [ButtonVariant.Primary]: "pill",
  [ButtonVariant.Secondary]: "pill",
  [ButtonVariant.Danger]: "pill",
  [ButtonVariant.Brand]: "pill",
  [ButtonVariant.Icon]: "icon",
  [ButtonVariant.Text]: "text",
  [ButtonVariant.Segment]: "segment",
}

/**
 * Each variant's resting colours, and the hover and press feedback that only
 * applies while the button can be used. Every variant changes visibly on
 * hover. Brand leaves its colours to the caller, such as the sign-in
 * providers' own, so its hover is a faint layer of its own text colour
 * (`::after`, `bg-current`), which shows on any brand colours in both themes.
 * Segment is one option of a choice inside a pill track, such as the
 * language: `aria-pressed` marks the chosen one with the accent fill.
 */
const variantClasses: Record<
  ButtonVariant,
  { rest: string; interactive: string }
> = {
  [ButtonVariant.Primary]: {
    rest: "rounded-full border border-transparent bg-cv-accent text-cv-accent-ink",
    interactive:
      "hover:bg-cv-accent-strong hover:shadow-cv-accent active:scale-[0.97]",
  },
  [ButtonVariant.Secondary]: {
    rest: "rounded-full border border-cv-line bg-cv-wash text-cv-ink",
    interactive:
      "hover:border-cv-meta hover:bg-cv-overlay hover:shadow-cv-panel active:scale-[0.97]",
  },
  [ButtonVariant.Danger]: {
    rest: "rounded-full border border-cv-danger/50 text-cv-danger",
    interactive:
      "hover:border-cv-danger hover:bg-cv-danger/10 active:scale-[0.97]",
  },
  [ButtonVariant.Brand]: {
    rest: "rounded-full border after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0 after:transition-opacity after:duration-200",
    interactive:
      "hover:shadow-cv-panel hover:after:opacity-[0.08] active:scale-[0.97]",
  },
  [ButtonVariant.Icon]: {
    rest: "rounded-full border border-cv-line bg-cv-wash text-cv-copy",
    interactive:
      "hover:border-cv-meta hover:bg-cv-overlay hover:text-cv-ink active:scale-[0.92]",
  },
  [ButtonVariant.Text]: {
    rest: "rounded-md text-cv-accent underline decoration-cv-accent/40 underline-offset-4",
    interactive:
      "hover:text-cv-accent-strong hover:decoration-cv-accent-strong active:scale-[0.97]",
  },
  [ButtonVariant.Segment]: {
    rest: "rounded-full text-cv-copy aria-pressed:bg-cv-accent aria-pressed:text-cv-accent-ink",
    interactive:
      "hover:bg-cv-overlay hover:text-cv-ink aria-pressed:hover:bg-cv-accent-strong aria-pressed:hover:text-cv-accent-ink active:scale-[0.97]",
  },
}

/**
 * A segment's size, the same at every `ButtonSize`: 36 px inside its 44 px
 * track, reaching the track's edges with an invisible `::before`.
 */
const segmentSize =
  "h-9 px-2 text-xs before:absolute before:inset-x-0 before:-inset-y-1"

/**
 * Each size per shape. Small buttons look smaller but keep a 44 px touch
 * target through an invisible `::before` that reaches past their edges.
 */
const sizeClasses: Record<ButtonSize, Record<ButtonShape, string>> = {
  [ButtonSize.Medium]: {
    pill: "min-h-11 px-5 py-2.5 text-sm",
    icon: "size-11",
    text: "min-h-11 min-w-11 text-sm",
    segment: segmentSize,
  },
  [ButtonSize.Small]: {
    pill: "min-h-9 px-4 py-1.5 text-sm before:absolute before:inset-x-0 before:-inset-y-1",
    icon: "size-9 before:absolute before:-inset-1",
    text: "min-h-11 min-w-11 text-xs",
    segment: segmentSize,
  },
}

/**
 * How each shape lays out its content. Icons stack theirs in one cell. Text
 * buttons pad their sides for the focus ring and pull back by the same
 * amount, so the label still lines up with the text around it. Segments set
 * their label as a mono code beside an icon.
 */
const shapeClasses: Record<ButtonShape, string> = {
  pill: "inline-flex items-center justify-center gap-2 text-center",
  icon: "inline-grid place-items-center",
  text: "-mx-1.5 inline-flex items-center gap-2 px-1.5",
  segment:
    "inline-flex items-center justify-center gap-1.5 font-cv-mono tracking-wide",
}

const baseClassName =
  "relative font-medium transition-[color,background-color,border-color,text-decoration-color,box-shadow,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-colors motion-reduce:active:scale-100"

const labelLayer =
  "col-start-1 row-start-1 inline-flex items-center justify-center gap-2"

/**
 * Builds a button's classes. Unavailable and loading buttons drop their hover
 * and press feedback, so they don't look clickable.
 *
 * @param variant - The button's look.
 * @param size - The button's size.
 * @param state - Whether the button is unavailable, loading, or usable.
 * @param className - Extra classes from the caller, such as layout.
 * @returns The class list.
 */
function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  state: "unavailable" | "loading" | "usable",
  className: string,
): string {
  const shape = variantShapes[variant]
  const { rest, interactive } = variantClasses[variant]
  /** The state's own classes: dimmed when unavailable, a busy cursor when loading. */
  const stateClassName =
    state === "unavailable"
      ? "cursor-not-allowed opacity-60"
      : state === "loading"
        ? "cursor-progress"
        : interactive

  return [
    baseClassName,
    shapeClasses[shape],
    sizeClasses[size][shape],
    rest,
    stateClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * Tells whether `aria-disabled` marks the element unavailable.
 *
 * @param value - The `aria-disabled` value.
 * @returns Whether the element is unavailable.
 */
function isAriaDisabled(value: AriaAttributes["aria-disabled"]): boolean {
  return value === true || value === "true"
}

/**
 * The app's one button: a `<button>` by default, a React Router link with
 * `to`, or an external link with `href`, which opens in a new tab with an
 * arrow and says so to screen readers. Every variant shares the press
 * feedback, focus ring, transitions and reduced-motion handling.
 *
 * A button can be unavailable in two ways: `disabled`, which also takes it
 * out of the tab order, or `aria-disabled`, which keeps it focusable, so
 * focus isn't lost when it becomes unavailable in the user's hands. Both
 * block the click. `loading` sets `aria-busy`, blocks the click the
 * `aria-disabled` way and, with `loadingText`, swaps the label for a spinner
 * and that text. Both labels share one grid cell, so the width doesn't jump.
 *
 * @param props - The component props.
 * @param props.variant - The look: primary, secondary, danger, icon, text, segment, or brand, whose colours come from `className`.
 * @param props.size - Medium (44 px) or small, which keeps a 44 px touch target.
 * @param props.className - Extra classes, such as `w-full`; they must not fight the variant's own.
 * @param props.children - The label; icon buttons also need an `aria-label`.
 * @returns The button or link.
 */
export default function Button(props: ButtonProps): JSX.Element {
  const { t } = useTranslation()

  if ("to" in props) {
    const {
      variant = ButtonVariant.Secondary,
      size = ButtonSize.Medium,
      className = "",
      children,
      ref,
      onClick,
      ...linkProps
    } = props
    const isUnavailable = isAriaDisabled(linkProps["aria-disabled"])

    /**
     * Follows the link unless it is marked unavailable.
     *
     * @param event - The click.
     */
    const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
      if (isUnavailable) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }

    return (
      <Link
        {...linkProps}
        ref={ref}
        onClick={handleClick}
        className={buttonClassName(
          variant,
          size,
          isUnavailable ? "unavailable" : "usable",
          className,
        )}
      >
        {children}
      </Link>
    )
  }

  if ("href" in props) {
    const {
      variant = ButtonVariant.Secondary,
      size = ButtonSize.Medium,
      className = "",
      children,
      ref,
      onClick,
      ...anchorProps
    } = props
    const isUnavailable = isAriaDisabled(anchorProps["aria-disabled"])

    /**
     * Opens the link unless it is marked unavailable.
     *
     * @param event - The click.
     */
    const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
      if (isUnavailable) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }

    return (
      <a
        {...anchorProps}
        ref={ref}
        target="_blank"
        rel="noreferrer"
        onClick={handleClick}
        className={`group ${buttonClassName(
          variant,
          size,
          isUnavailable ? "unavailable" : "usable",
          className,
        )}`}
      >
        {children}
        <span className="sr-only">{t("common.opensInNewTab")}</span>
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-0"
        >
          ↗
        </span>
      </a>
    )
  }

  const {
    variant = ButtonVariant.Secondary,
    size = ButtonSize.Medium,
    className = "",
    children,
    ref,
    loading = false,
    loadingText,
    type = "button",
    disabled,
    onClick,
    ...buttonProps
  } = props
  const isUnavailable =
    Boolean(disabled) || isAriaDisabled(buttonProps["aria-disabled"])
  /** Unavailable wins over loading, which only matters while usable. */
  const state = isUnavailable ? "unavailable" : loading ? "loading" : "usable"

  /**
   * Runs the click unless the button is loading or marked unavailable. A
   * submit button's form is then not submitted either.
   *
   * @param event - The click.
   */
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (loading || isUnavailable) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading || buttonProps["aria-disabled"] || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={buttonClassName(variant, size, state, className)}
    >
      {loadingText === undefined ? (
        children
      ) : (
        <span className="grid">
          <span className={`${labelLayer} ${loading ? "invisible" : ""}`}>
            {children}
          </span>
          <span className={`${labelLayer} ${loading ? "" : "invisible"}`}>
            <span
              aria-hidden="true"
              className={`size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent ${loading ? "animate-cv-spin motion-reduce:animate-cv-spin-slow" : ""}`}
            />
            {loadingText}
          </span>
        </span>
      )}
    </button>
  )
}
