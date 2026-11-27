#!/usr/bin/env node
/**
 * Pre-filters the local Claude Code transcripts of MyCV into a short JSON excerpt for /improve-system.
 * The model reads only this excerpt, never the transcripts themselves.
 *
 * Usage: node extract.mjs [--since <ISO time>] [--until <ISO time>] [--projects-dir <dir>] [--repo <dir>] [--max <n>]
 * Without --since the window starts at `lastProcessed` in the state file (see state.mjs), or 30 days back.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readState } from './state.mjs';

const EXCERPT = 280;
const IDLE_CAP_MS = 10 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MAX = 120;
const LONG_PASTE = 2000;
const NEVER_GUARD = 'Blocked by the Never list';
/** A real block puts the guard's reason near the start of an error result; a file or test output that quotes it does not. */
const NEVER_GUARD_HEAD = 200;

/** A keyword must not follow a letter or digit, so `taas` does not match in the middle of a word such as `petaas`. */
const NOT_LETTER_BEFORE = String.raw`(?<![\p{L}\p{N}])`;

/**
 * Builds a case-insensitive Unicode regex from keyword stems. A stem matches at the start of a word and may be
 * followed by an inflection (Finnish endings), so `tausta` also finds `taustan` and `taustaa`.
 * @param {string[]} stems Word stems or short phrases.
 * @returns {RegExp} The regex.
 */
const stemRegex = (stems) => new RegExp(`${NOT_LETTER_BEFORE}(?:${stems.join('|')})`, 'giu');

/** Phrases that suggest the user corrects or repeats an earlier instruction. */
export const CORRECTION = stemRegex([
  'ei näin',
  'ei noin',
  'ei vaan',
  'tee uudelleen',
  'tee uudestaan',
  'tee se uudelleen',
  '(?<!en )muista',
  'taas',
  'jälleen',
  'vieläkään',
  'edelleenkään',
  'väärin',
  'väärä',
  'unohdit',
  'unohtui',
  'et tehnyt',
  'et lukenut',
  'miksi et',
  'miksi sinä',
  'älä ',
  'älkää',
  'pitäisi',
  'piti olla',
  'ei toimi',
  'ei toiminut',
  'sama virhe',
  'kuten sanoin',
  'sanoin jo',
  'remember to',
  'redo',
  "don't",
  'do not',
  'wrong',
  'still not',
  'not what i',
  'as i said',
  'you forgot',
]);

/** User interface vocabulary: background, motion, spacing, colour and components. */
export const UI_VOCABULARY = stemRegex([
  'tausta',
  'animaati',
  'animoi',
  'siirtym',
  'liuku',
  'häivy',
  'nopeu',
  'hidas',
  'hitaa',
  'nyki',
  'välkky',
  'väri',
  'varjo',
  'väli(?:t|n|en|stys|stykse)?(?![\\p{L}])',
  'marginaal',
  'padding',
  'tyhjä tila',
  'nappi',
  'napi',
  'painike',
  'mobiili',
  'puhelime',
  'teema',
  'tumma',
  'vaalea',
  'fontti',
  'kortti',
  'korti',
  'ikoni',
  'asettelu',
  'reunus',
  'kontrasti',
  'hover',
  'layout',
  'background',
  'animation',
  'transition',
  'colou?r',
  'shadow',
  'spacing',
  'margin',
  'button',
  'theme',
  'font',
  'gradient',
]);

/** Kickoff prompts and automated messages are not feedback, even when they use the same words. */
const NOT_FEEDBACK = [/^Act as /iu, /^Implement (?:User Story|Task) \d+/iu];

/** Messages that the app or another session wrote, not the user: they are skipped altogether. */
const AUTOMATED = [
  /^<(?:side-sessions-event|ci-monitor-event|task-notification|local-command-|command-message|bash-|user-memory)/u,
  /^Background \(from the session that started this one\)/u,
  /^\[Artifact comment sent to Claude\]/u,
  /^\[Request interrupted by user/u,
];

/**
 * Lists the transcript folders that belong to MyCV: the main checkout and every worktree.
 * @param {string} projectsDir The `~/.claude/projects` folder.
 * @returns {string[]} Absolute folder paths.
 */
export const projectFolders = (projectsDir) => {
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /(?:^|-)mycv(?:$|-)/iu.test(entry.name))
    .map((entry) => join(projectsDir, entry.name));
};

