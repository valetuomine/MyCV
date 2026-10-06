export const InputType = {
  Text: "text",
  Email: "email",
  Tel: "tel",
  Url: "url",
} as const

export type InputType = (typeof InputType)[keyof typeof InputType]
