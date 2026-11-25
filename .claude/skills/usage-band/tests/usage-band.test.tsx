import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderSurface, SessionUsage } from 'claude-code'

import { budgetWarning, computeLimit, findWorkItem, formatEstimate, parseEstimate } from '../hooks/core.mjs'
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
  on('fs.read', (_, e) => ({
    value: e.path.endsWith('azure-devops.json')
      ? '{"projectUrl":"https://ado.test/proj"}'
      : 'no settings files in a test: the defaults apply',
  }))
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

describe('the model hint', () => {
  const DESCRIPTION =
    '<div><b>Työmäärä:</b> M, noin 5–12 milj. tokenia, malli Sonnet, effort-taso medium. Syy.</div>'

  test('finds the earliest work item in every spelling', () => {
    expect(findWorkItem('Implement User Story 212: x. Branch feat/US-212_x')).toEqual({ label: 'US-212', id: '212' })
    expect(findWorkItem('Jatka Task 50')).toEqual({ label: 'Task-50', id: '50' })
    expect(findWorkItem('Task-50 ja US-47')).toEqual({ label: 'Task-50', id: '50' })
    expect(findWorkItem('US-47')).toEqual({ label: 'US-47', id: '47' })
    expect(findWorkItem('Branch: feat/US-212_Skillit')).toEqual({ label: 'US-212', id: '212' })
    expect(findWorkItem('ei mitään, Taskista 5')).toBeNull()
  })

  test('reads the Työmäärä line, with or without an effort level', () => {
    expect(parseEstimate(DESCRIPTION)).toEqual({ size: 'M', model: 'Sonnet', effort: 'medium' })
    expect(parseEstimate('<b>Työmäärä:</b> XL, malli Opus')).toEqual({ size: 'XL', model: 'Opus', effort: undefined })
    expect(parseEstimate('<b>Työmäärä:</b> hmm')).toBeNull()
    expect(parseEstimate('ei riviä')).toBeNull()
  })

  test('formats the bar text', () => {
    expect(formatEstimate('US-47', { size: 'M', model: 'Sonnet', effort: 'medium' })).toBe('US-47 · M · Sonnet, medium')
    expect(formatEstimate('Task-5', { size: 'S', model: 'Opus', effort: undefined })).toBe('Task-5 · S · Opus')
  })

  /** Serves the project file, the token and the work item description. */
  const hintEngine = async (
    on: On,
    surfaces: RenderSurface[],
    status = 200,
    { token = 'dG9rZW4=', description = DESCRIPTION }: { token?: string; description?: string } = {},
  ) => {
    const base = await engine(on, surfaces, 50_000)
    const urls: string[] = []
    const auth: (string | undefined)[] = []
    on('env.get', (_, e) => ({ value: e.name === 'AZURE_DEVOPS_MCP' ? token : undefined }))
    on('http.fetch', (_, e) => {
      urls.push(e.url)
      auth.push(e.init?.headers?.Authorization)
      return {
        value: {
          status,
          ok: status === 200,
          headers: {},
          text: JSON.stringify({ fields: { 'System.Description': description } }),
        },
      }
    })
    return { ...base, urls, auth }
  }

  const barText = async ($: Engine, surface: RenderSurface) => {
    const view = await $.ui.mount({ ...BAND, surface })
    const bar = await view.find({ type: 'Text', text: /^(US|Task)-\d+ · / })
    const text = bar?.text
    await view.unmount()
    return text
  }

  test('shows the bar on desktop and on the terminal after the first message, without holding it', async ($, on) => {
    const h = await hintEngine(on, ['desktop'])
    expect(await $.prompt.submit(typed('Implement User Story 212: Skillit'))).toEqual({
      text: 'Implement User Story 212: Skillit',
    })
    await h.clock.advance(10)
    expect(h.urls).toEqual(['https://ado.test/proj/_apis/wit/workitems/212?fields=System.Description&api-version=7.1'])
    expect(h.auth).toEqual(['Basic dG9rZW4='])
    expect(await barText($, 'desktop')).toBe('US-212 · M · Sonnet, medium')
    expect(await barText($, 'terminal')).toBe('US-212 · M · Sonnet, medium')
  })

  for (const surfaces of [['terminal'], []] as RenderSurface[][]) {
    test(`looks the work item up and shows the bar with the surfaces [${surfaces}] too`, async ($, on) => {
      const h = await hintEngine(on, surfaces)
      expect(await $.prompt.submit(typed('Implement User Story 212'))).toEqual({ text: 'Implement User Story 212' })
      await h.clock.advance(10)
      expect(h.urls).toHaveLength(1)
      expect(await barText($, 'terminal')).toBe('US-212 · M · Sonnet, medium')
    })
  }

  test('sends the cloud placeholder token when AZURE_DEVOPS_MCP is not set', async ($, on) => {
    const h = await hintEngine(on, ['desktop'], 200, { token: '' })
    await $.prompt.submit(typed('US-47'))
    await h.clock.advance(10)
    expect(h.auth).toEqual(['Basic OnByb3h5LWluamVjdGVk'])
  })

  test('leaves the bar out when the description has no Työmäärä line', async ($, on) => {
    const h = await hintEngine(on, ['desktop'], 200, { description: '<div>Ei työmäärää</div>' })
    await $.prompt.submit(typed('US-47'))
    await h.clock.advance(10)
    expect(h.urls).toHaveLength(1)
    expect(await barText($, 'desktop')).toBeUndefined()
  })

  test('ignores the result of a lookup that started in the previous session', async ($, on) => {
    const h = await hintEngine(on, ['desktop'])
    await $.prompt.submit(typed('US-47'))
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    await h.clock.advance(10)
    expect(await barText($, 'desktop')).toBeUndefined()
  })

  test('looks only at the first message and skips commands', async ($, on) => {
    const h = await hintEngine(on, ['desktop'])
    await $.prompt.submit(typed('/compact US-1'))
    await $.prompt.submit(typed('jatketaan'))
    await $.prompt.submit(typed('US-47 myöhemmin'))
    await h.clock.advance(10)
    expect(h.urls).toEqual([])
    expect(await barText($, 'desktop')).toBeUndefined()
  })

  test('does not use up the lookup on a dropped first message, and starts over with a new session', async ($, on) => {
    const h = await hintEngine(on, ['desktop'])
    h.usage.context.tokens = 210_000
    expect(await $.prompt.submit(typed('Jatka US-47'))).toEqual({ drop: expect.stringContaining('Konteksti') })
    h.usage.context.tokens = 50_000
    await $.prompt.submit(typed('Jatka US-47'))
    await h.clock.advance(10)
    expect(h.urls).toHaveLength(1)
    expect(await barText($, 'desktop')).toBe('US-47 · M · Sonnet, medium')
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    expect(await barText($, 'desktop')).toBeUndefined()
    await $.prompt.submit(typed('User Story 212'))
    await h.clock.advance(10)
    expect(h.urls).toHaveLength(2)
  })

  test('leaves the bar out when Azure DevOps does not answer', async ($, on) => {
    const h = await hintEngine(on, ['desktop'], 401)
    expect(await $.prompt.submit(typed('Task 50'))).toEqual({ text: 'Task 50' })
    await h.clock.advance(10)
    expect(h.urls).toHaveLength(1)
    expect(await barText($, 'desktop')).toBeUndefined()
  })
})
