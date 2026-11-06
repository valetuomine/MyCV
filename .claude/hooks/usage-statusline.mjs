// Status line: shows the weekly usage, today's cumulative limit, the five-hour window usage and the
// context size, and stores the weekly usage for usage-budget.mjs. Prints nothing on any failure.
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
 * Formats the reset time of the five-hour window as a local 24-hour HH:MM time.
 * @param {unknown} resetsAt The reset time as a Unix timestamp in seconds.
 * @returns {string} The time, or an empty string when it is missing, past or more than five hours ahead.
 */
const formatResetTime = (resetsAt) => {
  if (!isNumber(resetsAt)) return '';
  const msAhead = resetsAt * 1000 - Date.now();
  if (msAhead <= 0 || msAhead > 5 * 60 * 60 * 1000) return '';
  const date = new Date(resetsAt * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * Builds the status line text from the rate limit and context window fields; absent parts are left out.
 * @returns {Promise<string>} The status line, or an empty string when there is nothing to show.
 */
const buildLine = async () => {
  const data = JSON.parse(await readStdin());
  const limits = data?.rate_limits;
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
  if (isNumber(fiveHour?.used_percentage)) {
    const resetTime = formatResetTime(fiveHour.resets_at);
    parts.push(`5 h ${Math.round(fiveHour.used_percentage)} %${resetTime ? ` (nollautuu ${resetTime})` : ''}`);
  }
  const contextTokens = data?.context_window?.total_input_tokens;
  if (isNumber(contextTokens)) parts.push(`Konteksti ${Math.round(contextTokens / 1000)}k`);
  return parts.join(' · ');
};

try {
  process.stdout.write(await buildLine());
} catch {
  // Never break the status line on an error.
}
