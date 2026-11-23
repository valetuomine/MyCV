// UserPromptSubmit hook: warns before and after the weekly usage passes today's cumulative limit,
// once per day for each warning. It never blocks the message.
import { budgetWarning, claimMarker, loadConfig, loadSnapshot } from './usage-budget-core.mjs';

/**
 * Builds the warning for the current usage, claiming the daily marker so each warning shows once a day.
 * @returns {string | null} The warning text, or null when there is nothing to show.
 */
const buildWarning = () => {
  const snapshot = loadSnapshot();
  if (!snapshot) return null;
  const warning = budgetWarning(snapshot.usedPercentage, snapshot.resetsAt, Date.now() / 1000, loadConfig());
  if (!warning) return null;
  if (warning.level === 'over') {
    const first = claimMarker(`${warning.key}-over`);
    claimMarker(`${warning.key}-near`);
    return first ? warning.text : null;
  }
  return claimMarker(`${warning.key}-near`) ? warning.text : null;
};

try {
  const warning = buildWarning();
  if (warning) process.stdout.write(JSON.stringify({ systemMessage: warning }));
} catch {
  // Never block the message on an error.
}