/**
 * Names the checkout of a transcript folder: `main` or the worktree's folder name.
 * @param {string} folder The transcript folder.
 * @returns {string} The checkout label.
 */
export const checkoutLabel = (folder) => {
  const match = /-claude-worktrees-(.+)$/iu.exec(folder);
  return match ? match[1] : 'main';
};

/**
 * Removes the system reminders and other injected blocks from a user message.
 * @param {string} text The raw text.
 * @returns {string} The text the user typed or pasted.
 */
export const cleanText = (text) =>
  text
    .replaceAll(/<system-reminder>[\s\S]*?<\/system-reminder>/gu, '')
    .replaceAll(/<ide_[a-z_]+>[\s\S]*?<\/ide_[a-z_]+>/gu, '')
    .trim();

/**
 * Reads the text of a user transcript line, or null when the line is a tool result, a meta line or a subagent's.
 * @param {object} line A parsed transcript line.
 * @returns {string | null} The user's text.
 */
export const userText = (line) => {
  if (line.type !== 'user' || line.isSidechain || line.isMeta || line.isCompactSummary) return null;
  const content = line.message?.content;
  if (typeof content === 'string') return cleanText(content) || null;
  if (!Array.isArray(content) || content.some((part) => part.type === 'tool_result')) return null;
  const text = content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
  return cleanText(text) || null;
};

/**
 * Shortens a text to one line of at most `max` characters.
 * @param {string} text The text.
 * @param {number} [max] The length limit.
 * @returns {string} The excerpt.
 */
