import { z } from "zod"
import { validationMessage } from "../../../i18n/validationMessage"
import { extractPublicUrlSegment } from "../utils/profileFormUtils"

/**
 * The home page's open-a-CV form: a CV link or public address, turned into
 * the CV's public URL segment, which must not be empty. Its message is a
 * translation key, which the field translates when it shows it.
 */
export const openCvSchema = z.object({
  cvAddress: z
    .string()
    .transform(extractPublicUrlSegment)
    .refine(
      (publicUrlSegment) => publicUrlSegment !== "",
      validationMessage("cvAddressRequired"),
    ),
})

export type OpenCvSchema = z.infer<typeof openCvSchema>

export const openCvDefaultValues: OpenCvSchema = { cvAddress: "" }
