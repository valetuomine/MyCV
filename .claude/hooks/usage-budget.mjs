// UserPromptSubmit hook: warns before and after the weekly usage passes today's cumulative limit,
// once per day for each warning. It never blocks the message.
import { claimMarker, computeLimit, loadConfig, loadSnapshot } from './usage-budget-core.mjs';

/**
 * Builds the warning for the current usage, claiming the daily marker so each warning shows once a day.
 * @returns {string | null} The warning text, or null when there is nothing to show.
 */
const buildWarning = () => {
  const snapshot = loadSnapshot();
  const nowSeconds = Date.now() / 1000;
  if (!snapshot || snapshot.resetsAt <= nowSeconds) return null;
  const { shares, margin } = loadConfig();
  const { dayIndex, limit } = computeLimit(snapshot.resetsAt, nowSeconds, shares);
  const used = Math.round(snapshot.usedPercentage);
  const key = `${Math.round(snapshot.resetsAt / 3600)}-${dayIndex}`;
  if (snapshot.usedPercentage >= limit) {
    const first = claimMarker(`${key}-over`);
    claimMarker(`${key}-near`);
    return first ? `Viikkobudjetti: käyttö ${used} % saavuttaa tai ylittää tämän päivän rajan ${Math.round(limit)} %.` : null;
  }
  if (snapshot.usedPercentage >= limit - margin && claimMarker(`${key}-near`)) {
    return `Viikkobudjetti: käyttö ${used} %, tämän päivän raja ${Math.round(limit)} % lähestyy.`;
  }
  return null;
};

try {
  const warning = buildWarning();
  if (warning) process.stdout.write(JSON.stringify({ systemMessage: warning }));
} catch {
  // Never block the message on an error.
}
