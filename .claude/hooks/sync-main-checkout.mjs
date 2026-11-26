// Scheduled script (not a Claude Code hook): keeps the main checkout, the folder that holds the real .git, on `main`
// and up to date with origin/main, so the usage-band plugin, which Claude Code loads from that checkout, always has
// the latest changes. Usage: node sync-main-checkout.mjs [repository folder]; the folder defaults to the one that
// holds this script's `.claude` folder.
// It updates the checkout only when that loses nothing: a clean working tree, no merge, rebase, cherry-pick or revert
// in progress, and HEAD either on `main` or detached at a commit that origin/main contains. Everything else (another
// branch, commits of its own, a dirty working tree, no network) changes nothing and is only logged.
// It never uses reset --hard, stash, checkout --force, --force or push, and always ends with exit code 0.
// One line per run goes to %LOCALAPPDATA%\MyCV\sync-main-checkout.log (SYNC_MAIN_LOG overrides the path), at most 100.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FETCH_TIMEOUT_MS = 30_000;
const COMMAND_TIMEOUT_MS = 15_000;
const MAX_LOG_LINES = 100;
const MAIN_BRANCH = "main";
const NO_PROMPT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GCM_INTERACTIVE: "never",
};
const repoDir = resolve(
  process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
);

/**
 * Runs a command in the repository and returns its standard output.
 * @param {string} command - Executable to run.
 * @param {string[]} args - Arguments of the command.
 * @param {number} timeout - Time in milliseconds after which the command is stopped.
 * @returns {string} The output; the call throws when the command fails or times out.
 */
