// SessionStart hook: deletes files older than the retention time from the git-ignored .playwright-mcp folder,
// then the folders that are left empty. Loose files in the root, which @playwright/mcp names and writes itself,
// have a shorter retention time. The cleanup runs silently and does nothing on any failure.
// With --collect <US-id|Task-id> --since <ISO time> it instead moves the loose root files that @playwright/mcp
// named itself (console-*, page-*) and that are newer than that time into the ticket's folder, and prints how many
// it moved and skipped. An invalid id or time, or a failure, prints an error and exits with 1.
import { lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_LOOSE_FILE_RETENTION_HOURS = 1;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TICKET_PATTERN = /^(US|Task)-\d+$/;
const PLAYWRIGHT_FILE_PATTERN = /^(console|page)-/;
const hooksDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.env.CLAUDE_PROJECT_DIR || join(hooksDir, '..', '..'), '.playwright-mcp');

/**
 * Reads a retention setting from clean-playwright-mcp.json.
 * @param {string} key - Name of the setting.
 * @param {number} fallback - Value used when the file is missing or the setting is not a positive number.
 * @returns {number} The setting, or the fallback.
 */
const loadSetting = (key, fallback) => {
  try {
    const value = JSON.parse(readFileSync(join(hooksDir, 'clean-playwright-mcp.json'), 'utf8'))?.[key];
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Reads the value that follows a command line option.
 * @param {string} name - Option name.
 * @returns {string | undefined} The value, or undefined when the option is missing.
 */
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

/**
 * Deletes one entry when it is an old file, or the folder when cleaning leaves it empty. A symbolic link is kept.
 * @param {string} path - Entry to clean.
 * @param {number} cutoff - Modification time in milliseconds before which a file is deleted.
 * @param {number} looseCutoff - Same, for the files directly in the root folder.
 * @param {{ files: number, bytes: number }} stats - Counters of the deleted files.
 * @returns {boolean} True when the entry is still there afterwards.
 */
function cleanEntry(path, cutoff, looseCutoff, stats) {
  const info = lstatSync(path);
  if (info.isSymbolicLink()) return true;
  if (info.isDirectory()) {
    if (!clean(path, cutoff, looseCutoff, stats)) return true;
    rmdirSync(path);
    return false;
  }
  if (info.mtimeMs >= (dirname(path) === root ? looseCutoff : cutoff)) return true;
  unlinkSync(path);
  stats.files++;
  stats.bytes += info.size;
  return false;
}

/**
 * Deletes the old files below a folder and the folders left empty. Symbolic links are never followed or deleted,
 * and nothing outside the cleaned root is touched.
 * @param {string} dir - Folder to clean.
 * @param {number} cutoff - Modification time in milliseconds before which a file is deleted.
 * @param {number} looseCutoff - Same, for the files directly in the root folder.
 * @param {{ files: number, bytes: number }} stats - Counters of the deleted files.
 * @returns {boolean} True when the folder holds nothing after the cleaning.
 */
function clean(dir, cutoff, looseCutoff, stats) {
  // Defence in depth: every path is built from root, and the lstat check in cleanEntry is the real symlink guard.
  if (dir !== root && !dir.startsWith(root + sep)) return false;
  let remaining = 0;
  for (const entry of readdirSync(dir)) {
    try {
      if (cleanEntry(join(dir, entry), cutoff, looseCutoff, stats)) remaining++;
    } catch {
      remaining++;
    }
  }
  return remaining === 0;
}

/**
 * Moves one loose root file into the ticket's folder when it is a file that @playwright/mcp named and that is new
 * enough. A symbolic link, a subfolder, a file that is not a Playwright output and an older file stay.
 * @param {string} entry - Name of the entry in the root folder.
 * @param {string} target - Ticket folder; it is created when needed.
 * @param {number} sinceMs - Only files modified at or after this time in milliseconds are moved.
 * @returns {'moved' | 'skipped' | 'ignored'} Skipped when the target is unusable or already holds an entry of that name.
 */
const moveLooseFile = (entry, target, sinceMs) => {
  const path = join(root, entry);
  const info = lstatSync(path);
  if (!info.isFile() || info.mtimeMs < sinceMs || !PLAYWRIGHT_FILE_PATTERN.test(entry)) return 'ignored';
  mkdirSync(target, { recursive: true });
  const destination = join(target, entry);
  if (!lstatSync(target).isDirectory() || lstatSync(destination, { throwIfNoEntry: false })) return 'skipped';
  renameSync(path, destination);
  return 'moved';
};

/**
 * Runs the --collect mode: moves the loose root files of the check into the ticket's folder.
 * @returns {number} Exit code: 0 when done, 1 for an invalid id or time or a failure.
 */
const runCollect = () => {
  const ticket = option('--collect');
  const sinceMs = Date.parse(option('--since') ?? '');
  if (!TICKET_PATTERN.test(ticket ?? '') || !Number.isFinite(sinceMs)) {
    console.error('Invalid --collect id (US-<n> or Task-<n>) or --since time (ISO). Nothing moved.');
    return 1;
  }
  const counts = { moved: 0, skipped: 0, ignored: 0 };
  try {
    if (lstatSync(root, { throwIfNoEntry: false })?.isDirectory()) {
      for (const entry of readdirSync(root)) {
        let result = 'skipped';
        try {
          result = moveLooseFile(entry, join(root, ticket), sinceMs);
        } catch (error) {
          // A file that cannot be moved, for example one that the browser still holds open, counts as skipped;
          // an entry that vanished meanwhile is not worth a note.
          if (error.code === 'ENOENT') result = 'ignored';
        }
        counts[result]++;
      }
    }
  } catch (error) {
    console.error(`Collecting failed: ${error.message}`);
    return 1;
  }
  const skippedNote = counts.skipped > 0 ? `, skipped ${counts.skipped}` : '';
  console.log(`Moved ${counts.moved} files to ${ticket}${skippedNote}.`);
  return 0;
};

/**
 * Runs the cleanup mode of the session start hook. It does nothing on any failure.
 */
const runCleanup = () => {
  try {
    if (!lstatSync(root).isDirectory()) return;
    const stats = { files: 0, bytes: 0 };
    const now = Date.now();
    const cutoff = now - loadSetting('retentionDays', DEFAULT_RETENTION_DAYS) * DAY_MS;
    const looseCutoff = now - loadSetting('looseFileRetentionHours', DEFAULT_LOOSE_FILE_RETENTION_HOURS) * HOUR_MS;
    clean(root, cutoff, looseCutoff, stats);
    if (process.argv.includes('--report')) {
      console.log(`Deleted ${stats.files} files, freed ${(stats.bytes / 1024 / 1024).toFixed(1)} MB.`);
    }
  } catch {
    // The hook never fails a session start.
  }
};

if (process.argv.includes('--collect')) {
  process.exitCode = runCollect();
} else {
  runCleanup();
}
