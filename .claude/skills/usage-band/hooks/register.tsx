import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput } from 'claude-code'

import type { ContextNotice, ModelHint } from '../types'
import {
  budgetWarning,
  computeLimit,
  contextStopReason,
  contextWarning,
  findWorkItem,
  formatEstimate,
  kilo,
  parseBudgetConfig,
  parseContextLimits,
  parseEstimate,
} from './core.mjs'

/**
 * The model recommendation bar of the work item that the first message names, drawn on all surfaces,
 * and the usage row, warnings and context stop for the surfaces that have no status line
 * (the desktop app and the VS Code panel). The terminal keeps the status line and the settings hooks
 * in .claude/hooks/, so the usage row, warnings and stop are off while a terminal draws the session.
 * The settings files stay in .claude/hooks/ and are read from there, so they remain the only source.
 */

const line = atom({ plugin: 'usage-band', key: 'line' } as const, '')
const notice = atom({ plugin: 'usage-band', key: 'contextNotice' } as const, { warned: false, handoff: false } as ContextNotice)

const hint = atom({ plugin: 'usage-band', key: 'modelHint' } as const, { checked: false, text: '', generation: 0 } as ModelHint)

type Figures = Pick<SessionMeasureInput, 'context' | 'rateLimits'>
type Config = { budget: ReturnType<typeof parseBudgetConfig>; context: ReturnType<typeof parseContextLimits> }

const HANDOFF_DELAY_MS = 100

/** `base64(':proxy-injected')`: the placeholder token of the cloud environment, whose network secret the proxy swaps for the real one. */
const PLACEHOLDER_TOKEN = 'OnByb3h5LWluamVjdGVk'

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

/** Fetches the work item's `Työmäärä` line and keeps its recommendation for the bar; any failure leaves the bar out. */
const fetchHint = async ($: EngineInterface, label: string, id: string, generation: number) => {
  try {
    const { projectUrl } = (await readJson($, '../../azure-devops.json')) as { projectUrl: string }
    const token = (await $.env.get('AZURE_DEVOPS_MCP')) || PLACEHOLDER_TOKEN
    const response = await $.http.fetch(`${projectUrl}/_apis/wit/workitems/${id}?fields=System.Description&api-version=7.1`, {
      headers: { Authorization: `Basic ${token}` },
    })
    if (response.status !== 200) return
    const html = (JSON.parse(response.text) as { fields?: Record<string, string> }).fields?.['System.Description']
    const estimate = html ? parseEstimate(html) : null
    if (estimate) await update($, hint, s => (s.generation === generation ? { ...s, text: formatEstimate(label, estimate) } : s))
  } catch {
    return
  }
}

/**
 * Looks up the work item that the first message of a chat names, once per chat (a failed lookup is not retried).
 * The lookup runs from a timer, so the message is never held back.
 */
const startHint = async ($: EngineInterface, text: string) => {
  try {
    const { checked, generation } = await read($, hint)
    if (checked) return
    await update($, hint, s => ({ ...s, checked: true, text: '' }))
    const item = findWorkItem(text)
    if (!item) return
    $.clock.after(0, () => {
      fetchHint($, item.label, item.id, generation).catch(() => undefined)
    })
  } catch {
    return
  }
}

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

/**
 * `Viikko 22 % / 14 % · 5 h 64 % (nollautuu 00:30) · Konteksti 92k / 200k (46 %)`, leaving out what is not known.
 * The context is shown against stopTokens, the limit where the work moves to a new chat, not the model's window.
 */
export const formatLine = ({ context, rateLimits }: Figures, shares: number[], nowSeconds: number, stopTokens: number) => {
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
    parts.push(`Konteksti ${kilo(context.tokens)} / ${kilo(stopTokens)} (${Math.floor((context.tokens / stopTokens) * 100)} %)`)
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
    await update($, line, () => formatLine(usage, config.budget.shares, nowSeconds, config.context.stopTokens))
    await update($, hint, s => ({ checked: false, text: '', generation: s.generation + 1 }))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const config = await loadConfig($)
    const nowSeconds = (await $.clock.now()) / 1000
    await update($, line, () => formatLine(e, config.budget.shares, nowSeconds, config.context.stopTokens))
    if (await isAppOnly($)) {
      await warnBudget($, e, config, nowSeconds)
      await warnContext($, e.context.tokens, config)
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || e.text.trimStart().startsWith('/')) return next(e)
    if (!(await isAppOnly($))) {
      await startHint($, e.text)
      return next(e)
    }
    const config = await loadConfig($)
    const { tokens } = (await $.session.usage()).context
    if (tokens === undefined || tokens < config.context.stopTokens) {
      await startHint($, e.text)
      return next(e)
    }
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
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const usage = e.surface === 'terminal' ? '' : await read($, line)
    const { text: recommendation } = await read($, hint)
    if (usage === '' && recommendation === '') return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {recommendation !== '' && <Text dimColor>{recommendation}</Text>}
        {usage !== '' && <Text dimColor>{usage}</Text>}
      </Box>
    )
  })
}
