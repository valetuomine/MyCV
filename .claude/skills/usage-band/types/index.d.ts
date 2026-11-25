/** Which context notices this session has given; both start again once the context shrinks below warnTokens. */
export type ContextNotice = { warned: boolean; handoff: boolean }

/** The model recommendation of the work item that the first message names: `checked` once the first message was looked at, `text` empty when there is nothing to show, `generation` raised on every new session so that a late lookup of the previous one is ignored. */
export type ModelHint = { checked: boolean; text: string; generation: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { line: string; contextNotice: ContextNotice; modelHint: ModelHint }
  }
}
