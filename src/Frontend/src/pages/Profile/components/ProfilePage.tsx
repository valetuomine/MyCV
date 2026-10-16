import { useEffect, type JSX } from "react"
import type { Profile } from "../../../api/profileQueries"
import ProfileForm from "./forms/ProfileForm"

interface ProfilePageProps {
  values: Profile
}

export default function ProfilePage({ values }: ProfilePageProps): JSX.Element {
  useEffect(() => {
    document.title = values.fullName ? `${values.fullName} · CV` : "MyCV"
    return () => {
      document.title = "MyCV"
    }
  }, [values.fullName])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pt-20 lg:pt-4">
      <div className="flex flex-1 items-center overflow-clip py-12 sm:py-16">
        <div className="w-full">
          <ProfileForm values={values} />
        </div>
      </div>
    </main>
  )
}