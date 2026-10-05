import type { JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import RHFInput from "../components/RHFInput"

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.email("Enter a valid email"),
  github: z.string(),
  linkedin: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfileForm(): JSX.Element {
  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "Valtteri Tuominen",
      email: "hello@mycv.dev",
      github: "github.com/valetuominen",
      linkedin: "linkedin.com/in/valetuomine/",
    },
  })
  return (
    <FormProvider {...methods}>
      <div className="grid w-full justify-items-start gap-8 sm:pl-[clamp(0rem,8vw,7rem)]">
        <section className="relative grid max-w-3xl content-center justify-items-start text-left">
          <h1
            className="m-0 max-w-full animate-fade-up font-cv-serif text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-normal max-sm:text-[clamp(2.5rem,12vw,3.75rem)]"
            style={{ animationDelay: "100ms" }}
          >
            Hey, my name is{" "}
            <RHFInput<ProfileFormValues>
              name="fullName"
              label="Full name"
              className="text-inherit"
              editIconSize="large"
            />
          </h1>
          <p
            className="mt-6 max-w-xl animate-fade-up text-base leading-[1.7] text-cv-copy sm:mt-8"
            style={{ animationDelay: "200ms" }}
          >
            You can reach me at{" "}
            <RHFInput<ProfileFormValues>
              name="email"
              label="Email"
              type="email"
              link
              className="text-cv-paper"
            />
            , explore my work on{" "}
            <RHFInput<ProfileFormValues>
              name="github"
              label="GitHub"
              link
              displayLabel="GitHub"
              className="text-cv-paper"
            />
            , and connect with me on{" "}
            <RHFInput<ProfileFormValues>
              name="linkedin"
              label="LinkedIn"
              link
              displayLabel="LinkedIn"
              className="text-cv-paper"
            />
          </p>
        </section>
      </div>
    </FormProvider>
  )
}