const run = (command, args, timeout) =>
  execFileSync(command, args, {
    cwd: repoDir,
    env: NO_PROMPT_ENV,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

/**
 * Names why a command failed, for the log.
 * @param {unknown} error - The error thrown by the command.
 * @returns {string} The first non-empty line of git's error output, else of the error message.
 */
const reasonOf = (error) => {
  const text = [error?.stderr, error?.message]
    .map((part) => String(part ?? "").trim())
    .find(Boolean);
  return text ? text.split("\n")[0] : "unknown error";
};

/**
 * Runs git in the repository and returns its standard output.
 * @param {string[]} args - Arguments of the git command.
 * @param {number} [timeout] - Time in milliseconds after which git is stopped.
 * @returns {string} The output; the call throws when git fails or times out.
 */
const git = (args, timeout = COMMAND_TIMEOUT_MS) => run("git", args, timeout);

/**
 * Tells whether a git command succeeds, for the commands whose exit code is the answer.
 * @param {string[]} args - Arguments of the git command.
 * @returns {boolean} True when git exits with 0.
 */
const gitSucceeds = (args) => {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
};

/**
 * Finds the path of the log file.
 * @returns {string} The path from SYNC_MAIN_LOG, else under %LOCALAPPDATA%\MyCV, else under the home folder.
 */
const logPath = () =>
  process.env.SYNC_MAIN_LOG ||
  join(
    process.env.LOCALAPPDATA || join(homedir(), ".local", "state"),
    "MyCV",
    "sync-main-checkout.log",
  );

/**
 * Appends one line to the log and keeps only the last lines. A log failure is ignored.
 * @param {string} message - What the run did or why it did nothing.
 */
const log = (message) => {
  try {
    const path = logPath();
    mkdirSync(dirname(path), { recursive: true });
    const old = existsSync(path)
      ? readFileSync(path, "utf8").split("\n").filter(Boolean)
      : [];
    const line = `${new Date().toISOString()} ${message}`;
    writeFileSync(path, `${[...old, line].slice(-MAX_LOG_LINES).join("\n")}\n`);
  } catch {
    // The log is optional; the script has done its work either way.
  }
};

/**
 * Tells whether the folder is the main checkout, whose git-dir is the git-common-dir.
 * @returns {boolean} True in the main checkout, false in a linked worktree.
 */
const isMainCheckout = () => {
  const [gitDir, commonDir] = git([
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  ])
    .trim()
    .split("\n")
    .map((line) => resolve(line.trim()).toLowerCase());
  return gitDir === commonDir;
};

/**
 * Tells whether a merge, rebase, cherry-pick, revert or bisect is in progress.
 * @returns {boolean} True when one of git's state files exists.
 */
const operationInProgress = () => {
  const gitDir = git([
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
  ]).trim();
  return [
    "MERGE_HEAD",
    "rebase-merge",
    "rebase-apply",
    "CHERRY_PICK_HEAD",
    "REVERT_HEAD",
    "BISECT_LOG",
  ].some((name) => existsSync(join(gitDir, name)));
};

/**
 * Tells whether `main` is checked out in a linked worktree.
 * @returns {boolean} True when another worktree is on `main`; the first block, this checkout, is skipped.
 */
const mainInOtherWorktree = () =>
  git(["worktree", "list", "--porcelain"])
    .split("\n\n")
    .slice(1)
    .some((block) =>
      block.split("\n").includes(`branch refs/heads/${MAIN_BRANCH}`),
    );

/**
 * Fast-forwards the checked-out commit to origin/main.
 * @returns {string} The log text for the update.
 */
const fastForward = () => {
  const before = git(["rev-parse", "--short", "HEAD"]).trim();
  git(["merge", "--ff-only", "origin/main"]);
  const after = git(["rev-parse", "--short", "HEAD"]).trim();
  return `${before}..${after}`;
};

/**
 * Counts the commits that HEAD is behind origin/main.
 * @returns {string} The count as text.
 */
const behindCount = () =>
  git(["rev-list", "--count", "HEAD..origin/main"]).trim();

/**
 * Tells why the checkout must be left alone before anything is changed.
 * @returns {string} The reason; empty when the checkout may be updated.
 */
const blocker = () => {
  if (!isMainCheckout()) return "the folder is a linked worktree";
  if (operationInProgress())
    return "a merge, rebase, cherry-pick, revert or bisect is in progress";
  if (git(["status", "--porcelain"]).trim() !== "")
    return "the working tree has uncommitted changes";
  const branch = git(["branch", "--show-current"]).trim();
  if (branch && branch !== MAIN_BRANCH)
    return `the checkout is on branch '${branch}', not ${MAIN_BRANCH}`;
  if (!gitSucceeds(["merge-base", "--is-ancestor", "HEAD", "origin/main"]))
    return `${branch || "the detached HEAD"} has commits that origin/main lacks`;
  return "";
};

/**
 * Updates a checkout that is detached at an ancestor of origin/main.
 * @returns {string} One log line.
 */
const syncDetached = () => {
  if (mainInOtherWorktree()) {
    if (behindCount() === "0")
      return "up to date: detached at origin/main, main is in another worktree (or a stale worktree record, see git worktree prune)";
    return `fast-forwarded the detached HEAD ${fastForward()}, main is in another worktree (or a stale worktree record, see git worktree prune)`;
  }
  const mainRef = `refs/heads/${MAIN_BRANCH}`;
  if (!gitSucceeds(["rev-parse", "--verify", "--quiet", mainRef]))
    return "skipped: there is no local main branch, so the detached HEAD was left alone";
  if (!gitSucceeds(["merge-base", "--is-ancestor", mainRef, "origin/main"]))
    return "skipped: the detached HEAD was left alone because main has commits that origin/main lacks";
  git(["switch", MAIN_BRANCH]);
  const range = fastForward();
  const [from, to] = range.split("..");
  const result =
    from === to ? "already at origin/main" : `fast-forwarded ${range}`;
  return `switched from a detached HEAD to main (${result})`;
};

/**
 * Brings the main checkout up to date when that is safe.
 * @returns {string} One log line: what was done or why nothing was.
 */
const sync = () => {
  try {
    git(["fetch", "--quiet", "--prune", "origin"], FETCH_TIMEOUT_MS);
  } catch (error) {
    return `skipped: the fetch failed (${reasonOf(error)})`;
  }
  if (!gitSucceeds(["rev-parse", "--verify", "--quiet", "origin/main"]))
    return "skipped: origin/main does not exist";
  const reason = blocker();
  if (reason) return `skipped: ${reason}`;
  if (!git(["branch", "--show-current"]).trim()) return syncDetached();
  const behind = behindCount();
  if (behind === "0") return "up to date: main is at origin/main";
  return `fast-forwarded main ${fastForward()} (${behind} commit(s))`;
};

try {
  log(sync());
} catch (error) {
  log(`failed: ${reasonOf(error)}`);
}
