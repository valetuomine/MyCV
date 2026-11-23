import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderSurface, SessionUsage } from 'claude-code'

import { budgetWarning, computeLimit } from '../hooks/core.mjs'
import { formatLine } from '../hooks/register'

const DAY = 86400
/** Monday 2026-11-16 12:00 UTC: the same weekday in every time zone from UTC-11 to UTC+11. */
const MONDAY_NOON = Date.UTC(2026, 10, 16, 12) / 1000
/** Sunday 0 to Saturday 6. */
const SHARES = [10, 20, 12, 14, 16, 8, 20]

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const

/** A prompt the person typed at the composer. */
const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

const NOW_MS = (MONDAY_NOON + 2 * DAY + 3600) * 1000
const WEEK_RESETS = new Date((MONDAY_NOON + 7 * DAY) * 1000).toISOString()
const FIVE_RESETS = new Date(NOW_MS + 2 * 3600 * 1000).toISOString()

/** Stands for the engine: surfaces, usage, settings files, toasts and the commands run. */
const engine = async (on: On, surfaces: RenderSurface[], tokens: number, weekPercent = 22) => {
  const toasts: string[] = []
  const commands: string[] = []
  const clock = mock.clock(on)
  await clock.set(NOW_MS)
  mock.store(on)
  const usage: SessionUsage = {
    startedAt: NOW_MS,
    context: { tokens, window: 1_000_000, percent: Math.round(tokens / 10_000) },
    rateLimits: [
      { kind: 'seven_day', percentUsed: weekPercent, resetsAt: WEEK_RESETS },
      { kind: 'five_hour', percentUsed: 64, resetsAt: FIVE_RESETS },
    ],
  } as SessionUsage
  on('session.surfaces', () => ({ value: surfaces }))
  on('session.usage', () => ({ value: usage }))
  on('fs.read', () => ({ value: 'no settings files in a test: the defaults apply' }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('command.run', (_, e) => {
    commands.push(e.command)
    return { text: '' }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  return { toasts, commands, usage, clock }
}

describe('the cumulative daily limit', () => {
  test('rises by each weekday share from the start of the week', () => {
    const resetsAt = MONDAY_NOON + 7 * DAY
    const expected = [20, 32, 46, 62, 70, 90, 100]
    expected.forEach((limit, day) => {
      expect(computeLimit(resetsAt, MONDAY_NOON + day * DAY + 60, SHARES)).toEqual({ dayIndex: day, limit })
    })
  })

  test('starts over at the first share when the week resets', () => {
    const firstWeekEnd = MONDAY_NOON + 7 * DAY
    expect(computeLimit(firstWeekEnd, firstWeekEnd - 60, SHARES).limit).toBe(100)
    expect(computeLimit(firstWeekEnd + 7 * DAY, firstWeekEnd + 60, SHARES)).toEqual({ dayIndex: 0, limit: 20 })
  })

  test('keeps an unused day for the following days', () => {
    const resetsAt = MONDAY_NOON + 7 * DAY
    const config = { shares: SHARES, margin: 3 }
    expect(budgetWarning(0, resetsAt, MONDAY_NOON + 2 * DAY + 60, config)).toBeNull()
    expect(budgetWarning(44, resetsAt, MONDAY_NOON + 2 * DAY + 60, config)?.level).toBe('near')
    expect(budgetWarning(46, resetsAt, MONDAY_NOON + 2 * DAY + 60, config)?.level).toBe('over')
  })
})

describe('the usage row', () => {
  test('is drawn on desktop with the day limit, and left to the status line on the terminal', async ($, on) => {
    await engine(on, ['desktop'], 92_000)
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

    const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const row = await desktop.find({ type: 'Text', text: /Viikko/ })
    expect(row?.text).toMatch(/^Viikko 22 % \/ 42 % · 5 h 64 % \(nollautuu \d\d:\d\d\) · Konteksti 92k \/ 200k \(46 %\)$/)
    await desktop.unmount()

    const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await terminal.find({ type: 'Text', text: /Viikko/ })).toBeUndefined()
    await terminal.unmount()
  })
})

describe('the context part of the row', () => {
  const contextRow = (tokens: number, stopTokens: number) =>
    formatLine({ context: { tokens, window: 1_000_000, percent: 1 }, rateLimits: [] }, SHARES, 0, stopTokens)

  test('is measured against the configured stop limit', () => {
    expect(contextRow(92_000, 100_000)).toBe('Konteksti 92k / 100k (92 %)')
  })

  test('reaches 100 % only at the stop limit and goes over it', () => {
    expect(contextRow(199_600, 200_000)).toBe('Konteksti 200k / 200k (99 %)')
    expect(contextRow(200_000, 200_000)).toBe('Konteksti 200k / 200k (100 %)')
    expect(contextRow(210_000, 200_000)).toBe('Konteksti 210k / 200k (105 %)')
  })
})

describe('the weekly budget', () => {
  /** The default share is 14 % a day, so on the third day of the week the limit is 42 % and the margin 3 %. */
  const measureWeek = ($: Engine, percentUsed: number) =>
    $.session.measure({
      context: { tokens: 92_000, window: 1_000_000, percent: 9 },
      rateLimits: [{ kind: 'seven_day', percentUsed, resetsAt: WEEK_RESETS }],
      changed: ['rateLimits'],
    })

  test('warns once on desktop near the day limit, and once more over it', async ($, on) => {
    const desktop = await engine(on, ['desktop'], 92_000, 40)
    await measureWeek($, 40)
    await measureWeek($, 40)
    expect(desktop.toasts).toEqual([expect.stringContaining('tämän päivän raja 42 % lähestyy')])
    await measureWeek($, 43)
    await measureWeek($, 43)
    expect(desktop.toasts).toEqual([
      expect.stringContaining('tämän päivän raja 42 % lähestyy'),
      expect.stringContaining('käyttö 43 % saavuttaa tai ylittää tämän päivän rajan 42 %'),
    ])
  })
})

describe('the context budget', () => {
  test('warns once on desktop over warnTokens', async ($, on) => {
    const desktop = await engine(on, ['desktop'], 160_000)
    const figures = { context: desktop.usage.context, rateLimits: [], changed: ['context' as const] }
    await $.session.measure(figures)
    await $.session.measure(figures)
    expect(desktop.toasts).toEqual([expect.stringContaining('Konteksti on 160k tokenia')])
  })

  test('stays quiet on the terminal', async ($, on) => {
    const terminal = await engine(on, ['terminal'], 260_000)
    await $.session.measure({ context: terminal.usage.context, rateLimits: [], changed: ['context'] })
    expect(await $.prompt.submit(typed('jatka'))).toEqual({ text: 'jatka' })
    expect(terminal.toasts).toEqual([])
  })

  test('stays quiet while no surface draws the session', async ($, on) => {
    const headless = await engine(on, [], 260_000, 90)
    await $.session.measure({ context: headless.usage.context, rateLimits: headless.usage.rateLimits, changed: ['context'] })
    expect(await $.prompt.submit(typed('jatka'))).toEqual({ text: 'jatka' })
    await headless.clock.advance(200)
    expect(headless.toasts).toEqual([])
    expect(headless.commands).toEqual([])
  })

  test('drops a message over stopTokens on desktop and starts /handoff once', async ($, on) => {
    const desktop = await engine(on, ['desktop'], 210_000)
    const first = await $.prompt.submit(typed('jatka'))
    expect(first).toEqual({ drop: expect.stringContaining('Konteksti on 210k tokenia (raja 200k)') })
    await $.prompt.submit(typed('jatka vielä'))
    await desktop.clock.advance(200)
    expect(desktop.commands).toEqual(['handoff'])
    expect(await $.prompt.submit(typed('/compact'))).toEqual({ text: '/compact' })
  })
})
