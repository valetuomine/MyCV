// Shared by usage-statusline.mjs and usage-budget.mjs: reads the budget settings and stores the latest
// weekly usage snapshot. The daily limit itself is computed in the usage-band plugin's core.mjs, which the
// plugin shares with these scripts.
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNonNegativeNumber, parseBudgetConfig } from '../skills/usage-band/hooks/core.mjs';

export { budgetWarning, computeLimit } from '../skills/usage-band/hooks/core.mjs';

const SNAPSHOT_FILE = join(tmpdir(), 'mycv-usage-snapshot.json');

/**
 * Reads usage-budget.json; a missing file, bad JSON or a bad value falls back to the defaults.
 * @returns {{shares: number[], margin: number}} Daily shares indexed by weekday (0 = Sunday) and the warning margin.
 */
export const loadConfig = () => {
  try {
    return parseBudgetConfig(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'usage-budget.json'), 'utf8')));
  } catch {
    return parseBudgetConfig({});
  }
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
