import { useEffect, type JSX } from "react"
import { useTranslation } from "react-i18next"
import type { Profile } from "../../../api/profileQueries"
import ProfileForm from "./forms/ProfileForm"

interface ProfilePageProps {
  values: Profile
  pdfPath?: string
}

/**
 * The CV page. Names the browser tab after the candidate while it is open,
 * and again after a language change, which resets the title.
 *
 * @param props - The component props.
 * @param props.values - The public profile to show.
 * @param props.pdfPath - The path of the CV's PDF view, for the CV's link to it.
 * @returns The page's main landmark with the CV.
 */
export default function ProfilePage({
  values,
  pdfPath,
}: ProfilePageProps): JSX.Element {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = values.fullName
      ? t("meta.profileTitle", { name: values.fullName })
      : t("meta.title")
    return () => {
      document.title = i18n.t("meta.title")
    }
  }, [i18n, t, values.fullName])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pt-20 lg:pt-4">
      <div className="flex flex-1 items-center overflow-clip py-12 sm:py-16">
        <div className="w-full">
          <ProfileForm values={values} pdfPath={pdfPath} />
        </div>
      </div>
    </main>
  )
}
