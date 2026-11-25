// SessionStart hook: checks at the start of a session whether the checkout is up to date with origin/main.
// A worktree with a clean working tree whose HEAD is an ancestor of origin/main is brought up to date with a
// fast-forward merge. Anything else, and the main checkout, which is never switched, updated or merged, is only
// reported to Claude as a short additional context. An up-to-date checkout prints nothing. Run by session-start.mjs,
// which starts the code graph hook only after this one has ended.
// The hook never fails a session start: a network error or any other failure ends it silently with exit code 0.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOTAL_BUDGET_MS = 25_000;
const MIN_COMMAND_MS = 1_000;
const FETCH_TIMEOUT_MS = 15_000;
const MERGE_TIMEOUT_MS = 10_000;
const COMMAND_TIMEOUT_MS = 10_000;
const NO_PROMPT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GCM_INTERACTIVE: "never",
};
const MAIN_BRANCH = "main";
const startedAt = Date.now();
const startDir = resolve(
  process.env.CLAUDE_PROJECT_DIR ||
    join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
);

/**
 * Tells how much of the hook's total budget is left.
 * @returns {number} Milliseconds left.
 */
const timeLeft = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

/**
 * Runs a command and returns its standard output. The time left of the hook's total budget caps every command, so
 * the hook ends before Claude Code stops it. Git never asks for credentials: a prompt would only stall the hook.
 * @param {string} command - Executable to run.
 * @param {string[]} args - Arguments of the command.
 * @param {number} timeout - Time in milliseconds after which the command is stopped.
 * @returns {string} The output; the call throws when the command fails, times out or the budget is used up.
 */
const run = (command, args, timeout) => {
  const left = timeLeft();
  if (left < MIN_COMMAND_MS) throw new Error("The hook budget is used up.");
  return execFileSync(command, args, {
    cwd: startDir,
    env: NO_PROMPT_ENV,
    encoding: "utf8",
    timeout: Math.min(timeout, left),
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
};

/**
 * Runs git and returns its standard output.
 * @param {string[]} args - Arguments of the git command.
 * @param {number} [timeout] - Time in milliseconds after which the command is stopped.
 * @returns {string} The output; the call throws when git fails.
 */
const git = (args, timeout = COMMAND_TIMEOUT_MS) => run("git", args, timeout);

/**
 * Normalises a path for comparison; Windows paths are case-insensitive.
 * @param {string} path - Path to normalise.
 * @returns {string} The absolute path, in lower case on Windows.
 */
const normalise = (path) =>
  process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);

/**
 * Tells whether the session runs in a linked worktree, whose git-dir differs from the git-common-dir.
 * @returns {boolean} True in a worktree, false in the main checkout.
 */
const isWorktree = () => {
  const [gitDir, commonDir] = git([
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  ])
    .trim()
    .split("\n")
    .map((line) => line.trim());
  return normalise(gitDir) !== normalise(commonDir);
};

/**
 * Tells whether HEAD is an ancestor of origin/main, so that a fast-forward merge is possible.
 * @returns {boolean} True when HEAD has no commit of its own that origin/main lacks.
 */
const headIsAncestor = () => {
  try {
    git(["merge-base", "--is-ancestor", "HEAD", "origin/main"]);
    return true;
  } catch {
    return false;
  }
};

/**
 * Describes the current branch for a message.
 * @param {string} branch - The branch name, empty on a detached HEAD.
 * @returns {string} The branch name in quotes, or `a detached HEAD`.
 */
const describeBranch = (branch) =>
  branch ? `branch '${branch}'` : "a detached HEAD";

/**
 * Builds the note for a worktree that is behind origin/main: updates it when that is safe, otherwise tells why not.
 * @param {number} behind - Number of commits that HEAD is behind origin/main.
 * @param {string} branch - The current branch, empty on a detached HEAD.
 * @returns {string} The note.
 */
const syncWorktree = (behind, branch) => {
  const dirty = git(["status", "--porcelain"]).trim() !== "";
  const ancestor = headIsAncestor();
  const where = `this worktree (${describeBranch(branch)}) is ${behind} commit(s) behind origin/main`;
  const reasons = [
    dirty ? "the working tree has uncommitted changes" : "",
    ancestor ? "" : "the branch has commits of its own",
  ].filter(Boolean);
  if (reasons.length === 0) {
    if (timeLeft() < MERGE_TIMEOUT_MS) {
      reasons.push("too little of the hook's time was left for the merge");
    } else {
      try {
        git(["merge", "--ff-only", "origin/main"], MERGE_TIMEOUT_MS);
        return `Worktree sync: ${where} and was fast-forwarded to it. CLAUDE.md, rules and skills were loaded before the update, so re-read the ones that changed.`;
      } catch {
        reasons.push("the fast-forward merge failed");
      }
    }
  }
  return `Worktree sync: ${where} and was not updated because ${reasons.join(" and ")}. Rebase or merge origin/main when the work allows it, or, when this branch's work is already merged, start a new branch from origin/main.`;
};

/**
 * Builds the note for the main checkout, which the hook never changes.
 * @param {number} behind - Number of commits that HEAD is behind origin/main.
 * @param {string} branch - The current branch, empty on a detached HEAD.
 * @returns {string} The note; empty when the checkout is on main and up to date.
 */
const reportMainCheckout = (behind, branch) => {
  const problems = [
    branch === MAIN_BRANCH
      ? ""
      : `is on ${describeBranch(branch)}, not ${MAIN_BRANCH}`,
    behind > 0 ? `is ${behind} commit(s) behind origin/main` : "",
  ].filter(Boolean);
  if (problems.length === 0) return "";
  return `Worktree sync: the main checkout ${problems.join(" and ")}. The hook does not change the main checkout. The usage-band plugin is loaded from this checkout, so it may lack newer changes until the checkout is updated.`;
};

/**
 * Fetches origin and builds the session start note.
 * @returns {string} The note; empty when the checkout is up to date.
 */
const buildNote = () => {
  git(["fetch", "--quiet", "origin"], FETCH_TIMEOUT_MS);
  const behind = Number.parseInt(
    git(["rev-list", "--count", "HEAD..origin/main"]).trim(),
    10,
  );
  const branch = git(["branch", "--show-current"]).trim();
  if (isWorktree()) return behind > 0 ? syncWorktree(behind, branch) : "";
  return reportMainCheckout(behind, branch);
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
