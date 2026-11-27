// SessionStart runner: runs the worktree sync hook, the code graph hook and the improve-system reminder, one after
// the other, and prints their additional contexts as one. Claude Code starts the hooks of one event in parallel, so
// the order in settings.json alone would let the graph read HEAD while the sync still fetches or merges; the graph
// compares its build commit with HEAD, so it has to start after the sync has ended.
// Each hook keeps its own time limit; a hook that fails or prints nothing is skipped silently, and the runner never
// fails a session start.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hooksDir = dirname(fileURLToPath(import.meta.url));
const STEPS = [
  { script: "worktree-sync.mjs", timeoutMs: 30_000 },
  { script: "graphify-session.mjs", timeoutMs: 60_000 },
  { script: "improve-system-reminder.mjs", timeoutMs: 5_000 },
];

/**
 * Runs one hook script and reads the additional context from its output.
 * @param {{ script: string, timeoutMs: number }} step - Script file name in this folder and its time limit.
 * @returns {string} The additional context, or an empty string when the hook failed or printed nothing.
 */
const runStep = ({ script, timeoutMs }) => {
  try {
    const output = execFileSync(process.execPath, [join(hooksDir, script)], {
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    const context = JSON.parse(output)?.hookSpecificOutput?.additionalContext;
    return typeof context === "string" ? context : "";
  } catch {
    return "";
  }
};

try {
  const contexts = STEPS.map(runStep).filter(Boolean);
  if (contexts.length > 0) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: contexts.join("\n"),
        },
      }),
    );
  }
} catch {
  // The runner never fails a session start.
}
