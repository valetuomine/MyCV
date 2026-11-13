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
    rest: "rounded-md text-cv-accent-strong underline decoration-cv-accent-strong/40 underline-offset-4",
    interactive:
      "hover:text-cv-ink hover:decoration-cv-ink active:scale-[0.97]",
  },
  [ButtonVariant.Segment]: {
    rest: "rounded-full text-cv-copy aria-pressed:bg-cv-accent aria-pressed:text-cv-accent-ink",
    interactive:
      "hover:bg-cv-overlay hover:text-cv-ink aria-pressed:hover:bg-cv-accent-strong aria-pressed:hover:text-cv-accent-ink active:scale-[0.97]",
  },
}

/**
 * A segment's size, the same at every `ButtonSize`: 36 px inside its 44 px
 * track, reaching the track's edges with an invisible `::before`. It is at
 * least 44 px wide, so a segment holding only an icon still has a full touch
 * target.
 */
const segmentSize =
  "h-9 min-w-11 px-3.5 before:absolute before:inset-x-0 before:-inset-y-1"

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
 * amount, so the label still lines up with the text around it. Segments
 * centre their content, such as a flag.
 */
const shapeClasses: Record<ButtonShape, string> = {
  pill: "inline-flex items-center justify-center gap-2 text-center",
  icon: "inline-grid place-items-center",
  text: "-mx-1.5 inline-flex items-center gap-2 px-1.5",
  segment: "inline-flex items-center justify-center",
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
  const stateClassName = {
    unavailable: "cursor-not-allowed opacity-60",
    loading: "cursor-progress",
    usable: interactive,
  }[state]

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
 * Builds a click handler that blocks the click while the element can't be
 * used, so a link isn't followed and a submit button's form isn't submitted,
 * and otherwise passes it on to the caller's handler.
 *
 * @param blocked - Whether the click is blocked.
 * @param onClick - The caller's click handler, if any.
 * @returns The click handler.
 */
function guardClick<E extends HTMLElement>(
  blocked: boolean,
  onClick?: (event: MouseEvent<E>) => void,
): (event: MouseEvent<E>) => void {
  return (event) => {
    if (blocked) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
}

/**
 * A button-styled React Router link, which blocks the click while
 * `aria-disabled` marks it unavailable.
 *
 * @param props - The link props.
 * @param props.variant - The look.
 * @param props.size - The size.
 * @param props.className - Extra classes.
 * @param props.children - The label.
 * @param props.ref - The anchor's ref.
 * @param props.onClick - The caller's click handler.
 * @returns The link.
 */
function RouterLinkButton({
  variant = ButtonVariant.Secondary,
  size = ButtonSize.Medium,
  className = "",
  children,
  ref,
  onClick,
  ...linkProps
}: Readonly<RouterLinkButtonProps>): JSX.Element {
  const isUnavailable = isAriaDisabled(linkProps["aria-disabled"])

  return (
    <Link
      {...linkProps}
      ref={ref}
      onClick={guardClick(isUnavailable, onClick)}
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

/**
 * A button-styled external link that opens in a new tab with an arrow and
 * says so to screen readers. It blocks the click while `aria-disabled` marks
 * it unavailable.
 *
 * @param props - The link props.
 * @param props.variant - The look.
 * @param props.size - The size.
 * @param props.className - Extra classes.
 * @param props.children - The label.
 * @param props.ref - The anchor's ref.
 * @param props.href - The link's address.
 * @param props.onClick - The caller's click handler.
 * @returns The link.
 */
function ExternalLinkButton({
  variant = ButtonVariant.Secondary,
  size = ButtonSize.Medium,
  className = "",
  children,
  ref,
  href,
  onClick,
  ...anchorProps
}: Readonly<ExternalLinkButtonProps>): JSX.Element {
  const { t } = useTranslation()
  const isUnavailable = isAriaDisabled(anchorProps["aria-disabled"])

  return (
    <a
      {...anchorProps}
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={guardClick(isUnavailable, onClick)}
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

/**
 * Tells a native button's state. Unavailable wins over loading, which only
 * matters while usable.
 *
 * @param isUnavailable - Whether `disabled` or `aria-disabled` is set.
 * @param loading - Whether the button is loading.
 * @returns The state.
 */
function nativeButtonState(
  isUnavailable: boolean,
  loading: boolean,
): "unavailable" | "loading" | "usable" {
  if (isUnavailable) {
    return "unavailable"
  }
  return loading ? "loading" : "usable"
}

/**
 * A `<button>`. `loading` sets `aria-busy`, blocks the click the
 * `aria-disabled` way and, with `loadingText`, swaps the label for a spinner
 * and that text in the same grid cell, so the width doesn't jump.
 *
 * @param props - The button props.
 * @param props.variant - The look.
 * @param props.size - The size.
 * @param props.className - Extra classes.
 * @param props.children - The label.
 * @param props.ref - The button's ref.
 * @param props.loading - Whether the button is busy.
 * @param props.loadingText - The label shown with the spinner while loading.
 * @param props.type - The button type, `button` by default.
 * @param props.disabled - Whether the button is disabled.
 * @param props.onClick - The caller's click handler.
 * @returns The button.
 */
function NativeButton({
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
}: Readonly<NativeButtonProps>): JSX.Element {
  const isUnavailable =
    Boolean(disabled) || isAriaDisabled(buttonProps["aria-disabled"])

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading || buttonProps["aria-disabled"] || undefined}
      aria-busy={loading || undefined}
      onClick={guardClick(loading || isUnavailable, onClick)}
      className={buttonClassName(
        variant,
        size,
        nativeButtonState(isUnavailable, loading),
        className,
      )}
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
  if ("to" in props) {
    return <RouterLinkButton {...props} />
  }
  if ("href" in props) {
    return <ExternalLinkButton {...props} />
  }
  return <NativeButton {...props} />
}
