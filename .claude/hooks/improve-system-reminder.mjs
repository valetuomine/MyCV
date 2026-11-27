// SessionStart hook: reminds the session that a scheduled /improve-system report waits for review, and why the last
// scheduled run was skipped. Run by session-start.mjs. It only reads the skill's state and the run log, never writes
// anything, prints nothing in a cloud session or when there is nothing to say, and never fails a session start.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MAX_AGE_MS = 8 * 24 * 3_600_000;
const MAX_LOG_LINE_CHARS = 300;

const { readState, stateDir } =
  await import("../skills/improve-system/scripts/state.mjs").catch(() => ({}));

/**
 * Counts the scheduled reports that exist on disk and are not reviewed yet.
 * @returns {number} The number of waiting reports; 0 when the state cannot be read.
 */
const waitingReports = () => {
  try {
    return (readState().pendingReports ?? []).filter((path) => existsSync(path))
      .length;
  } catch {
    return 0;
  }
};

/**
 * Reads the log of the last scheduled run when that run did not produce a report and is less than a week old.
 * @returns {string} The log line without the model's own output (kept in the log file only); empty when the last run was fine or the log is missing.
 */
const lastSkipOrFailure = () => {
  const lines = readFileSync(join(stateDir(), "scheduled.log"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const last = lines.at(-1) ?? "";
  const [time, status] = last.split(" ");
  const age = Date.now() - Date.parse(time);
  if (
    age >= MAX_AGE_MS ||
    Number.isNaN(age) ||
    !/^(skipped|failed):$/.test(status ?? "")
  )
    return "";
  return last.split("; it said:")[0].slice(0, MAX_LOG_LINE_CHARS);
};

/**
 * Builds the note.
 * @returns {string} The note; empty when there is nothing to report.
 */
const buildNote = () => {
  const notes = [];
  const waiting = waitingReports();
  if (waiting > 0) {
    notes.push(
      `New improve-system report waiting (${waiting}): tell the user and suggest running /improve-system, which goes through it first.`,
    );
  }
  try {
    const last = lastSkipOrFailure();
    if (last)
      notes.push(
        `The last scheduled improve-system run did not make a report: "${last}".`,
      );
  } catch {
    // The log is optional.
  }
  return notes.join("\n");
};

try {
  const note = process.env.CLAUDE_CODE_REMOTE === "true" ? "" : buildNote();
  if (note) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: note,
        },
      }),
    );
  }
} catch {
  // The hook never fails a session start.
}
