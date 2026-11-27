#!/usr/bin/env node
/**
 * Keeps the local state of /improve-system: the last processed time, earlier findings and their fixes, and the
 * scheduled reports not yet reviewed. The state never goes into the repository.
 *
 * Usage:
 *   node state.mjs path            Prints the state folder and file.
 *   node state.mjs show            Prints the state as JSON.
 *   node state.mjs apply <file>    Merges a run file (see `applyRun`) into the state and prints the changes.
 *
 * `IMPROVE_SYSTEM_DIR` overrides the folder (tests use it).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATE_VERSION = 1;

/**
 * Finds the state folder: `%LOCALAPPDATA%\MyCV\improve-system`, or `~/.local/share/MyCV/improve-system`.
 * @returns {string} The folder.
 */
export const stateDir = () => {
  if (process.env.IMPROVE_SYSTEM_DIR) return process.env.IMPROVE_SYSTEM_DIR;
  const base = process.env.LOCALAPPDATA ?? join(homedir(), '.local', 'share');
  return join(base, 'MyCV', 'improve-system');
};

/**
 * The state file path.
 * @returns {string} The path.
 */
export const statePath = () => join(stateDir(), 'state.json');

/**
 * Resolves a report name against the state folder, so a run file can name a report by its file name alone.
 * @param {string} report A file name or an absolute path.
 * @returns {string} The absolute path.
 */
export const reportPath = (report) => (isAbsolute(report) ? report : join(stateDir(), report));

/**
 * Creates an empty state. `findings` is keyed by id, and each finding has a `source` (`history` here), so the
 * UI review Task can add its own findings to the same structure.
 * @returns {object} The state.
 */
export const emptyState = () => ({ version: STATE_VERSION, lastProcessed: null, findings: {}, runs: [], pendingReports: [] });

/**
 * Reads the state, or an empty one when the file is missing or broken.
 * @returns {object} The state.
 */
