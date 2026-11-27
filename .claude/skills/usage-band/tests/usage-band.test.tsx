import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderSurface, SessionUsage } from 'claude-code'

import {
  budgetWarning,
  coldSessionWarning,
  computeLimit,
  checkGitOperation,
  findGitOperations,
  isAzureUrl,
  operationDirectory,
  findWorkItem,
  formatEstimate,
  parseColdConfig,
  parseEstimate,
  syncStatus,
} from '../hooks/core.mjs'
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
const engine = async (
  on: On,
  surfaces: RenderSurface[],
  tokens: number,
  weekPercent = 22,
  files: Record<string, string> = {},
  failCommands = false,
) => {
  const toasts: string[] = []
  const commands: string[] = []
  const prompts: string[] = []
  const transcript: { mtimeMs?: number } = {}
  on('session.info', () => ({ value: { transcriptPath: '/t.jsonl' } as never }))
  on('fs.stat', () => {
    if (transcript.mtimeMs === undefined) throw new Error('no transcript')
    return { value: { kind: 'file', size: 1, mtimeMs: transcript.mtimeMs, isLink: false } as never }
  })
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
  on('fs.read', (_, e) => {
    const path = e.path.replace(/^[A-Za-z]:/, '').replaceAll('\\', '/')
    if (path in files) return { value: files[path]! }
    if (Object.keys(files).length > 0) throw new Error('missing')
    return {
    value: e.path.endsWith('azure-devops.json')
      ? '{"projectUrl":"https://ado.test/proj"}'
      : 'no settings files in a test: the defaults apply',
    }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  on('command.run', (_, e) => {
    if (failCommands) throw new Error('unknown command')
    commands.push(e.command)
    return { text: '' }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.start', () => ({ turnId: 't' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  return { toasts, commands, prompts, usage, clock, transcript }
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
    expect(parseEstimate('<b>Työmäärä:</b> XS, alle 2 milj. tokenia, malli Haiku, effort-taso low.')).toEqual({
      size: 'XS',
      model: 'Haiku',
      effort: 'low',
    })
    expect(parseEstimate('<b>Työmäärä:</b> XS, malli Gemini')).toBeNull()
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

  test('puts a Vaihda malli button beside the bar that runs the model picker', async ($, on) => {
    const h = await hintEngine(on, ['desktop'])
    await $.prompt.submit(typed('Implement User Story 212'))
    await h.clock.advance(10)
    const view = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const button = await view.find({ type: 'Button', key: 'switch-model' })
    if (!button) throw new Error('The Vaihda malli button was not drawn')
    await view.press({ ...button, key: 'switch-model' })
    expect(h.commands).toEqual(['model'])
    await view.unmount()
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

describe('the cold session warning', () => {
  const HOUR_MS = 3600 * 1000
  const COLD = { coldAfterSeconds: 3600 }

  test('reads the limit from the settings and falls back to one hour', () => {
    expect(parseColdConfig({ coldAfterSeconds: 1800 })).toEqual({ coldAfterSeconds: 1800 })
    for (const bad of [undefined, null, {}, { coldAfterSeconds: 0 }, { coldAfterSeconds: 'x' }, 'x']) {
      expect(parseColdConfig(bad)).toEqual(COLD)
    }
  })

  test('warns only when the idle time is over the limit', () => {
    expect(coldSessionWarning(NOW_MS - HOUR_MS, NOW_MS, 90_000, COLD)).toBeNull()
    expect(coldSessionWarning(NOW_MS - 10 * 60000, NOW_MS, 90_000, COLD)).toBeNull()
    expect(coldSessionWarning(0, NOW_MS, 90_000, COLD)).toBeNull()
    expect(coldSessionWarning(undefined, NOW_MS, 90_000, COLD)).toBeNull()
    const text = coldSessionWarning(NOW_MS - HOUR_MS - 60000, NOW_MS, 90_000, COLD)
    expect(text).toContain('61 min')
    expect(text).toContain('90k')
    expect(text).toContain('/handoff')
    expect(coldSessionWarning(NOW_MS - 3 * HOUR_MS, NOW_MS, undefined, COLD)).toContain('3 h')
  })

  const turnDone = ($: Engine, agentId?: string) =>
    $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', agentId } as never)

  for (const surfaces of [['desktop'], ['terminal']] as RenderSurface[][]) {
    test(`warns after over an hour idle and still lets the message through on ${surfaces}`, async ($, on) => {
      const h = await engine(on, surfaces, 90_000)
      await turnDone($)
      await h.clock.advance(HOUR_MS + 60000)
      expect(await $.prompt.submit(typed('jatketaan'))).toEqual({ text: 'jatketaan' })
      expect(h.toasts).toHaveLength(1)
      expect(h.toasts[0]).toContain('kylmä')
      await turnDone($)
      await $.prompt.submit(typed('vielä'))
      expect(h.toasts).toHaveLength(1)
    })
  }

  const turnStarted = ($: Engine, agentId?: string) => $.turn.start({ turnId: 't', agentId } as never)

  test('does not warn under an hour, for commands or before any turn', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    await $.prompt.submit(typed('ensimmäinen'))
    await turnDone($)
    await h.clock.advance(30 * 60000)
    await $.prompt.submit(typed('toinen'))
    await h.clock.advance(HOUR_MS)
    await $.prompt.submit(typed('/compact'))
    expect(h.toasts).toHaveLength(0)
  })

  test('uses the transcript time in a session resumed after a restart, which has run no turn yet', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    h.transcript.mtimeMs = NOW_MS - 3 * HOUR_MS
    await $.prompt.submit(typed('jatketaan eilisestä'))
    expect(h.toasts).toHaveLength(1)
    expect(h.toasts[0]).toContain('3 h')
  })

  test('a stored turn time wins over an old transcript time', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    await turnDone($)
    h.transcript.mtimeMs = NOW_MS - 3 * HOUR_MS
    await $.prompt.submit(typed('juuri ajettu vuoro'))
    expect(h.toasts).toHaveLength(0)
  })

  test('stays quiet when the transcript is missing or recent', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    await $.prompt.submit(typed('ensimmäinen'))
    h.transcript.mtimeMs = NOW_MS - 60000
    await $.prompt.submit(typed('toinen'))
    expect(h.toasts).toHaveLength(0)
  })

  test('a subagent turn does not reset the clock', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    await turnDone($)
    await h.clock.advance(HOUR_MS + 60000)
    await turnStarted($, 'agent-1')
    await turnDone($, 'agent-1')
    await $.prompt.submit(typed('jatketaan'))
    expect(h.toasts).toHaveLength(1)
  })

  test('does not warn while a turn is running, however long it has run', async ($, on) => {
    const h = await engine(on, ['desktop'], 90_000)
    await turnStarted($)
    await h.clock.advance(2 * HOUR_MS)
    await $.prompt.submit(typed('ohjataan kesken ajon'))
    expect(h.toasts).toHaveLength(0)
    await turnDone($)
    await h.clock.advance(HOUR_MS + 60000)
    await $.prompt.submit(typed('tauon jälkeen'))
    expect(h.toasts).toHaveLength(1)
  })

  test('is not shown for a message that the context stop drops', async ($, on) => {
    const h = await engine(on, ['desktop'], 210_000)
    await turnDone($)
    await h.clock.advance(HOUR_MS + 60000)
    expect(await $.prompt.submit(typed('jatketaan'))).toEqual({ drop: expect.stringContaining('Konteksti') })
    expect(h.toasts.filter(t => t.includes('kylmä'))).toHaveLength(0)
  })

  test('is shown once with a context warning that has already been given', async ($, on) => {
    const h = await engine(on, ['desktop'], 160_000)
    await $.session.measure({ context: h.usage.context, rateLimits: h.usage.rateLimits, changed: [] } as never)
    const before = h.toasts.length
    await turnDone($)
    await h.clock.advance(HOUR_MS + 60000)
    await $.prompt.submit(typed('jatketaan'))
    expect(h.toasts.slice(before)).toHaveLength(1)
    expect(h.toasts[before]).toContain('kylmä')
  })
})

describe('the Never guard detection', () => {
  const reason = (command: string, context: { branch?: string; originIsPublic?: boolean } = {}) =>
    findGitOperations(command)
      .map(operation => checkGitOperation(operation, context))
      .find(Boolean) ?? null

  test('lets feature branch pushes to azure and to a local origin through', () => {
    expect(reason('git push -u origin feat/US-213_Moodit')).toBeNull()
    expect(reason('git push -u azure feat/US-213_Moodit')).toBeNull()
    expect(reason('git push', { branch: 'feat/x' })).toBeNull()
    expect(reason('git push origin HEAD', { branch: 'feat/x' })).toBeNull()
    expect(reason('git commit -m "git push origin main"', { branch: 'feat/x' })).toBeNull()
    expect(reason('git add src/a.ts && git status')).toBeNull()
  })

  test('blocks pushes to main in every form', () => {
    for (const command of [
      'git push origin main',
      'git push azure HEAD:main',
      'git push azure +feat/x:refs/heads/main',
      'git push azure :main',
      'git push azure --delete main',
      'git push azure --mirror',
      'git push azure refs/heads/*:refs/heads/*',
      'git status && git push azure main',
      'FOO=1 sudo git -C src push azure main',
      'bash -c "git push azure main"',
    ]) {
      expect(reason(command)).toContain('never push to main')
    }
    expect(reason('git push', { branch: 'main' })).toContain('never push to main')
    expect(reason('git push azure HEAD', { branch: 'main' })).toContain('never push to main')
  })

  test('blocks pushes to GitHub, other remotes, and origin when it is public', () => {
    expect(reason('git push github feat/x')).toContain('Azure DevOps')
    expect(reason('git push https://github.com/a/b.git feat/x')).toContain('Azure DevOps')
    expect(reason('git push origin feat/x', { originIsPublic: true })).toContain('Azure DevOps')
    expect(reason('git push azure feat/x', { originIsPublic: true })).toBeNull()
  })

  test('blocks commits on main and adding the secret files', () => {
    expect(reason('cd src && git commit -m x', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git commit -m x', { branch: 'feat/x' })).toBeNull()
    expect(reason('git add .env.local')).toContain('.env.local')
    expect(reason('git add -f -- src/.mcp.json')).toContain('.mcp.json')
  })
})

describe('the Never guard parser', () => {
  const reason = (
    command: string,
    context: { branch?: string; originIsPublic?: boolean; azureIsPublic?: boolean } = {},
    tool = 'Bash',
  ) =>
    findGitOperations(command, tool)
      .map(operation => checkGitOperation(operation, context))
      .find(Boolean) ?? null

  test('reads wrapped command strings and prefixes', () => {
    for (const command of [
      'bash -xc "git push azure main"',
      'eval git push azure main',
      'timeout 5 git push azure main',
      'xargs -n 1 git push azure main',
      'wsl -d Ubuntu git push azure main',
      'sudo -u bob git push azure main',
    ]) {
      expect(reason(command)).toContain('never push to main')
    }
    for (const command of ['pwsh -Command git push azure main', 'powershell -NoProfile -c "git push azure main"', 'cmd /c git push azure main']) {
      expect(reason(command, {}, 'PowerShell')).toContain('never push to main')
    }
    expect(reason('iex "git push github x"', {}, 'PowerShell')).toContain('Azure DevOps')
    expect(reason('Invoke-Expression "git add .env.local"', {}, 'PowerShell')).toContain('.env.local')
  })

  test('does not read -c of other commands as a command string', () => {
    expect(reason('grep -c "git push azure main" notes.txt')).toBeNull()
    expect(reason('echo "git push github x"')).toBeNull()
  })

  test('follows a branch switch in the same command', () => {
    expect(reason('git switch -c feat/x && git commit -m a', { branch: 'main' })).toBeNull()
    expect(reason('git checkout -b feat/x && git commit -m a', { branch: 'main' })).toBeNull()
    expect(reason('git checkout main && git commit -m a', { branch: 'feat/x' })).toContain('commit directly to main')
    expect(reason('git switch main; git push', { branch: 'feat/x' })).toContain('never push to main')
    expect(reason('git checkout -- src/a.ts && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout . && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout src/app.ts && git commit -am fix', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout --ours a.txt && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout -p feat/x && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout --track origin/main && git commit -m a', { branch: 'feat/x' })).toContain('commit directly to main')
    expect(reason('git switch feat/x && git commit -m a', { branch: 'main' })).toBeNull()
  })

  test('counts a switch only when && joins it to the operation', () => {
    expect(reason('git switch -c feat/x; git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git switch -c feat/x || git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git switch -c feat/x\ngit commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git switch -c feat/x &&\n git commit -m a', { branch: 'main' })).toBeNull()
    expect(reason('git switch -c feat/x; git commit -m a', { branch: 'feat/y' })).toBeNull()
  })

  test('does not trust a switch that an earlier || or | may have skipped', () => {
    expect(reason('true || git switch -c f && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('false | git switch -c f && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('true || git switch -c f && git commit -m a', { branch: 'feat/y' })).toBeNull()
  })

  test('checks the checked-out branch when the switch target is unknown', () => {
    expect(reason('git checkout - && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout - && git commit -m a', { branch: 'feat/x' })).toBeNull()
    expect(reason('git checkout -t origin/main && git commit -m a', { branch: 'feat/x' })).toContain('commit directly to main')
    expect(reason('git checkout -t origin/feat/x && git commit -m a', { branch: 'main' })).toContain('commit directly to main')
    expect(reason('git checkout -t origin/feat/x && git commit -m a', { branch: 'feat/y' })).toBeNull()
  })

  test('reads a Bash here-string that a shell runs', () => {
    expect(reason('bash <<< "git push github x"')).toContain('Azure DevOps')
    expect(reason('bash -s <<<"git push github x"')).toContain('Azure DevOps')
    expect(reason('bash <<< "git push azure feat/x"')).toBeNull()
    expect(reason('cat <<< "git push github x"')).toBeNull()
  })

  test('skips the values of env options', () => {
    expect(reason('env -C sub git push github x')).toContain('Azure DevOps')
    expect(reason('env --unset FOO git push github x')).toContain('Azure DevOps')
    expect(reason('env --chdir sub git push github x')).toContain('Azure DevOps')
    expect(reason('env --chdir sub git push azure feat/x')).toBeNull()
  })

  test('reads escaped backslashes, env options and shell-read blocks', () => {
    expect(reason('echo "a\\\\" ; git push github x')).toContain('Azure DevOps')
    expect(reason('env -i git push github x')).toContain('Azure DevOps')
    expect(reason('env -u FOO git push github x')).toContain('Azure DevOps')
    expect(reason('env FOO=1 git push azure feat/x')).toBeNull()
    expect(reason("bash <<'EOF'\ngit push github x\nEOF\n")).toContain('Azure DevOps')
    expect(reason("cat <<'EOF' | bash\ngit push github x\nEOF\n")).toContain('Azure DevOps')
    expect(reason('iex @"\ngit push github x\n"@', {}, 'PowerShell')).toContain('Azure DevOps')
    expect(reason("@'\ngit push github x\n'@ | pwsh -Command -", {}, 'PowerShell')).toContain('Azure DevOps')
    expect(reason("cat <<'EOF'\ngit push github x\nEOF\n")).toBeNull()
  })

  test('skips here-strings and heredocs and reads escapes', () => {
    expect(reason("$m = @'\ngit push github x\n'@\ngit status", {}, 'PowerShell')).toBeNull()
    expect(reason("git commit -F - <<'EOF'\ngit push github x\nEOF\n", { branch: 'feat/x' })).toBeNull()
    expect(reason("git commit -m \"$(cat <<'EOF'\ngit push github x\nEOF\n)\"", { branch: 'feat/x' })).toBeNull()
    expect(reason('git push `\ngithub x', {}, 'PowerShell')).toContain('Azure DevOps')
    expect(reason('git push \\\ngithub x')).toContain('Azure DevOps')
    expect(reason('echo "say \\"hi\\"" && git push github x')).toContain('Azure DevOps')
    expect(reason("echo 'it''s' ; git push github x", {}, 'PowerShell')).toContain('Azure DevOps')
  })

  test('resolves directories, refs and commit message values', () => {
    expect(operationDirectory('C:/repo', ['/c/other', 'sub'])).toBe('C:/other/sub')
    expect(operationDirectory('/repo', ['sub'])).toBe('/repo/sub')
    expect(findGitOperations('Set-Location -Path src; git commit -m x', 'PowerShell')[0]?.dirs).toEqual(['src'])
    expect(findGitOperations('cd -P src && git commit -m x')[0]?.dirs).toEqual(['src'])
    expect(reason('git push azure @:main')).toContain('never push to main')
    expect(reason('git push azure HEAD:refs/heads/Main')).toContain('never push to main')
    expect(reason('git push azure heads/main')).toContain('never push to main')
    expect(reason('git push azure @', { branch: 'main' })).toContain('never push to main')
    expect(reason('git commit -m x', { branch: 'MAIN' })).toContain('commit directly to main')
    expect(reason('git push --repo azure main')).toContain('never push to main')
    expect(reason('git commit -m .env.local')).toBeNull()
    expect(reason('git commit -am .mcp.json')).toBeNull()
    expect(reason('git commit --message=.mcp.json -F .env.local')).toBeNull()
    expect(reason('git commit .env.local -m x')).toContain('.env.local')
    expect(reason('git add -f .ENV.LOCAL')).toContain('.env.local')
  })

  test('checks the host of a remote URL', () => {
    for (const url of ['https://user@dev.azure.com/o/p/_git/r', 'git@ssh.dev.azure.com:v3/o/p/r', 'https://o.visualstudio.com/p/_git/r']) {
      expect(isAzureUrl(url)).toBe(true)
      expect(reason(`git push ${url} feat/x`)).toBeNull()
    }
    for (const url of ['https://github.com/o/dev.azure.com', 'https://dev.azure.com.evil.test/o', 'git@github.com:o/r.git']) {
      expect(isAzureUrl(url)).toBe(false)
      expect(reason(`git push ${url} feat/x`)).toContain('Azure DevOps')
    }
    expect(reason('git push azure feat/x', { azureIsPublic: true })).toContain('Azure DevOps')
  })
})

describe('the Never guard as a tool.call hook', () => {
  test('denies a forbidden command and lets others reach the tool', async ($, on) => {
    await engine(on, ['desktop'], 1000)
    on('env.get', () => ({ value: undefined }))
    on('session.cwd', () => ({ value: '/repo' }))
    on('tool.call', () => ({ result: 'ran' as never }))
    const denied = await $.tool.call({ tool: 'Bash', command: 'git push azure main' })
    expect(denied.deny).toContain('never push to main')
    const allowed = await $.tool.call({ tool: 'Bash', command: 'git push -u azure feat/US-213_x' })
    expect(allowed.deny).toBeUndefined()
    const other = await $.tool.call({ tool: 'Bash', command: 'git status' })
    expect(other.deny).toBeUndefined()
  })

  test('reads the branch from .git/HEAD and from a worktree gitdir file', async ($, on) => {
    await engine(on, ['desktop'], 1000, 22, {
      '/repo/.git/HEAD': 'ref: refs/heads/main\n',
      '/wt/.git': 'gitdir: /repo/.git/worktrees/wt\n',
      '/repo/.git/worktrees/wt/HEAD': 'ref: refs/heads/main\n',
      '/feat/.git/HEAD': 'ref: refs/heads/feat/x\n',
    })
    on('env.get', () => ({ value: undefined }))
    on('session.cwd', () => ({ value: '/repo' }))
    on('tool.call', () => ({ result: 'ran' as never }))
    const run = async (command: string) => (await $.tool.call({ tool: 'Bash', command })).deny
    expect(await run('git commit -m x')).toContain('commit directly to main')
    expect(await run('git push')).toContain('never push to main')
    expect(await run('cd /wt && git commit -m x')).toContain('commit directly to main')
    expect(await run('git -C /feat commit -m x')).toBeUndefined()
    expect(await run('cd /feat && git commit -m x')).toBeUndefined()
    expect(await run('git switch -c feat/y && git commit -m x')).toBeUndefined()
  })
})

describe('the session toolbar buttons', () => {
  /** Serves `git` with the answers of `git` (by its first argument), records every argv, and starts the session. */
  const toolbarEngine = async (
    on: On,
    { remote = false, gitOk = true, counts = '0	0', fetchOk = true, failCommands = false, refuseProcess = false }: { remote?: boolean; gitOk?: boolean; counts?: string; fetchOk?: boolean; failCommands?: boolean; refuseProcess?: boolean } = {},
  ) => {
    const base = await engine(on, ['desktop'], 50_000, 22, gitOk ? {} : { '/elsewhere': 'x' }, failCommands)
    const argvs: string[][] = []
    const envs: Record<string, string>[] = []
    on('env.get', (_, e) => ({ value: e.name === 'CLAUDE_CODE_REMOTE' && remote ? 'true' : undefined }))
    on('process.run', (_, e) => {
      if (refuseProcess) throw new Error('process is CLI only')
      argvs.push([...e.argv])
      envs.push({ ...e.init?.env })
      const ok = { exitCode: 0, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
      const answers: Record<string, { exitCode: number; stdout: string }> = {
        fetch: { exitCode: fetchOk ? 0 : 1, stdout: '' },
        'rev-list': { exitCode: 0, stdout: `${counts}\n` },
        branch: { exitCode: 0, stdout: 'feat/x\n' },
      }
      return { value: { ...ok, ...answers[e.argv[1]!]! } as never }
    })
    return { ...base, argvs, envs }
  }
  const mountToolbar = async ($: Engine) => {
    await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
    return $.ui.mount({ ...BAND, surface: 'desktop' })
  }

  test('describes how the branch stands against origin/main', () => {
    expect(syncStatus(0, 0, 'feat/x')).toContain('ajan tasalla')
    expect(syncStatus(0, 3, 'feat/x')).toContain('3 commitin jäljessä')
    expect(syncStatus(0, 3, 'feat/x')).toContain('fast-forward')
    expect(syncStatus(2, 0, 'feat/x')).toContain('2 omaa committia')
    expect(syncStatus(2, 0, 'feat/x')).not.toContain('commitin jäljessä')
    expect(syncStatus(2, 3, '')).toContain('rebasen tai mergen')
    expect(syncStatus(0, 0, '')).toContain('Irrallinen HEAD')
  })

  test('draws both buttons in a git folder, also without a model hint', async ($, on) => {
    await toolbarEngine(on)
    const view = await mountToolbar($)
    expect(await view.find({ type: 'Button', key: 'clean-branches' })).toBeTruthy()
    expect(await view.find({ type: 'Button', key: 'check-origin' })).toBeTruthy()
    await view.unmount()
  })

  for (const [name, options] of [
    ['in a cloud session', { remote: true }],
    ['outside a git folder', { gitOk: false }],
  ] as const) {
    test(`hides both buttons ${name}`, async ($, on) => {
      await toolbarEngine(on, options)
      const view = await mountToolbar($)
      expect(await view.find({ type: 'Button', key: 'clean-branches' })).toBeFalsy()
      expect(await view.find({ type: 'Button', key: 'check-origin' })).toBeFalsy()
      await view.unmount()
    })
  }

  test('Siivoa haarat runs the clean-branches command and nothing else', async ($, on) => {
    const h = await toolbarEngine(on)
    const view = await mountToolbar($)
    const button = await view.find({ type: 'Button', key: 'clean-branches' })
    if (!button) throw new Error('The Siivoa haarat button was not drawn')
    await view.press({ ...button, key: 'clean-branches' })
    expect(h.commands).toEqual(['clean-branches'])
    expect(h.argvs).toEqual([])
    await view.unmount()
  })

  test('draws the buttons in a git folder even when process.run is refused', async ($, on) => {
    await toolbarEngine(on, { refuseProcess: true })
    const view = await mountToolbar($)
    expect(await view.find({ type: 'Button', key: 'clean-branches' })).toBeTruthy()
    expect(await view.find({ type: 'Button', key: 'check-origin' })).toBeTruthy()
    await view.unmount()
  })

  test('Tarkista origin/main reports a failure when process.run is refused', async ($, on) => {
    const h = await toolbarEngine(on, { refuseProcess: true })
    await pressCheck($)
    expect(h.toasts.at(-1)).toContain('epäonnistui')
  })

  test('Siivoa haarat asks for the skill in a prompt when the command cannot be run', async ($, on) => {
    const h = await toolbarEngine(on, { failCommands: true })
    const view = await mountToolbar($)
    const button = await view.find({ type: 'Button', key: 'clean-branches' })
    if (!button) throw new Error('The Siivoa haarat button was not drawn')
    await view.press({ ...button, key: 'clean-branches' })
    expect(h.commands).toEqual([])
    expect(h.prompts).toEqual(['Aja /clean-branches-skilli.'])
    await view.unmount()
  })

  const pressCheck = async ($: Engine) => {
    const view = await mountToolbar($)
    const button = await view.find({ type: 'Button', key: 'check-origin' })
    if (!button) throw new Error('The Tarkista origin/main button was not drawn')
    await view.press({ ...button, key: 'check-origin' })
    await view.unmount()
  }

  for (const [counts, expected] of [
    ['0	0', 'ajan tasalla'],
    ['0	4', '4 commitin jäljessä'],
    ['2	0', '2 omaa committia'],
  ] as const) {
    test(`Tarkista origin/main fetches and reports "${expected}" for ${JSON.stringify(counts)}`, async ($, on) => {
      const h = await toolbarEngine(on, { counts })
      await pressCheck($)
      expect(h.argvs.map(argv => argv.slice(1).join(' '))).toEqual([
        'fetch --quiet --prune origin',
        'rev-list --left-right --count HEAD...origin/main',
        'branch --show-current',
      ])
      expect(h.toasts).toHaveLength(2)
      expect(h.toasts[0]).toBe('Haetaan origin/mainia...')
      expect(h.toasts[1]).toContain(expected)
      expect(h.toasts[1]).toContain('feat/x')
      expect(h.envs.every(env => env.GIT_TERMINAL_PROMPT === '0' && env.GCM_INTERACTIVE === 'never')).toBe(true)
    })
  }

  test('Tarkista origin/main reports a failed fetch and changes nothing', async ($, on) => {
    const h = await toolbarEngine(on, { fetchOk: false })
    await pressCheck($)
    expect(h.toasts).toEqual(['Haetaan origin/mainia...', 'origin/mainin tarkistus epäonnistui: haku ei onnistunut tai origin/main puuttuu.'])
    expect(h.argvs.some(argv => ['merge', 'rebase', 'checkout', 'switch', 'reset', 'pull'].includes(argv[1]!))).toBe(false)
  })
})
