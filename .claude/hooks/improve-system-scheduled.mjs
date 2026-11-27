// Scheduled script (not a Claude Code hook): once a week runs `claude -p "/improve-system --scheduled"` in the main
// checkout, which writes a report of recurring problems into %LOCALAPPDATA%\MyCV\improve-system\ and records it in
// the skill's state, so the next session start can remind the user to go through it (improve-system-reminder.mjs).
// Usage: node improve-system-scheduled.mjs [repository folder]; the folder defaults to the one that holds this
// script's `.claude` folder.
// The run is skipped, with the reason in the log, when the weekly usage has reached the warning limit of
// usage-budget.json or when it is a cloud session. Claude gets read tools, the Azure DevOps read tools, the skill's
// own scripts and the right to edit and write inside the report folder only (`--permission-mode dontAsk` denies the rest, so
// no prompt can stall the run); it changes no tracked file, writes no ideas page, creates no work item and pushes
// nothing. The script itself writes only the log and always ends with exit code 0.
// One line per run goes to <report folder>\scheduled.log, at most 100 lines: `<ISO time> <ran|skipped|failed>: <why>`.
// IMPROVE_SYSTEM_DIR overrides the folder (the skill's scripts use it too), IMPROVE_SYSTEM_CLAUDE the claude executable
// and IMPROVE_SYSTEM_CLAUDE_ARGS (a JSON array) the arguments put before the real ones (tests use these three),
// IMPROVE_SYSTEM_TIMEOUT_MS the time limit of the run.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readState,
  stateDir,
} from "../skills/improve-system/scripts/state.mjs";
import {
  budgetWarning,
  loadConfig,
  loadSnapshot,
} from "./usage-budget-core.mjs";

const DEFAULT_TIMEOUT_MS = 45 * 60_000;
const MAX_LOG_LINES = 100;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const repoDir = resolve(
  process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
);
const AZURE_READ_TOOLS = [
  "wit_work_item",
  "wit_query",
  "wit_backlog",
  "repo_pull_request",
  "repo_pull_request_thread",
  "repo_repository",
  "repo_search_commits",
].map((name) => `mcp__azure-devops__${name}`);

/**
 * Names why a command failed, for the log.
 * @param {unknown} error - The error thrown by the command.
 * @returns {string} The first non-empty line of the error message, else of its error output.
 */
const reasonOf = (error) => {
  const text = [
    error?.code === "ETIMEDOUT" ? "timed out" : "",
    error?.message,
    error?.stderr,
  ]
    .map((part) => String(part ?? "").trim())
    .find(Boolean);
  return text ? text.split("\n")[0].slice(0, 300) : "unknown error";
};

/**
 * Appends one line to the log and keeps only the last lines. A log failure is ignored.
 * @param {"ran" | "skipped" | "failed"} status - How the run ended.
 * @param {string} message - What the run did or why it did nothing.
 */
const log = (status, message) => {
  try {
    const path = join(stateDir(), "scheduled.log");
    mkdirSync(dirname(path), { recursive: true });
    const old = existsSync(path)
      ? readFileSync(path, "utf8").split("\n").filter(Boolean)
      : [];
    const line = `${new Date().toISOString()} ${status}: ${message}`;
    writeFileSync(path, `${[...old, line].slice(-MAX_LOG_LINES).join("\n")}\n`);
  } catch {
    // The log is optional; the run has done its work either way.
  }
};

/**
 * Turns an absolute path into the form a path permission rule reads: forward slashes, and `//` in front of a POSIX
 * path (checked with `claude -p` on Windows: `Edit(C:/dir/**)` allows the folder and nothing outside it).
 * @param {string} path - An absolute path.
 * @returns {string} The rule path.
 */
const rulePath = (path) => {
  const unix = path.replaceAll("\\", "/");
  return unix.startsWith("/") ? `/${unix}` : unix;
};

/**
 * Tells why the run must be skipped.
 * @returns {string} The reason; empty when the run may start.
 */
const skipReason = () => {
  if (process.env.CLAUDE_CODE_REMOTE === "true")
    return "this is a cloud session";
  const snapshot = loadSnapshot();
  if (!snapshot) return "";
  const warning = budgetWarning(
    snapshot.usedPercentage,
    snapshot.resetsAt,
    Date.now() / 1000,
    loadConfig(),
  );
  return warning
    ? `the weekly usage is at the warning limit (${warning.level}, ${Math.round(snapshot.usedPercentage)} % used)`
    : "";
};

/**
 * Maps each pending report that exists to its last modification time.
 * @returns {Map<string, number>} The report path and its modification time in milliseconds.
 */
const pendingSnapshot = () => {
  const reports = new Map();
  for (const path of readState().pendingReports ?? []) {
    try {
      reports.set(path, statSync(path).mtimeMs);
    } catch {
      reports.set(path, -1);
    }
  }
  return reports;
};

/**
 * Runs the analysis with the limited tool set.
 */
const runAnalysis = () => {
  const dir = stateDir();
  mkdirSync(dir, { recursive: true });
  const allowed = [
    "Read",
    "Glob",
    "Grep",
    "Bash(node .claude/skills/improve-system/scripts/*)",
    `Edit(${rulePath(resolve(dir))}/**)`,
    ...AZURE_READ_TOOLS,
  ];
  const before = pendingSnapshot();
  const output = execFileSync(
    process.env.IMPROVE_SYSTEM_CLAUDE || "claude",
    [
      ...JSON.parse(process.env.IMPROVE_SYSTEM_CLAUDE_ARGS || "[]"),
      "-p",
      "/improve-system --scheduled",
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      allowed.join(","),
      "--append-system-prompt",
      `This is the unattended scheduled run: ask nothing and change no file outside ${dir}. Write the run file there too (run-<yyyy-MM-dd>.json), not to a scratchpad.`,
    ],
    {
      cwd: repoDir,
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_BYTES,
      timeout:
        Number(process.env.IMPROVE_SYSTEM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const added = [...pendingSnapshot()]
    .filter(([path, modified]) => before.get(path) !== modified)
    .map(([path]) => path);
  if (added.length > 0) {
    log(
      "ran",
      `a report was written: ${added.map((path) => path.split(/[\\/]/).pop()).join(", ")}`,
    );
  } else {
    log(
      "failed",
      `the run ended but no new report is pending; it said: ${String(output).trim().slice(-200).replaceAll(/\s+/g, " ")}`,
    );
  }
};

try {
  const reason = skipReason();
  if (reason) log("skipped", reason);
  else runAnalysis();
} catch (error) {
  log("failed", reasonOf(error));
}
