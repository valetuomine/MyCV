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
 * and again after a language change, which resets the title. From `2xl` up
 * the page widens while the edit view (`data-edit-view`, set by
 * `ProfileForm`) shows, so its preview gets the room; the CV itself keeps
 * `max-w-7xl`. The 84.6rem is the edit form's 45.6rem form column, its 4rem
 * gap and a 35rem preview, wide enough for a long name on one row, so it
 * changes with them. The content clips only vertically, so the actions that
 * lean toward the pointer, the copy burst and the name's reveal blur can
 * reach into the page gutter; the page frame's `overflow-x-clip` still keeps
 * the page from scrolling sideways.
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
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pt-20 lg:pt-4 2xl:has-data-edit-view:max-w-[84.6rem]">
      <div className="flex flex-1 items-center overflow-y-clip py-12 sm:py-16">
        <div className="w-full">
          <ProfileForm values={values} pdfPath={pdfPath} />
        </div>
      </div>
    </main>
  )
}