export const excerpt = (text, max = EXCERPT) => {
  const flat = text.replaceAll(/\s+/gu, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/**
 * Finds the distinct keywords of a regex in a text, in lower case.
 * @param {RegExp} regex A global regex.
 * @param {string} text The text.
 * @returns {string[]} The matched keywords.
 */
const keywords = (regex, text) => [...new Set([...text.matchAll(regex)].map((m) => m[0].trim().toLowerCase()))];

/**
 * Removes pasted blocks, so a long paste does not count as feedback.
 * @param {string} text The user's text.
 * @returns {string} The typed part.
 */
const typedPart = (text) => text.replaceAll(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>/gu, ' ');

/**
 * Removes quoted text, so words the user quotes from Claude or an error message do not count as their own.
 * @param {string} text The typed text.
 * @returns {string} The text without quotes.
 */
const unquoted = (text) => text.replaceAll(/["“”][^"“”]{0,400}["“”]/gu, ' ');

/**
 * Classifies a user message.
 * @param {string} text The user's text.
 * @returns {{ correction: string[], ui: string[], feedback: boolean }} The matched correction and UI keywords.
 */
export const classify = (text) => {
  const typed = typedPart(text);
  const feedback = typed.length <= LONG_PASTE && !NOT_FEEDBACK.some((pattern) => pattern.test(typed.trim()));
  if (!feedback) return { correction: [], ui: [], feedback };
  const own = unquoted(typed);
  return { correction: keywords(CORRECTION, own), ui: keywords(UI_VOCABULARY, own), feedback };
};

/**
 * Finds the pasted blocks of a user message: `<pasted_content>` tags, or the whole text when it is very long.
 * @param {string} text The user's text.
 * @returns {string[]} The pasted texts.
 */
export const pastedBlocks = (text) => {
  const blocks = [...text.matchAll(/<pasted_content[^>]*>([\s\S]*?)<\/pasted_content[^>]*>/gu)].map((m) =>
    m[1].trim(),
  );
  if (blocks.length > 0) return blocks;
  return text.length > LONG_PASTE ? [text] : [];
};

/**
 * Normalises a prompt for similarity: lower case, ids and numbers replaced, punctuation removed.
 * @param {string} text The prompt.
 * @returns {Set<string>} Its words.
 */
export const promptWords = (text) =>
  new Set(
    text
      .toLowerCase()
      .replaceAll(/\d+/gu, '#')
      .replaceAll(/[^\p{L}#\s]/gu, ' ')
      .split(/\s+/u)
      .filter((word) => word.length > 1),
  );

/**
 * Jaccard similarity of two word sets.
 * @param {Set<string>} a First set.
 * @param {Set<string>} b Second set.
 * @returns {number} 0..1.
 */
export const similarity = (a, b) => {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
};

/**
 * Normalises a tool's file path to a repository-relative path with forward slashes.
 * @param {string} path The path from the tool input.
 * @returns {string} The relative path, or the input when it is not inside a MyCV checkout.
 */
export const repoPath = (path) => {
  const slashed = path.replaceAll('\\', '/');
  const worktree = /\/\.claude\/worktrees\/[^/]+\/(.+)$/u.exec(slashed);
  if (worktree) return worktree[1];
  const main = /\/MyCV\/(.+)$/iu.exec(slashed);
  return main ? main[1] : slashed;
};

/**
 * Reads the text of a tool result.
 * @param {object} part A `tool_result` content part.
 * @returns {string} The text.
 */
const resultText = (part) => {
  if (typeof part.content === 'string') return part.content;
  if (!Array.isArray(part.content)) return '';
  return part.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
};

/**
 * Parses a JSONL transcript, skipping broken lines.
 * @param {string} file The file path.
 * @returns {object[]} The lines.
 */
const readLines = (file) => {
  const lines = [];
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim()) continue;
    try {
      lines.push(JSON.parse(raw));
    } catch {
      /* A line that is still being written is skipped. */
    }
  }
  return lines;
};

/**
 * Collects what one session says about tool use: edited frontend files, Never guard blocks, skill and
 * instruction file use.
 * @param {object} line A parsed assistant or user line.
 * @param {object} session The session accumulator.
 */
const collectTools = (line, session) => {
  const content = line.message?.content;
  if (!Array.isArray(content)) return;
  for (const part of content) {
    if (part.type === 'tool_use') collectToolUse(part, line, session);
    if (part.type === 'tool_result' && isNeverGuardBlock(part)) {
      const use = session.toolUses.get(part.tool_use_id);
      session.neverGuard.push({
        date: line.timestamp,
        reason: excerpt(resultText(part).slice(resultText(part).indexOf(NEVER_GUARD)), 200),
        command: use ? excerpt(String(use.input?.command ?? ''), 160) : '',
      });
    }
  }
};

/**
 * Tells a real Never guard block from a result that only quotes the guard (reading its source or test output).
 * @param {object} part A `tool_result` content part.
 * @returns {boolean} True for a block.
 */
export const isNeverGuardBlock = (part) => {
  if (part.is_error !== true) return false;
  const at = resultText(part).indexOf(NEVER_GUARD);
  return at >= 0 && at < NEVER_GUARD_HEAD;
};

/**
 * Records one tool call.
 * @param {object} part The `tool_use` part.
 * @param {object} line The transcript line.
 * @param {object} session The session accumulator.
 */
const collectToolUse = (part, line, session) => {
  session.toolUses.set(part.id, part);
  const input = part.input ?? {};
  if (part.name === 'Skill' && input.skill) session.skills.push(String(input.skill));
  const path = input.file_path ?? input.notebook_path;
  if (typeof path !== 'string') return;
  const relativePath = repoPath(path);
  if (['Edit', 'Write', 'MultiEdit'].includes(part.name) && relativePath.startsWith('src/Frontend/')) {
    session.frontendEdits.push({ at: line.timestamp, path: relativePath });
  }
  if (part.name === 'Read') session.reads.push(relativePath);
};

/**
 * Creates an empty session accumulator.
 * @param {string} id The session id.
 * @param {string} checkout The checkout label.
 * @returns {object} The accumulator.
 */
const newSession = (id, checkout) => ({
  id,
  checkout,
  title: '',
  branch: '',
  times: [],
  first: Infinity,
  last: -Infinity,
  messages: [],
  toolUses: new Map(),
  neverGuard: [],
  frontendEdits: [],
  skills: [],
  commands: [],
  reads: [],
});

/**
 * Reads one transcript into a session accumulator, keeping only lines inside the window.
 * @param {string} file The transcript file.
 * @param {string} checkout The checkout label.
 * @param {{ since: number, until: number }} window The time window in milliseconds.
 * @returns {object | null} The session, or null when nothing falls inside the window.
 */
export const readSession = (file, checkout, window) => {
  const lines = readLines(file);
  const session = newSession(lines.find((l) => l.sessionId)?.sessionId ?? file, checkout);
  for (const line of lines) {
    if (line.type === 'custom-title' || line.type === 'ai-title') session.title ||= line.customTitle ?? line.aiTitle ?? '';
    const at = Date.parse(line.timestamp ?? '');
    if (Number.isNaN(at) || at <= window.since || at > window.until) continue;
    if (line.isSidechain) continue;
    session.times.push(at);
    session.first = Math.min(session.first, at);
    session.last = Math.max(session.last, at);
    if (line.gitBranch) session.branch = line.gitBranch;
    collectTools(line, session);
    const text = userText(line);
    if (text) addMessage(session, text, line.timestamp);
  }
  return session.times.length > 0 ? session : null;
};

/**
 * Adds a user message, or a slash command, to the session.
 * @param {object} session The session accumulator.
 * @param {string} text The user's text.
 * @param {string} timestamp The line's timestamp.
 */
const addMessage = (session, text, timestamp) => {
  const command = /<command-name>\/?([^<]+)<\/command-name>/u.exec(text);
  if (command) {
    session.commands.push(command[1].trim());
    return;
  }
  if (AUTOMATED.some((pattern) => pattern.test(text))) return;
  session.messages.push({ at: timestamp, text });
};

/**
 * Sums the active time of a session: gaps between events, each capped at ten minutes.
 * @param {number[]} times Event times in milliseconds.
 * @returns {number} Active minutes.
 */
export const activeMinutes = (times) => {
  const sorted = [...times].sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < sorted.length; i += 1) total += Math.min(sorted[i] - sorted[i - 1], IDLE_CAP_MS);
  return Math.round(total / 60000);
};

/**
 * Builds the feedback entries (corrections and UI feedback) of one session. A UI entry names the `src/Frontend`
 * files edited after the message and before the user's next message, so the files belong to that feedback.
 * @param {object} session The session.
 * @returns {object[]} The entries.
 */
const feedbackEntries = (session) => {
  const entries = [];
  for (const [index, message] of session.messages.entries()) {
    const kinds = classify(message.text);
    if (kinds.correction.length === 0 && kinds.ui.length === 0) continue;
    const from = Date.parse(message.at);
    const to = Date.parse(session.messages[index + 1]?.at ?? '') || Infinity;
    const after = session.frontendEdits
      .filter((edit) => Date.parse(edit.at) >= from && Date.parse(edit.at) < to)
      .map((edit) => edit.path);
    entries.push({
      session: shortId(session.id),
      date: message.at,
      category: kinds.ui.length > 0 ? 'ui' : 'correction',
      text: excerpt(typedPart(message.text)),
      correction: kinds.correction,
      ui: kinds.ui,
      frontendFiles: kinds.ui.length > 0 ? [...new Set(after)].slice(0, 10) : [],
    });
  }
  return entries;
};

/**
 * Groups similar short prompts that recur in more than one session.
 * @param {object[]} sessions The sessions.
 * @returns {object[]} The groups, most frequent first.
 */
export const repeatedPrompts = (sessions) => {
  const groups = [];
  for (const session of sessions) {
    for (const message of session.messages) {
      const typed = typedPart(message.text).trim();
      if (typed.length < 8 || typed.length > 600) continue;
      const words = promptWords(typed);
      if (words.size < 2) continue;
      const group = groups.find((g) => similarity(g.words, words) >= 0.7);
      if (group) {
        group.count += 1;
        group.sessions.add(session.id);
        group.dates.push(message.at);
      } else {
        groups.push({ words, text: excerpt(typed, 200), count: 1, sessions: new Set([session.id]), dates: [message.at] });
      }
    }
  }
  return groups
    .filter((g) => g.sessions.size > 1)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({ text: g.text, count: g.count, sessions: g.sessions.size, lastDate: g.dates.sort().at(-1) }));
};

/**
 * Groups pasted texts by their content hash.
 * @param {object[]} sessions The sessions.
 * @returns {object[]} The pastes, most repeated first.
 */
export const pastedContent = (sessions) => {
  const byHash = new Map();
  for (const session of sessions) {
    for (const message of session.messages) {
      /* A pasted kickoff prompt restarts a work item after /clear or /handoff: it is the workflow, not missing context. */
      for (const block of pastedBlocks(message.text).filter((b) => !NOT_FEEDBACK.some((p) => p.test(b)))) {
        const hash = createHash('sha256').update(block.replaceAll(/\s+/gu, ' ')).digest('hex').slice(0, 12);
        const entry = byHash.get(hash) ?? { hash, length: block.length, head: excerpt(block, 90), count: 0, sessions: new Set() };
        entry.count += 1;
        entry.sessions.add(session.id);
        byHash.set(hash, entry);
      }
    }
  }
  return [...byHash.values()]
    .sort((a, b) => b.count - a.count || b.length - a.length)
    .map((entry) => ({ ...entry, sessions: entry.sessions.size }));
};

/**
 * Counts items.
 * @param {string[]} items The items.
 * @returns {Record<string, number>} Counts, most frequent first.
 */
const countBy = (items) => {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
};

/**
 * Lists the project skills that `.gitignore` tracks.
 * @param {string} repo The repository root.
 * @returns {string[]} Skill folder names.
 */
const trackedSkills = (repo) => {
  const gitignore = join(repo, '.gitignore');
  if (!existsSync(gitignore)) return [];
  return [...readFileSync(gitignore, 'utf8').matchAll(/^!\.claude\/skills\/([^/\s]+)\/$/gmu)].map((m) => m[1]);
};

/**
 * Lists every Markdown file under a folder.
 * @param {string} folder The folder.
 * @returns {string[]} Absolute paths.
 */
const markdownFiles = (folder) => {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
};

/**
 * Tells whether Claude Code loads an instruction file by itself: `CLAUDE.md` at the start of every session and
 * `.claude/rules/*` when a matching file is read. Such a file is used without a Read call.
 * @param {string} path The repository-relative path.
 * @returns {boolean} True when the file loads automatically.
 */
const isAutoLoaded = (path) => path === 'CLAUDE.md' || path.startsWith('.claude/rules/');

/**
 * Names the skill whose `SKILL.md` a path is, so its invocations count as uses.
 * @param {string} path The repository-relative path.
 * @returns {string | null} The skill name.
 */
const skillOf = (path) => /^\.claude\/skills\/([^/]+)\/SKILL\.md$/u.exec(path)?.[1] ?? null;

/**
 * Counts how often each instruction file was used in the window, so unused instructions can be pruned. A use is a
 * Read call, and for a skill's `SKILL.md` also a Skill tool call or a typed slash command. Automatically loaded
 * files (`autoLoaded: true`) are never pruning candidates, whatever their count.
 * @param {string} repo The repository root.
 * @param {object[]} sessions The sessions.
 * @returns {object[]} `{ path, reads, autoLoaded }`, least used first, automatically loaded files last.
 */
export const instructionUse = (repo, sessions) => {
  const files = [
    join(repo, 'CLAUDE.md'),
    join(repo, 'DESIGN.md'),
    ...markdownFiles(join(repo, '.claude', 'rules')),
    ...trackedSkills(repo).flatMap((skill) => markdownFiles(join(repo, '.claude', 'skills', skill))),
  ].filter((file) => existsSync(file));
  const reads = countBy(sessions.flatMap((s) => s.reads));
  /* `plugin:skill` and `skill args` both name the skill by their last plain word. */
  const invocations = countBy(
    sessions.flatMap((s) => [...s.skills, ...s.commands]).map((name) => name.split(':').at(-1).split(/\s/u)[0]),
  );
  return files
    .map((file) => relative(repo, file).replaceAll('\\', '/'))
    .map((path) => ({
      path,
      reads: (reads[path] ?? 0) + (invocations[skillOf(path)] ?? 0),
      autoLoaded: isAutoLoaded(path),
    }))
    .sort((a, b) => Number(a.autoLoaded) - Number(b.autoLoaded) || a.reads - b.reads);
};

/**
 * Shortens a session id for the excerpt.
 * @param {string} id The session id.
 * @returns {string} Its first eight characters.
 */
export const shortId = (id) => String(id).slice(0, 8);

/**
 * Groups the sessions by branch (the work item), so the most time-consuming kinds of work stand out.
 * Sessions on `main` or without a branch are grouped by their title.
 * @param {object[]} sessions The sessions.
 * @returns {object[]} `{ branch, title, checkouts, sessions, activeMinutes, userMessages, firstStart }`, most minutes
 *   first. `checkouts` names the checkouts (`main` or worktree folders) the work ran in.
 */
export const workByBranch = (sessions) => {
  const groups = new Map();
  for (const session of sessions) {
    const onMain = !session.branch || session.branch === 'main' || session.branch === 'HEAD';
    const key = onMain ? `main: ${excerpt(session.title || typedPart(session.messages[0]?.text ?? ''), 60)}` : session.branch;
    const group = groups.get(key) ?? {
      branch: key,
      title: '',
      checkouts: [],
      sessions: 0,
      activeMinutes: 0,
      userMessages: 0,
      firstStart: '',
    };
    const start = new Date(session.first).toISOString();
    group.title ||= excerpt(session.title, 80);
    if (!group.checkouts.includes(session.checkout)) group.checkouts.push(session.checkout);
    group.sessions += 1;
    group.activeMinutes += activeMinutes(session.times);
    group.userMessages += session.messages.length;
    if (!group.firstStart || start < group.firstStart) group.firstStart = start;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.activeMinutes - a.activeMinutes);
};

/**
 * Builds the excerpt from the sessions inside the window.
 * @param {object[]} sessions The sessions.
 * @param {{ since: number, until: number, repo: string, max: number }} options The window and limits.
 * @returns {object} The excerpt.
 */
export const buildExcerpt = (sessions, { since, until, repo, max }) => {
  const feedback = sessions.flatMap(feedbackEntries);
  const latest = sessions.reduce((max, s) => Math.max(max, s.last), since);
  return {
    window: { since: new Date(since).toISOString(), until: new Date(Math.min(latest, until)).toISOString() },
    counts: {
      sessions: sessions.length,
      userMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      corrections: feedback.filter((f) => f.category === 'correction').length,
      ui: feedback.filter((f) => f.category === 'ui').length,
      neverGuard: sessions.reduce((sum, s) => sum + s.neverGuard.length, 0),
    },
    work: workByBranch(sessions).slice(0, Math.ceil(max / 3)),
    uiFeedback: feedback.filter((f) => f.category === 'ui').slice(-max),
    corrections: feedback.filter((f) => f.category === 'correction').slice(-max),
    repeatedPrompts: repeatedPrompts(sessions).slice(0, max),
    pastedContent: pastedContent(sessions)
      .filter((p) => p.count > 1 || p.length > LONG_PASTE * 3)
      .slice(0, Math.ceil(max / 4)),
    neverGuard: sessions.flatMap((s) => s.neverGuard.map((n) => ({ session: shortId(s.id), ...n }))).slice(-max),
    commands: countBy(sessions.flatMap((s) => s.commands)),
    skills: countBy(sessions.flatMap((s) => s.skills)),
    instructionUse: instructionUse(repo, sessions),
  };
};

/**
 * Parses the command line.
 * @param {string[]} argv The arguments after the script name.
 * @returns {Record<string, string>} The options.
 */
export const parseArgs = (argv) => {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const next = argv[i + 1];
      const hasValue = next !== undefined && !next.startsWith('--');
      options[argv[i].slice(2)] = hasValue ? next : 'true';
      if (hasValue) i += 1;
    }
  }
  return options;
};

