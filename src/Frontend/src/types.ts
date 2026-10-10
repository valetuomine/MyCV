export const InputType = {
  Text: "text",
  Email: "email",
  Tel: "tel",
  Url: "url",
} as const

export type InputType = (typeof InputType)[keyof typeof InputType]

export const LanguageCode = {
  Finnish: "fi",
  English: "en",
} as const

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode]
