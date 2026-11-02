// Status line: shows the weekly usage, today's cumulative limit and the five-hour window usage,
// and stores the weekly usage for usage-budget.mjs. Prints nothing on any failure.
import { computeLimit, loadConfig, saveSnapshot } from './usage-budget-core.mjs';

/**
 * Reads the whole status line input from stdin.
 * @returns {Promise<string>} The raw JSON text.
 */
const readStdin = async () => {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
};

/**
 * Checks that a value is a finite number.
 * @param {unknown} value The value to check.
 * @returns {boolean} True for finite numbers.
 */
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Builds the status line text from the rate limit fields; absent windows are left out.
 * @returns {Promise<string>} The status line, or an empty string when there is nothing to show.
 */
const buildLine = async () => {
  const limits = JSON.parse(await readStdin())?.rate_limits;
  const week = limits?.seven_day;
  const fiveHour = limits?.five_hour;
  const parts = [];
  if (isNumber(week?.used_percentage)) {
    let text = `Viikko ${Math.round(week.used_percentage)} %`;
    if (isNumber(week.resets_at)) {
      saveSnapshot(week.used_percentage, week.resets_at);
      const { shares } = loadConfig();
      text += ` / raja ${Math.round(computeLimit(week.resets_at, Date.now() / 1000, shares).limit)} %`;
    }
    parts.push(text);
  }
  if (isNumber(fiveHour?.used_percentage)) parts.push(`5 h ${Math.round(fiveHour.used_percentage)} %`);
  return parts.join(' · ');
};

try {
  process.stdout.write(await buildLine());
} catch {
  // Never break the status line on an error.
}
