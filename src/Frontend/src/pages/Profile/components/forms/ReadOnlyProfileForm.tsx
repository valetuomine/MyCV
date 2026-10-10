import type { JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import RHFInput from "../../../components/RHFInput"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

interface ReadOnlyProfileFormProps {
  values: Profile
  onEdit?: () => void
}

export default function ReadOnlyProfileForm({
  values,
  onEdit,
}: ReadOnlyProfileFormProps): JSX.Element {
  return (
    <>
      <section className="relative grid max-w-3xl content-center justify-items-start text-left">
        <h1
          className="m-0 max-w-full animate-fade-up font-cv-serif text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-normal max-sm:text-[clamp(2.5rem,12vw,3.75rem)]"
          style={{ animationDelay: "100ms" }}
        >
          Hey, my name is{" "}
          <RHFInput<ProfileSchema>
            name="fullName"
            label="Full name"
            isEditing={false}
            className="text-inherit"
          />
        </h1>
        {values.title && (
          <p className="mt-4 font-cv-sans text-lg text-cv-paper">
            {values.title}
          </p>
        )}
        {values.summary && (
          <p className="mt-3 max-w-xl text-base leading-[1.7] text-cv-copy">
            {values.summary}
          </p>
        )}
        {values.location && (
          <p className="mt-3 text-sm text-cv-muted">{values.location}</p>
        )}
        <p
          className="mt-6 max-w-xl animate-fade-up text-base leading-[1.7] text-cv-copy sm:mt-8"
          style={{ animationDelay: "200ms" }}
        >
          Explore my work on{" "}
          <RHFInput<ProfileSchema>
            name="gitHubUrl"
            label="GitHub"
            isEditing={false}
            link
            displayLabel="GitHub"
            className="text-cv-paper"
          />
          , and connect with me on{" "}
          <RHFInput<ProfileSchema>
            name="linkedInUrl"
            label="LinkedIn"
            isEditing={false}
            link
            displayLabel="LinkedIn"
            className="text-cv-paper"
          />
        </p>
      </section>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-cv-muted bg-transparent px-5 py-2 text-sm font-medium text-cv-paper transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-cv-accent"
        >
          Edit profile
        </button>
      )}
    </>
  )
}
