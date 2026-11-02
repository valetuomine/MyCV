// Shared by usage-statusline.mjs and usage-budget.mjs: reads the budget settings, stores the latest
// weekly usage snapshot and computes the cumulative daily limit.
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY_SECONDS = 86400;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_SHARE = 14;
const DEFAULT_MARGIN = 3;
const SNAPSHOT_FILE = join(tmpdir(), 'mycv-usage-snapshot.json');

/**
 * Checks that a value is a finite non-negative number.
 * @param {unknown} value The value to check.
 * @returns {boolean} True when the value is a usable percentage or time.
 */
const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Reads usage-budget.json; a missing file, bad JSON or a bad value falls back to the defaults.
 * @returns {{shares: number[], margin: number}} Daily shares indexed by weekday (0 = Sunday) and the warning margin.
 */
export const loadConfig = () => {
  let raw = {};
  try {
    raw = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'usage-budget.json'), 'utf8')) ?? {};
  } catch {
    raw = {};
  }
  const shares = WEEKDAYS.map((day) => (isNonNegativeNumber(raw.dailyShare?.[day]) ? raw.dailyShare[day] : DEFAULT_SHARE));
  const margin = isNonNegativeNumber(raw.warningMargin) ? raw.warningMargin : DEFAULT_MARGIN;
  return { shares, margin };
};

/**
 * Stores the weekly usage so the hook can read it; the hook input has no usage fields.
 * @param {number} usedPercentage The seven-day usage percentage.
 * @param {number} resetsAt The Unix time in seconds when the week resets.
 * @returns {void}
 */
export const saveSnapshot = (usedPercentage, resetsAt) => {
  try {
    writeFileSync(SNAPSHOT_FILE, JSON.stringify({ usedPercentage, resetsAt }));
  } catch {
    // Usage tracking is best effort.
  }
};

/**
 * Reads the stored usage snapshot.
 * @returns {{usedPercentage: number, resetsAt: number} | null} The snapshot, or null when missing or invalid.
 */
export const loadSnapshot = () => {
  try {
    const { usedPercentage, resetsAt } = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'));
    return isNonNegativeNumber(usedPercentage) && isNonNegativeNumber(resetsAt) ? { usedPercentage, resetsAt } : null;
  } catch {
    return null;
  }
};

/**
 * Computes the cumulative limit for the current day of the usage week.
 * The week starts at `resetsAt` minus seven days and each day lasts 24 hours from that moment.
 * @param {number} resetsAt The Unix time in seconds when the week resets.
 * @param {number} nowSeconds The current Unix time in seconds.
 * @param {number[]} shares Daily shares indexed by weekday (0 = Sunday).
 * @returns {{dayIndex: number, limit: number}} The day of the week (0-6) and the limit in percent, capped at 100.
 */
export const computeLimit = (resetsAt, nowSeconds, shares) => {
  const start = resetsAt - 7 * DAY_SECONDS;
  const dayIndex = Math.min(6, Math.max(0, Math.floor((nowSeconds - start) / DAY_SECONDS)));
  const firstDay = new Date(start * 1000).getDay();
  let limit = 0;
  for (let i = 0; i <= dayIndex; i++) limit += shares[(firstDay + i) % 7];
  return { dayIndex, limit: Math.min(100, limit) };
};

/**
 * Creates a marker file in the temp directory; fails when it already exists.
 * @param {string} name The marker name.
 * @returns {boolean} True when the marker was created now, false when it already existed or could not be created.
 */
export const claimMarker = (name) => {
  try {
    closeSync(openSync(join(tmpdir(), `mycv-usage-${name}`), 'wx'));
    return true;
  } catch {
    return false;
  }
};
