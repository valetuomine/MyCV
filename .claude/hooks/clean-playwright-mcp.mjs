// SessionStart hook: deletes files older than the retention time from the git-ignored .playwright-mcp folder,
// then the folders that are left empty. It runs silently and does nothing on any failure.
import { lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_RETENTION_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const hooksDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.env.CLAUDE_PROJECT_DIR || join(hooksDir, '..', '..'), '.playwright-mcp');

/**
 * Reads the retention time from clean-playwright-mcp.json.
 * @returns {number} Days to keep a file, the default when the file is missing or the value is not a positive number.
 */
const loadRetentionDays = () => {
  try {
    const days = JSON.parse(readFileSync(join(hooksDir, 'clean-playwright-mcp.json'), 'utf8'))?.retentionDays;
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
  } catch {
    return DEFAULT_RETENTION_DAYS;
  }
};

/**
 * Deletes the old files below a folder and the folders left empty. Symbolic links are never followed or deleted,
 * and nothing outside the cleaned root is touched.
 * @param {string} dir Folder to clean.
 * @param {number} cutoff Modification time in milliseconds before which a file is deleted.
 * @param {{ files: number, bytes: number }} stats Counters of the deleted files.
 * @returns {boolean} True when the folder holds nothing after the cleaning.
 */
const clean = (dir, cutoff, stats) => {
  // Defence in depth: every path is built from root, and the lstat check below is the real symlink guard.
  if (dir !== root && !dir.startsWith(root + sep)) return false;
  let remaining = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    try {
      const info = lstatSync(path);
      if (info.isSymbolicLink()) {
        remaining++;
      } else if (info.isDirectory()) {
        if (clean(path, cutoff, stats)) rmdirSync(path);
        else remaining++;
      } else if (info.mtimeMs < cutoff) {
        unlinkSync(path);
        stats.files++;
        stats.bytes += info.size;
      } else {
        remaining++;
      }
    } catch {
      remaining++;
    }
  }
  return remaining === 0;
};

try {
  if (lstatSync(root).isDirectory()) {
    const stats = { files: 0, bytes: 0 };
    clean(root, Date.now() - loadRetentionDays() * DAY_MS, stats);
    if (process.argv.includes('--report')) {
      console.log(`Deleted ${stats.files} files, freed ${(stats.bytes / 1024 / 1024).toFixed(1)} MB.`);
    }
  }
} catch {
  process.exit(0);
}
