import { useState, type JSX } from "react"

interface ProfilePortraitProps {
  fullName?: string | null
  initials: string
  imageUrl?: string | null
}

// Shows the profile photo when one exists, otherwise a monogram placeholder.
export default function ProfilePortrait({
  fullName,
  initials,
  imageUrl,
}: ProfilePortraitProps): JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl

  return (
    <div className="relative h-[clamp(20rem,68dvh,40rem)] w-full overflow-hidden rounded-3xl border border-cv-line bg-cv-surface shadow-cv-panel">
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={fullName ? `Portrait of ${fullName}` : "Profile portrait"}
          onError={() => setFailedUrl(imageUrl ?? null)}
          className="size-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid size-full place-items-center bg-linear-to-br from-cv-accent/20 via-transparent to-transparent"
        >
          <span className="font-cv-display text-[clamp(4.5rem,12vw,8rem)] leading-none font-semibold tracking-tighter text-cv-accent/80">
            {initials}
          </span>
        </div>
      )}
    </div>
  )
}
