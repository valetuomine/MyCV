/** Which context notices this session has given; both start again once the context shrinks below warnTokens. */
export type ContextNotice = { warned: boolean; handoff: boolean }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { line: string; contextNotice: ContextNotice }
  }
}
