/**
 * Tests for extract.mjs and state.mjs with small invented transcript lines (never real history).
 * Run: node --test .claude/skills/improve-system/scripts/
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { after, before, describe, test } from 'node:test';

const temp = mkdtempSync(join(tmpdir(), 'improve-system-'));
process.env.IMPROVE_SYSTEM_DIR = join(temp, 'state');
delete process.env.CLAUDE_CODE_REMOTE;

const {
  activeMinutes,
  buildExcerpt,
  checkoutLabel,
  classify,
  isNeverGuardBlock,
  parseMax,
  pastedBlocks,
  repoPath,
  run,
  userText,
  workByBranch,
} = await import('./extract.mjs');
const { applyRun, emptyState, readState, reportPath, toTime, writeState } = await import('./state.mjs');

const user = (timestamp, content, extra = {}) => ({
  type: 'user',
  sessionId: extra.sessionId ?? 's1',
  timestamp,
  gitBranch: 'feat/US-1_Test',
  message: { role: 'user', content },
  ...extra,
});

const toolUse = (timestamp, id, name, input, sessionId = 's1') => ({
  type: 'assistant',
  sessionId,
  timestamp,
  message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
});

const toolResult = (timestamp, id, text, isError = false) => ({
  type: 'user',
  sessionId: 's1',
  timestamp,
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: isError }] },
});

const KICKOFF = `<pasted_content id="k">Act as a UI designer. Implement User Story 7: Tausta. ${'x '.repeat(80)}</pasted_content id="k">`;

const PASTE = `<pasted_content id="x1">${'Saman ohjeen pitkä teksti. '.repeat(10)}</pasted_content id="x1">`;

const writeTranscript = (folder, name, lines) => {
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, name), `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`);
};

const projects = join(temp, 'projects');
const repo = join(temp, 'repo');

before(() => {
  const main = join(projects, 'C--Users-dev-repos-MyCV');
  const worktree = join(projects, 'C--Users-dev-repos-MyCV--claude-worktrees-us-1-test-abc123');
  writeTranscript(main, 's1.jsonl', [
    { type: 'custom-title', customTitle: 'Taustan korjaus', sessionId: 's1' },
    user('2026-11-01T10:00:00.000Z', 'Implement User Story 1: Tausta. Read the work item.'),
    toolUse('2026-11-01T10:01:00.000Z', 't1', 'Read', { file_path: 'C:\\Users\\dev\\repos\\MyCV\\DESIGN.md' }),
    user('2026-11-01T10:05:00.000Z', 'Tausta välkkyy taas mobiilissa, korjaa animaatio hitaammaksi.'),
    toolUse('2026-11-01T10:06:00.000Z', 't2', 'Edit', {
      file_path: 'C:\\Users\\dev\\repos\\MyCV\\src\\Frontend\\src\\components\\Background.tsx',
    }),
    user('2026-11-01T10:06:30.000Z', 'Hyvä, jatka.'),
    toolUse('2026-11-01T10:06:40.000Z', 't2b', 'Edit', {
      file_path: 'C:/Users/dev/repos/MyCV/src/Frontend/src/pages/Other.tsx',
    }),
    toolUse('2026-11-01T10:06:50.000Z', 't2c', 'Skill', { skill: 'handoff' }),
    toolUse('2026-11-01T10:07:00.000Z', 't3', 'Bash', { command: 'git push github feat/x' }),
    toolResult('2026-11-01T10:07:01.000Z', 't3', 'PreToolUse hook: Blocked by the Never list in CLAUDE.md: push only to Azure DevOps.', true),
    toolUse('2026-11-01T10:07:30.000Z', 't4', 'Read', { file_path: 'C:/Users/dev/repos/MyCV/.claude/hooks/core.mjs' }),
    toolResult('2026-11-01T10:07:31.000Z', 't4', "1 const REASON =\n2 'Blocked by the Never list in CLAUDE.md';"),
    user('2026-11-01T10:07:40.000Z', '[Request interrupted by user]'),
    user('2026-11-01T10:08:00.000Z', 'Muista ajaa markdownlint ennen pushia.'),
    user('2026-11-01T10:09:00.000Z', '<command-name>/create-pull-request</command-name>'),
    user('2026-11-01T10:10:00.000Z', `Tässä ohje: ${PASTE}`),
    user('2026-11-01T10:11:00.000Z', 'subagent text: väri on väärin', { isSidechain: true }),
    user('2026-11-01T10:12:00.000Z', 'Background (from the session that started this one): tausta taas'),
    user('2026-11-01T10:13:00.000Z', '<local-command-stdout>Set model to Sonnet</local-command-stdout>'),
  ]);
  writeTranscript(worktree, 's2.jsonl', [
    user('2026-11-03T09:00:00.000Z', 'Muista ajaa markdownlint ennen pushia', { sessionId: 's2' }),
    user('2026-11-03T09:02:00.000Z', `Taas sama: ${PASTE}`, { sessionId: 's2' }),
    user('2026-11-03T09:03:00.000Z', 'Selvä, jatka.', { sessionId: 's2' }),
    user('2026-11-03T09:04:00.000Z', '[Request interrupted by user]', { sessionId: 's2' }),
    user('2026-11-03T09:05:00.000Z', KICKOFF, { sessionId: 's2' }),
  ]);
  writeTranscript(join(projects, 'C--Users-dev-repos-Other'), 'o.jsonl', [
    user('2026-11-02T09:00:00.000Z', 'Tausta on väärin', { sessionId: 'o' }),
  ]);
  mkdirSync(join(repo, '.claude', 'rules'), { recursive: true });
  mkdirSync(join(repo, '.claude', 'skills', 'handoff'), { recursive: true });
  writeFileSync(join(repo, '.gitignore'), '.claude/skills/*\n!.claude/skills/handoff/\n');
  writeFileSync(join(repo, 'CLAUDE.md'), '# Test\n');
  writeFileSync(join(repo, 'DESIGN.md'), '# Design\n');
  writeFileSync(join(repo, '.claude', 'rules', 'hooks.md'), '# Hooks\n');
  writeFileSync(join(repo, '.claude', 'skills', 'handoff', 'SKILL.md'), '# Handoff\n');
});

after(() => rmSync(temp, { recursive: true, force: true }));

const extract = (since, until = '2026-12-01T00:00:00.000Z') =>
  run(['--since', since, '--until', until, '--projects-dir', projects, '--repo', repo]);

describe('classify', () => {
  test('flags a UI correction with both kinds of keywords', () => {
    const result = classify('Tausta välkkyy taas mobiilissa');
    assert.ok(result.ui.includes('tausta'));
    assert.ok(result.correction.includes('taas'));
  });

  test('does not take a kickoff prompt for feedback', () => {
    assert.deepEqual(classify('Act as a frontend engineer.\nImplement User Story 9: Tausta').ui, []);
  });

  test('a kickoff line in the middle of a message does not hide the feedback before it', () => {
    assert.ok(classify('Tausta välkkyy taas.\nImplement Task 9 later').ui.includes('tausta'));
  });

  test('ignores keywords inside a paste', () => {
    assert.deepEqual(classify(`Lue tämä ${PASTE.replace('Saman', 'tausta taas')}`).ui, []);
  });

  test('does not match a stem inside another word', () => {
    assert.deepEqual(classify('Pitää suunnitella välillä').ui, []);
  });

  test('skips words with another meaning and quoted text', () => {
    assert.deepEqual(classify('Onko sinulle väliä, puhutaanko suomea?').ui, []);
    assert.deepEqual(classify('En muista, miten agentti asennettiin').correction, []);
    assert.deepEqual(classify('Hi again').correction, []);
    assert.deepEqual(classify('Sanoit "älä näytä uudelleen", vaihdetaan se').correction, []);
  });
});

describe('helpers', () => {
  test('userText skips tool results, subagents and system reminders', () => {
    assert.equal(userText(toolResult('2026-11-01T00:00:00Z', 'x', 'ok')), null);
    assert.equal(userText(user('2026-11-01T00:00:00Z', 'hei', { isSidechain: true })), null);
    assert.equal(userText(user('2026-11-01T00:00:00Z', '<system-reminder>x</system-reminder> hei')), 'hei');
  });

  test('repoPath handles the main checkout and worktrees', () => {
    assert.equal(repoPath('C:\\r\\MyCV\\src\\Frontend\\a.tsx'), 'src/Frontend/a.tsx');
    assert.equal(repoPath('C:/r/MyCV/.claude/worktrees/w1/src/Frontend/b.tsx'), 'src/Frontend/b.tsx');
  });

  test('checkoutLabel names the worktree', () => {
    assert.equal(checkoutLabel('C--x-MyCV--claude-worktrees-us-1-abc'), 'us-1-abc');
    assert.equal(checkoutLabel('C--x-MyCV'), 'main');
  });

  test('pastedBlocks finds tagged pastes', () => {
    assert.equal(pastedBlocks(`a ${PASTE}`).length, 1);
    assert.equal(pastedBlocks('short').length, 0);
  });

  test('isNeverGuardBlock needs an error result that starts with the reason', () => {
    const reason = 'Blocked by the Never list in CLAUDE.md: never push to main.';
    assert.equal(isNeverGuardBlock({ is_error: true, content: reason }), true);
    assert.equal(isNeverGuardBlock({ is_error: false, content: reason }), false);
    assert.equal(isNeverGuardBlock({ is_error: true, content: `${'x'.repeat(300)} ${reason}` }), false);
  });

  test('parseMax falls back to 120 for a missing or invalid value', () => {
    assert.equal(parseMax('40'), 40);
    for (const value of [undefined, 'true', 'abc', '0', '-5']) assert.equal(parseMax(value), 120, String(value));
  });

  test('a session with many events does not overflow the call stack', () => {
    const times = Array.from({ length: 200000 }, (_, i) => Date.UTC(2026, 10, 1) + i * 1000);
    const session = { id: 'big', checkout: 'main', branch: 'feat/x', title: 't', times, first: times[0], last: times.at(-1) };
    Object.assign(session, { messages: [], neverGuard: [], frontendEdits: [], skills: [], commands: [], reads: [] });
    const [work] = workByBranch([session]);
    assert.equal(work.firstStart, new Date(times[0]).toISOString());
    const result = buildExcerpt([session], { since: 0, until: Date.UTC(2027, 0, 1), repo, max: 10 });
    assert.equal(result.window.until, new Date(times.at(-1)).toISOString());
  });

  test('activeMinutes caps idle gaps at ten minutes', () => {
    assert.equal(activeMinutes([0, 60000, 60000 + 3600000]), 11);
  });
});

describe('run', () => {
  test('finds UI feedback with the frontend file edited after it', () => {
    const result = extract('2026-10-01T00:00:00.000Z');
    assert.equal(result.uiFeedback.length, 1);
    const [ui] = result.uiFeedback;
    assert.equal(ui.category, 'ui');
    assert.deepEqual(ui.frontendFiles, ['src/Frontend/src/components/Background.tsx']);
    assert.ok(ui.text.startsWith('Tausta välkkyy'));
  });

  test('reads only MyCV folders and skips subagent lines', () => {
    const result = extract('2026-10-01T00:00:00.000Z');
    assert.equal(result.counts.sessions, 2);
    assert.deepEqual(result.work.map((w) => [w.branch, w.sessions]), [['feat/US-1_Test', 2]]);
    assert.deepEqual(result.work[0].checkouts.toSorted(), ['main', 'us-1-test-abc123']);
    assert.equal(result.work[0].title, 'Taustan korjaus');
    for (const skipped of ['väri on väärin', 'Background (from', 'local-command']) {
      assert.ok(!JSON.stringify(result).includes(skipped), skipped);
    }
  });

  test('finds corrections, repeated prompts, pastes, Never guard blocks and commands', () => {
    const result = extract('2026-10-01T00:00:00.000Z');
    assert.ok(result.corrections.some((c) => c.text.startsWith('Muista ajaa markdownlint')));
    assert.equal(result.repeatedPrompts[0].sessions, 2);
    assert.equal(result.pastedContent.length, 1);
    assert.equal(result.pastedContent[0].count, 2);
    assert.ok(!result.repeatedPrompts.some((p) => p.text.startsWith('[Request interrupted')));
    assert.equal(result.neverGuard.length, 1);
    assert.equal(result.neverGuard[0].command, 'git push github feat/x');
    assert.deepEqual(result.commands, { 'create-pull-request': 1 });
  });

  test('counts instruction file uses, least used first, automatically loaded files last', () => {
    const result = extract('2026-10-01T00:00:00.000Z');
    const use = Object.fromEntries(result.instructionUse.map((f) => [f.path, f]));
    assert.equal(use['DESIGN.md'].reads, 1);
    assert.equal(use['.claude/skills/handoff/SKILL.md'].reads, 1, 'a Skill call counts as a use');
    assert.equal(use['CLAUDE.md'].autoLoaded, true);
    assert.equal(use['.claude/rules/hooks.md'].autoLoaded, true);
    assert.equal(use['DESIGN.md'].autoLoaded, false);
    assert.deepEqual(result.instructionUse.slice(-2).map((f) => f.autoLoaded), [true, true]);
  });

  test('a second run from the stored time sees only the new session', () => {
    const first = extract('2026-10-01T00:00:00.000Z', '2026-11-02T00:00:00.000Z');
    assert.equal(first.window.until, '2026-11-01T10:13:00.000Z');
    assert.deepEqual(first.uiFeedback[0].frontendFiles, ['src/Frontend/src/components/Background.tsx']);
    const state = emptyState();
    applyRun(state, { until: first.window.until });
    writeState(state);
    const second = run(['--until', '2026-12-01T00:00:00.000Z', '--projects-dir', projects, '--repo', repo]);
    assert.equal(second.counts.sessions, 1);
    assert.equal(second.window.until, '2026-11-03T09:05:00.000Z');
  });

  test('a cloud session reports that there are no transcripts', () => {
    process.env.CLAUDE_CODE_REMOTE = 'true';
    try {
      assert.equal(run([]).cloud, true);
    } finally {
      delete process.env.CLAUDE_CODE_REMOTE;
    }
  });
});

describe('applyRun', () => {
  const finding = { id: 'ui-background-flicker', title: 'Tausta välkkyy', category: 'ui', target: 'DESIGN.md', kind: 'add' };

  test('tracks a finding from new to ticketed, fixed and resolved', () => {
    const state = emptyState();
    assert.deepEqual(applyRun(state, { until: '2026-11-01T00:00:00Z', observed: [{ ...finding, count: 3 }] }), [
      'ui-background-flicker: new',
    ]);
    applyRun(state, { until: '2026-11-01T00:00:00Z', tickets: [{ id: finding.id, workItem: 300, date: '2026-11-01' }] });
    assert.equal(state.findings[finding.id].status, 'ticketed');
    applyRun(state, { until: '2026-11-05T00:00:00Z', fixed: [{ id: finding.id, date: '2026-11-04T00:00:00Z' }] });
    assert.equal(state.findings[finding.id].status, 'fixed', 'the window of the fix does not decide it');
    applyRun(state, { until: '2026-11-12T00:00:00Z' });
    assert.equal(state.findings[finding.id].status, 'resolved');
    assert.equal(state.lastProcessed, '2026-11-12T00:00:00Z');
  });

  test('marks a finding recurring when it comes back after a fix before the window', () => {
    const state = emptyState();
    applyRun(state, { until: '2026-11-01T00:00:00Z', observed: [finding] });
    applyRun(state, { until: '2026-11-03T00:00:00Z', fixed: [{ id: finding.id, date: '2026-11-02T00:00:00Z' }], observed: [finding] });
    assert.equal(state.findings[finding.id].status, 'fixed', 'seen in the window of the fix: not proof yet');
    applyRun(state, { until: '2026-11-10T00:00:00Z', observed: [finding] });
    assert.equal(state.findings[finding.id].status, 'recurring');
    assert.equal(state.findings[finding.id].occurrences.length, 3);
  });

  test('compares plain dates and ISO times as times', () => {
    assert.equal(toTime('2026-11-04'), Date.parse('2026-11-04T23:59:59.999Z'));
    const state = emptyState();
    applyRun(state, { until: '2026-11-01T00:00:00Z', observed: [finding] });
    applyRun(state, { until: '2026-11-04T08:00:00Z', fixed: [{ id: finding.id, date: '2026-11-04' }] });
    applyRun(state, { until: '2026-11-08T00:00:00Z' });
    assert.equal(state.findings[finding.id].status, 'fixed', 'a fix dated on the window start day is not before it');
    applyRun(state, { until: '2026-11-12T00:00:00+02:00' });
    assert.equal(state.findings[finding.id].status, 'resolved');
    applyRun(state, { until: '2026-11-11T23:00:00+02:00' });
    assert.equal(state.lastProcessed, '2026-11-12T00:00:00+02:00', 'an earlier offset time does not move it back');
  });

  test('reopens a finding whose work item was removed', () => {
    const state = emptyState();
    applyRun(state, { until: '2026-11-01T00:00:00Z', observed: [finding], tickets: [{ id: finding.id, workItem: 301 }] });
    assert.deepEqual(applyRun(state, { until: '2026-11-02T00:00:00Z', reopened: [finding.id] }), [`${finding.id}: reopened`]);
    assert.equal(state.findings[finding.id].status, 'open');
    assert.equal(state.findings[finding.id].fix, null);
  });

  test('keeps scheduled reports pending until reviewed', () => {
    const state = emptyState();
    applyRun(state, { until: '2026-11-01T00:00:00Z', scheduled: true, report: 'r1.md' });
    assert.deepEqual(state.pendingReports, [reportPath('r1.md')]);
    assert.ok(isAbsolute(state.pendingReports[0]));
    applyRun(state, { until: '2026-11-02T00:00:00Z', reviewedReports: [reportPath('r1.md')] });
    assert.deepEqual(state.pendingReports, []);
    applyRun(state, { until: '2026-11-03T00:00:00Z', scheduled: true, report: 'r2.md' });
    applyRun(state, { until: '2026-11-04T00:00:00Z', reviewedReports: ['r2.md'] });
    assert.deepEqual(state.pendingReports, []);
  });

  test('refuses a run without until and survives a broken state file', () => {
    assert.throws(() => applyRun(emptyState(), {}));
    mkdirSync(process.env.IMPROVE_SYSTEM_DIR, { recursive: true });
    writeFileSync(join(process.env.IMPROVE_SYSTEM_DIR, 'state.json'), '{broken');
    assert.equal(readState().lastProcessed, null);
  });
});