export const readState = () => {
  const path = statePath();
  if (!existsSync(path)) return emptyState();
  try {
    return { ...emptyState(), ...JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return emptyState();
  }
};

/**
 * Writes the state atomically.
 * @param {object} state The state.
 */
export const writeState = (state) => {
  mkdirSync(stateDir(), { recursive: true });
  const path = statePath();
  writeFileSync(`${path}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};

/**
 * Turns an ISO time or a plain date into milliseconds. A plain date (`2026-11-04`) means the end of that day, so a
 * fix dated on the day a window starts is not taken as fixed before it.
 * @param {string | null | undefined} value The time.
 * @returns {number} Milliseconds, or NaN when the value is missing or invalid.
 */
export const toTime = (value) => {
  if (typeof value !== 'string') return Number.NaN;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return Date.parse(`${value}T23:59:59.999Z`);
  return Date.parse(value);
};

/**
 * Tells whether a finding was fixed before a window started.
 * @param {object} finding The finding.
 * @param {string | null} since The window start.
 * @returns {boolean} True when the fix date is before the start.
 */
const fixedBefore = (finding, since) => toTime(finding.fix?.fixedAt) < toTime(since);

/**
 * Marks findings whose work item is done as fixed.
 * @param {object} findings The findings by id.
 * @param {{ id: string, date: string }[]} fixed The fixed findings.
 * @param {string[]} changes The change log.
 */
const applyFixed = (findings, fixed, changes) => {
  for (const { id, date } of fixed) {
    const finding = findings[id];
    if (!finding) continue;
    finding.fix = { ...finding.fix, fixedAt: date };
    finding.status = 'fixed';
    changes.push(`${id}: fixed`);
  }
};

/**
 * Upserts the findings seen in this run and decides whether a fixed one recurred.
 * @param {object} findings The findings by id.
 * @param {object[]} observed The findings seen in this run.
 * @param {{ since: string | null, until: string }} window The run's window.
 * @param {string[]} changes The change log.
 */
const applyObserved = (findings, observed, window, changes) => {
  for (const item of observed) {
    const existing = findings[item.id];
    if (!existing) {
      const { count = 1, ...fields } = item;
      findings[item.id] = {
        source: 'history',
        ...fields,
        status: 'open',
        firstSeen: window.until,
        lastSeen: window.until,
        occurrences: [{ until: window.until, count }],
        fix: null,
      };
      changes.push(`${item.id}: new`);
      continue;
    }
    Object.assign(existing, { title: item.title ?? existing.title, target: item.target ?? existing.target });
    existing.lastSeen = window.until;
    existing.occurrences.push({ until: window.until, count: item.count ?? 1 });
    if (fixedBefore(existing, window.since) && ['fixed', 'resolved', 'recurring'].includes(existing.status)) {
      existing.status = 'recurring';
      changes.push(`${item.id}: recurring after the fix`);
    } else {
      changes.push(`${item.id}: seen again (${existing.status})`);
    }
  }
};

/**
 * Opens findings again whose work item was removed without a fix, so they can be proposed again.
 * @param {object} findings The findings by id.
 * @param {string[]} reopened The ids.
 * @param {string[]} changes The change log.
 */
const applyReopened = (findings, reopened, changes) => {
  for (const id of reopened) {
    const finding = findings[id];
    if (!finding) continue;
    finding.status = 'open';
    finding.fix = null;
    changes.push(`${id}: reopened`);
  }
};

/**
 * Marks fixed findings that did not come back in this run as resolved.
 * @param {object} findings The findings by id.
 * @param {Set<string>} seen The ids seen in this run.
 * @param {string | null} since The start of this run's window: only a fix before it can be resolved.
 * @param {string[]} changes The change log.
 */
const applyResolved = (findings, seen, since, changes) => {
  for (const finding of Object.values(findings)) {
    if (seen.has(finding.id) || !['fixed', 'recurring'].includes(finding.status)) continue;
    if (!fixedBefore(finding, since)) continue;
    finding.status = 'resolved';
    changes.push(`${finding.id}: resolved`);
  }
};

/**
 * Merges one run into the state. The run file is written by the skill:
 * `{ until, scheduled?, report?, reviewedReports?, fixed?: [{id, date}], reopened?: [id], observed?: [{id, title,
 * category, target, kind, count, source?}], tickets?: [{id, workItem, date}], rejected?: [id] }`.
 * `reopened` lists findings whose work item was `Removed` without a fix.
 * Order: fixed and reopened work items first, then this run's findings, then the fixed ones that stayed away are resolved.
 * A fixed finding counts as recurring, or as resolved, only when it was fixed before this run's window started,
 * so a whole window after the fix decides it.
 * @param {object} state The state (changed in place).
 * @param {object} runFile The run.
 * @param {string} [now] The current time, ISO.
 * @returns {string[]} The changes.
 */
export const applyRun = (state, runFile, now = new Date().toISOString()) => {
  if (Number.isNaN(Date.parse(runFile.until ?? ''))) throw new Error('The run file needs an ISO `until` time.');
  const changes = [];
  const window = { since: state.lastProcessed, until: runFile.until };
  const observed = (runFile.observed ?? []).filter((item) => item.id);
  applyFixed(state.findings, runFile.fixed ?? [], changes);
  applyReopened(state.findings, runFile.reopened ?? [], changes);
  applyObserved(state.findings, observed, window, changes);
  applyResolved(state.findings, new Set(observed.map((item) => item.id)), window.since, changes);
  for (const ticket of runFile.tickets ?? []) {
    const finding = state.findings[ticket.id];
    if (!finding) continue;
    finding.fix = { workItem: ticket.workItem, ticketedAt: ticket.date ?? now };
    finding.status = 'ticketed';
    changes.push(`${ticket.id}: ticketed as ${ticket.workItem}`);
  }
  for (const id of runFile.rejected ?? []) {
    if (!state.findings[id]) continue;
    state.findings[id].status = 'rejected';
    changes.push(`${id}: rejected`);
  }
  const last = toTime(state.lastProcessed);
  if (Number.isNaN(last) || toTime(runFile.until) > last) state.lastProcessed = runFile.until;
  const reviewed = new Set((runFile.reviewedReports ?? []).map(reportPath));
  state.pendingReports = state.pendingReports.filter((report) => !reviewed.has(reportPath(report)));
  if (runFile.scheduled && runFile.report) state.pendingReports.push(reportPath(runFile.report));
  state.runs.push({ at: now, until: runFile.until, scheduled: Boolean(runFile.scheduled), observed: observed.length });
  state.runs = state.runs.slice(-50);
  return changes;
};

/**
 * Runs the command line.
 * @param {string[]} argv The arguments.
 * @returns {string} The output.
 */
export const main = (argv) => {
  const [command, file] = argv;
  if (command === 'path') return JSON.stringify({ dir: stateDir(), state: statePath() });
  if (command === 'show') return JSON.stringify(readState(), null, 2);
  if (command === 'apply' && file) {
    const state = readState();
    const changes = applyRun(state, JSON.parse(readFileSync(file, 'utf8')));
    writeState(state);
    return JSON.stringify({ lastProcessed: state.lastProcessed, changes }, null, 2);
  }
  throw new Error('Usage: node state.mjs path | show | apply <run.json>');
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
