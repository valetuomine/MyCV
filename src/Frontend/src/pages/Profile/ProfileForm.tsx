import { useState, type JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import RHFInput from "../components/RHFInput"
import useIsAdmin from "../../auth/useIsAdmin"
import type { Profile } from "../../api/profileQueries"

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  github: z.string(),
  linkedin: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfileForm({
  profile,
}: {
  profile: Profile
}): JSX.Element {
  const hasAdminMode = useIsAdmin()
  const isAdmin = import.meta.env.DEV && hasAdminMode
  const [isEditing, setIsEditing] = useState(false)
  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName ?? "",
      github: profile.gitHubUrl ?? "",
      linkedin: profile.linkedInUrl ?? "",
    },
  })

  const saveProfile = methods.handleSubmit(() => setIsEditing(false))

  const cancelEditing = (): void => {
    methods.reset()
    setIsEditing(false)
  }

  return (
    <FormProvider {...methods}>
      <div className="grid w-full justify-items-start gap-8 sm:pl-[clamp(0rem,8vw,7rem)]">
        {isEditing ? (
          <form
            onSubmit={saveProfile}
            className="grid w-full max-w-3xl gap-6"
            noValidate
          >
            <h1 className="m-0 font-cv-serif text-4xl font-normal">
              Edit profile
            </h1>
            <div className="grid w-full gap-5 sm:grid-cols-2">
              <RHFInput<ProfileFormValues>
                name="fullName"
                label="Full name"
                isEditing
                required
                autoComplete="name"
              />
              <RHFInput<ProfileFormValues>
                name="github"
                label="GitHub"
                isEditing
                autoComplete="url"
              />
              <RHFInput<ProfileFormValues>
                name="linkedin"
                label="LinkedIn"
                isEditing
                autoComplete="url"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded border border-cv-paper bg-cv-paper px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-cv-paper focus-visible:outline-2 focus-visible:outline-cv-accent"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded border border-cv-muted bg-transparent px-5 py-2 text-sm font-medium text-cv-paper transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-cv-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="relative grid max-w-3xl content-center justify-items-start text-left">
              <h1
                className="m-0 max-w-full animate-fade-up font-cv-serif text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-normal max-sm:text-[clamp(2.5rem,12vw,3.75rem)]"
                style={{ animationDelay: "100ms" }}
              >
                Hey, my name is{" "}
                <RHFInput<ProfileFormValues>
                  name="fullName"
                  label="Full name"
                  isEditing={false}
                  className="text-inherit"
                />
              </h1>
              {profile.title && (
                <p className="mt-4 font-cv-sans text-lg text-cv-paper">
                  {profile.title}
                </p>
              )}
              {profile.summary && (
                <p className="mt-3 max-w-xl text-base leading-[1.7] text-cv-copy">
                  {profile.summary}
                </p>
              )}
              {profile.location && (
                <p className="mt-3 text-sm text-cv-muted">{profile.location}</p>
              )}
              <p
                className="mt-6 max-w-xl animate-fade-up text-base leading-[1.7] text-cv-copy sm:mt-8"
                style={{ animationDelay: "200ms" }}
              >
                Explore my work on{" "}
                <RHFInput<ProfileFormValues>
                  name="github"
                  label="GitHub"
                  isEditing={false}
                  link
                  displayLabel="GitHub"
                  className="text-cv-paper"
                />
                , and connect with me on{" "}
                <RHFInput<ProfileFormValues>
                  name="linkedin"
                  label="LinkedIn"
                  isEditing={false}
                  link
                  displayLabel="LinkedIn"
                  className="text-cv-paper"
                />
              </p>
            </section>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded border border-cv-muted bg-transparent px-5 py-2 text-sm font-medium text-cv-paper transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-cv-accent"
              >
                Edit profile
              </button>
            )}
          </>
        )}
      </div>
    </FormProvider>
  )
}