/**
 * Decides where the window starts: --since, else the state's lastProcessed, else 30 days back.
 * @param {Record<string, string>} options The options.
 * @param {number} now The current time in milliseconds.
 * @returns {number} The start in milliseconds.
 */
export const windowStart = (options, now) => {
  const explicit = Date.parse(options.since ?? '');
  if (!Number.isNaN(explicit)) return explicit;
  const stored = Date.parse(readState().lastProcessed ?? '');
  if (!Number.isNaN(stored)) return stored;
  return now - DEFAULT_WINDOW_DAYS * 86400000;
};

/**
 * Reads the --max option: a positive whole number, else the default 120.
 * @param {string | undefined} value The option value.
 * @returns {number} The limit.
 */
export const parseMax = (value) => {
  const max = Number.parseInt(value ?? '', 10);
  return Number.isInteger(max) && max > 0 ? max : DEFAULT_MAX;
};

/**
 * Runs the extraction.
 * @param {string[]} argv The arguments.
 * @returns {object} The excerpt.
 */
export const run = (argv) => {
  if (process.env.CLAUDE_CODE_REMOTE === 'true') {
    return { cloud: true, note: 'Cloud session: no local transcripts. Use the Azure DevOps sources only.' };
  }
  const options = parseArgs(argv);
  const now = Date.now();
  const since = windowStart(options, now);
  const until = Number.isNaN(Date.parse(options.until ?? '')) ? now : Date.parse(options.until);
  const projectsDir = options['projects-dir'] ?? join(homedir(), '.claude', 'projects');
  const repo = options.repo ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  const max = parseMax(options.max);
  const sessions = [];
  for (const folder of projectFolders(projectsDir)) {
    for (const name of readdirSync(folder).filter((n) => n.endsWith('.jsonl'))) {
      const file = join(folder, name);
      if (statSync(file).mtimeMs <= since) continue;
      const session = readSession(file, checkoutLabel(folder), { since, until });
      if (session) sessions.push(session);
    }
  }
  return buildExcerpt(sessions, { since, until, repo, max });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(run(process.argv.slice(2)), null, 1)}\n`);
}
