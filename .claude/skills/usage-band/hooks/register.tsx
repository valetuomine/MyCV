import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput } from 'claude-code'

import type { ContextNotice } from '../types'
import {
  budgetWarning,
  computeLimit,
  contextStopReason,
  contextWarning,
  kilo,
  parseBudgetConfig,
  parseContextLimits,
} from './core.mjs'

/**
 * The usage row, warnings and context stop for the surfaces that have no status line
 * (the desktop app and the VS Code panel). The terminal keeps the status line and the settings hooks
 * in .claude/hooks/, so this plugin draws and warns nothing while a terminal draws the session.
 * The settings files stay in .claude/hooks/ and are read from there, so they remain the only source.
 */

const line = atom({ plugin: 'usage-band', key: 'line' } as const, '')
const notice = atom({ plugin: 'usage-band', key: 'contextNotice' } as const, { warned: false, handoff: false } as ContextNotice)

type Figures = Pick<SessionMeasureInput, 'context' | 'rateLimits'>
type Config = { budget: ReturnType<typeof parseBudgetConfig>; context: ReturnType<typeof parseContextLimits> }

const HANDOFF_DELAY_MS = 100

/** Reads a JSON file relative to the plugin folder; undefined when it is missing or bad. */
const readJson = async ($: EngineInterface, relative: string): Promise<unknown> => {
  try {
    return JSON.parse(await $.fs.read(`${$.plugin.root}/${relative}`))
  } catch {
    return undefined
  }
}

/** Reads the budget and context settings that the settings hooks read too. */
const loadConfig = async ($: EngineInterface): Promise<Config> => ({
  budget: parseBudgetConfig(await readJson($, '../../hooks/usage-budget.json')),
  context: parseContextLimits(await readJson($, '../../hooks/context-budget.json')),
})

/** True when the session draws on a surface and none of them is the terminal. */
const isAppOnly = async ($: EngineInterface) => {
  const surfaces = await $.session.surfaces()
  return surfaces.length > 0 && !surfaces.includes('terminal')
}

const toSeconds = (iso?: string) => (iso ? Date.parse(iso) / 1000 : Number.NaN)

const pad = (n: number) => String(n).padStart(2, '0')

/** ` (nollautuu HH:MM)` in local time, or '' when the time is missing or already past. */
const resetsText = (iso: string | undefined, nowSeconds: number) => {
  const seconds = toSeconds(iso)
  if (!Number.isFinite(seconds) || seconds <= nowSeconds) return ''
  const d = new Date(seconds * 1000)
  return ` (nollautuu ${pad(d.getHours())}:${pad(d.getMinutes())})`
}

/** `Viikko 22 % / 14 % · 5 h 64 % (nollautuu 00:30) · Konteksti 92k (9 %)`, leaving out what is not known. */
export const formatLine = ({ context, rateLimits }: Figures, shares: number[], nowSeconds: number) => {
  const week = rateLimits.find(r => r.kind === 'seven_day')
  const five = rateLimits.find(r => r.kind === 'five_hour')
  const parts: string[] = []
  if (week) {
    const resetsAt = toSeconds(week.resetsAt)
    const limit =
      Number.isFinite(resetsAt) && resetsAt > nowSeconds
        ? ` / ${Math.round(computeLimit(resetsAt, nowSeconds, shares).limit)} %`
        : ''
    parts.push(`Viikko ${Math.round(week.percentUsed)} %${limit}`)
  }
  if (five) parts.push(`5 h ${Math.round(five.percentUsed)} %${resetsText(five.resetsAt, nowSeconds)}`)
  if (context.tokens !== undefined) {
    const percent = context.percent === undefined ? '' : ` (${Math.round(context.percent)} %)`
    parts.push(`Konteksti ${kilo(context.tokens)}${percent}`)
  }
  return parts.join(' · ')
}

/** Shows a store-marked toast once: the marker outlives the session, so a day's warning shows once. */
const claimOnce = async ($: EngineInterface, key: string) => {
  if ((await $.store.get(key)) === true) return false
  await $.store.set(key, true)
  return true
}

/** The weekly budget warnings of usage-budget.mjs: near and over the day's limit, each once a day. */
const warnBudget = async ($: EngineInterface, figures: Figures, config: Config, nowSeconds: number) => {
  const week = figures.rateLimits.find(r => r.kind === 'seven_day')
  const resetsAt = toSeconds(week?.resetsAt)
  if (!week || !Number.isFinite(resetsAt)) return
  const warning = budgetWarning(week.percentUsed, resetsAt, nowSeconds, config.budget)
  if (!warning) return
  if (warning.level === 'over') {
    const first = await claimOnce($, `budget-${warning.key}-over`)
    await claimOnce($, `budget-${warning.key}-near`)
    if (first) $.ui.toast(warning.text)
    return
  }
  if (await claimOnce($, `budget-${warning.key}-near`)) $.ui.toast(warning.text)
}

/** The context warning of context-budget.mjs: once a session over warnTokens, again after the context shrank. */
const warnContext = async ($: EngineInterface, tokens: number | undefined, config: Config) => {
  if (tokens === undefined) return
  const { warnTokens, stopTokens } = config.context
  const state = await read($, notice)
  if (tokens < warnTokens) {
    if (state.warned || state.handoff) await update($, notice, () => ({ warned: false, handoff: false }))
    return
  }
  if (tokens < stopTokens && state.handoff) await update($, notice, s => ({ ...s, handoff: false }))
  if (state.warned) return
  await update($, notice, s => ({ ...s, warned: true }))
  $.ui.toast(tokens >= stopTokens ? contextStopReason(tokens, stopTokens) : contextWarning(tokens, stopTokens))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const config = await loadConfig($)
    const nowSeconds = (await $.clock.now()) / 1000
    const usage = await $.session.usage()
    await update($, line, () => formatLine(usage, config.budget.shares, nowSeconds))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const config = await loadConfig($)
    const nowSeconds = (await $.clock.now()) / 1000
    await update($, line, () => formatLine(e, config.budget.shares, nowSeconds))
    if (await isAppOnly($)) {
      await warnBudget($, e, config, nowSeconds)
      await warnContext($, e.context.tokens, config)
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || e.text.trimStart().startsWith('/') || !(await isAppOnly($))) return next(e)
    const config = await loadConfig($)
    const { tokens } = (await $.session.usage()).context
    if (tokens !== undefined && tokens >= config.context.stopTokens) {
      const reason = contextStopReason(tokens, config.context.stopTokens)
      $.ui.toast(reason)
      if (!(await read($, notice)).handoff) {
        await update($, notice, s => ({ ...s, handoff: true }))
        // A prompt.submit hook may not run a command (it would wait on the turn it holds), and a
        // submitted '/handoff' text is refused as the person's own command: run it from a timer.
        $.clock.after(HANDOFF_DELAY_MS, () => {
          $.command.run({ command: 'handoff' }).catch(() => undefined)
        })
      }
      return { drop: reason }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface === 'terminal' || e.props.hasSurvey) return next(e)
    const text = await read($, line)
    if (text === '') return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>{text}</Text>
      </Box>
    )
  })
}
