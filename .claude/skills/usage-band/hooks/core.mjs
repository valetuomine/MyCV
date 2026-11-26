// Shared by the usage-band plugin (register.tsx) and the scripts in .claude/hooks/: the cumulative daily
// limit and the budget and context warnings. Pure functions only, with no Node imports, because the
// plugin runs without Node; each caller reads its own settings files and keeps its own markers.

const DAY_SECONDS = 86400;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_SHARE = 14;
const DEFAULT_MARGIN = 3;
const CONTEXT_DEFAULTS = { warnTokens: 150000, stopTokens: 200000, repeatEveryTokens: 25000 };

/**
 * Checks that a value is a finite non-negative number.
 * @param {unknown} value The value to check.
 * @returns {value is number} True when the value is a usable percentage or time.
 */
export const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Checks that a value is a finite positive number.
 * @param {unknown} value The value to check.
 * @returns {value is number} True for usable token limits.
 */
const isPositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Reads the parsed usage-budget.json; a missing object or a bad value falls back to the defaults.
 * @param {any} raw The parsed settings, or anything else when the file was missing or bad.
 * @returns {{shares: number[], margin: number}} Daily shares indexed by weekday (0 = Sunday) and the warning margin.
 */
export const parseBudgetConfig = (raw) => {
  const settings = raw && typeof raw === 'object' ? raw : {};
  const shares = WEEKDAYS.map((day) =>
    isNonNegativeNumber(settings.dailyShare?.[day]) ? settings.dailyShare[day] : DEFAULT_SHARE,
  );
  const margin = isNonNegativeNumber(settings.warningMargin) ? settings.warningMargin : DEFAULT_MARGIN;
  return { shares, margin };
};

/**
 * Computes the cumulative limit for the current day of the usage week.
 * The week starts at `resetsAt` minus seven days and each day lasts 24 hours from that moment.
 * @param {number} resetsAt The Unix time in seconds when the week resets.
 * @param {number} nowSeconds The current Unix time in seconds.
 * @param {number[]} shares Daily shares indexed by weekday (0 = Sunday).
 * @returns {{dayIndex: number, limit: number}} The day of the week (0-6) and the limit in percent, capped at 100.
 */
export const computeLimit = (resetsAt, nowSeconds, shares) => {
  const start = resetsAt - 7 * DAY_SECONDS;
  const dayIndex = Math.min(6, Math.max(0, Math.floor((nowSeconds - start) / DAY_SECONDS)));
  const firstDay = new Date(start * 1000).getDay();
  let limit = 0;
  for (let i = 0; i <= dayIndex; i++) limit += shares[(firstDay + i) % 7];
  return { dayIndex, limit: Math.min(100, limit) };
};

/**
 * Decides which weekly budget warning applies now. The caller shows the warning once a day by claiming
 * a marker named `<key>-<level>`; an `over` warning also claims `<key>-near`.
 * @param {number} usedPercentage The seven-day usage percentage.
 * @param {number} resetsAt The Unix time in seconds when the week resets.
 * @param {number} nowSeconds The current Unix time in seconds.
 * @param {{shares: number[], margin: number}} config The budget settings.
 * @returns {{level: 'over' | 'near', key: string, text: string} | null} The warning, or null below the margin or after the reset.
 */
export const budgetWarning = (usedPercentage, resetsAt, nowSeconds, config) => {
  if (resetsAt <= nowSeconds) return null;
  const { dayIndex, limit } = computeLimit(resetsAt, nowSeconds, config.shares);
  const used = Math.round(usedPercentage);
  const key = `${Math.round(resetsAt / 3600)}-${dayIndex}`;
  if (usedPercentage >= limit) {
    return {
      level: 'over',
      key,
      text: `Viikkobudjetti: käyttö ${used} % saavuttaa tai ylittää tämän päivän rajan ${Math.round(limit)} %.`,
    };
  }
  if (usedPercentage >= limit - config.margin) {
    return { level: 'near', key, text: `Viikkobudjetti: käyttö ${used} %, tämän päivän raja ${Math.round(limit)} % lähestyy.` };
  }
  return null;
};

/**
 * Reads the parsed context-budget.json; a missing object, a bad value or warnTokens at or above
 * stopTokens falls back to the defaults.
 * @param {any} raw The parsed settings, or anything else when the file was missing or bad.
 * @returns {{warnTokens: number, stopTokens: number, repeatEveryTokens: number}} The limits.
 */
export const parseContextLimits = (raw) => {
  const settings = raw && typeof raw === 'object' ? raw : {};
  /**
   * Picks a configured limit, or its default when the value is unusable.
   * @param {'warnTokens' | 'stopTokens' | 'repeatEveryTokens'} key The setting name.
   * @returns {number} The limit.
   */
  const pick = (key) => (isPositive(settings[key]) ? settings[key] : CONTEXT_DEFAULTS[key]);
  const limits = { warnTokens: pick('warnTokens'), stopTokens: pick('stopTokens'), repeatEveryTokens: pick('repeatEveryTokens') };
  return limits.warnTokens < limits.stopTokens ? limits : { ...CONTEXT_DEFAULTS };
};

/**
 * Formats a token count as thousands, e.g. 182k.
 * @param {number} tokens The token count.
 * @returns {string} The text.
 */
export const kilo = (tokens) => `${Math.round(tokens / 1000)}k`;

/**
 * Builds the reason shown when a message is blocked over stopTokens.
 * @param {number} tokens The context size.
 * @param {number} stopTokens The stop limit.
 * @returns {string} The reason.
 */
export const contextStopReason = (tokens, stopTokens) =>
  `Konteksti on ${kilo(tokens)} tokenia (raja ${kilo(stopTokens)}). Aja /handoff ja jatka työtä uudessa chatissa annetulla aloitusviestillä. /-komennot (/handoff, /compact, /clear) sallitaan.`;

/**
 * Builds the warning shown once over warnTokens.
 * @param {number} tokens The context size.
 * @param {number} stopTokens The stop limit.
 * @returns {string} The warning.
 */
export const contextWarning = (tokens, stopTokens) =>
  `Konteksti on ${kilo(tokens)} tokenia. Rajalla ${kilo(stopTokens)} työ pitää jatkaa uudessa chatissa /handoff-skillin kautta.`;

/**
 * Finds the work item that the first message of a chat names: `US-<id>`, `Task-<id>`, `User Story <id>` or `Task <id>`.
 * @param {string} text The message text.
 * @returns {{label: string, id: string} | null} The earliest mention, with `US-<id>` or `Task-<id>` as the label, or null when none.
 */
export const findWorkItem = (text) => {
  const match = /\b(US-|Task-|User Story |Task )(\d+)/.exec(text);
  if (!match) return null;
  const prefix = match[1].startsWith('Task') ? 'Task' : 'US';
  return { label: `${prefix}-${match[2]}`, id: match[2] };
};

/**
 * Reads the size, model and effort level from the `Työmäärä` line of a work item description.
 * @param {string} html The work item description.
 * @returns {{size: string, model: string, effort: string | undefined} | null} The estimate, or null when absent.
 */
export const parseEstimate = (html) => {
  const text = html
    .replaceAll(/<[^<>]*>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll(/\s+/g, ' ');
  const match = /Työmäärä:\s*(XS|S|M|L|XL)\b.{0,200}?malli (Sonnet|Opus)(?:, effort-taso (\w+))?/.exec(text);
  return match ? { size: match[1], model: match[2], effort: match[3] } : null;
};

/**
 * Formats the model recommendation shown above the prompt, e.g. `US-47 · M · Sonnet, medium`.
 * @param {string} label The work item label.
 * @param {{size: string, model: string, effort: string | undefined}} estimate The parsed estimate.
 * @returns {string} The text.
 */
export const formatEstimate = (label, estimate) => {
  const model = estimate.effort ? `${estimate.model}, ${estimate.effort}` : estimate.model;
  return `${label} · ${estimate.size} · ${model}`;
};

const COLD_DEFAULT_SECONDS = 3600;

/**
 * Reads the parsed cold-session.json; a missing object or a bad value falls back to one hour.
 * @param {any} raw The parsed settings, or anything else when the file was missing or bad.
 * @returns {{coldAfterSeconds: number}} The idle time after which a session counts as cold.
 */
export const parseColdConfig = (raw) => {
  const value = raw && typeof raw === 'object' ? raw.coldAfterSeconds : undefined;
  return { coldAfterSeconds: isPositive(value) ? value : COLD_DEFAULT_SECONDS };
};

/**
 * Builds the warning shown before a message is sent to a cold session, or null when the session is warm.
 * The prompt cache expires after some time without a turn (five minutes by default, an hour in the extended mode, so the limit is a setting),
 * so after the limit the whole context is probably read again at full price.
 * @param {number | undefined} lastTurnMs The Unix time in milliseconds when the previous turn ended, or undefined when unknown.
 * @param {number} nowMs The current Unix time in milliseconds.
 * @param {number | undefined} tokens The context size, or undefined when unknown.
 * @param {{coldAfterSeconds: number}} config The cold-session settings.
 * @returns {string | null} The warning, or null when the idle time is under the limit or unknown.
 */
export const coldSessionWarning = (lastTurnMs, nowMs, tokens, config) => {
  if (!isPositive(lastTurnMs) || nowMs - lastTurnMs <= config.coldAfterSeconds * 1000) return null;
  const idle = Math.floor((nowMs - lastTurnMs) / 60000);
  const idleText = idle >= 120 ? `${Math.floor(idle / 60)} h` : `${idle} min`;
  const cost = tokens === undefined ? 'koko keskustelu' : `koko ${kilo(tokens)} tokenin konteksti`;
  return `Sessio on ollut käyttämättä ${idleText}, joten sen promptivälimuisti on todennäköisesti kylmä ja ${cost} luetaan nyt uudelleen ilman välimuistia. Jatka sellaisenaan tai aloita uusi chat /handoff-skillillä.`;
};

/**
 * One git command that the Never rules care about.
 * @typedef {object} GitOperation
 * @property {'push' | 'commit' | 'add' | 'switch'} kind The git subcommand (`stage` counts as `add`; `switch` also stands for a branch-changing `checkout`).
 * @property {string[]} dirs The directories it runs in: `cd` targets before it and its own `-C`, in order.
 * @property {string | undefined} [remote] The remote of a push; undefined stands for the default remote.
 * @property {string[]} refspecs The refspecs or branch names of a push.
 * @property {string[]} flags The option words of a push.
 * @property {string[]} files The lower-case file names given to `add` or `commit`.
 * @property {string | null} [target] The branch a `switch` ends on; null when it is not known (`-`, `--detach`, `.`).
 * @property {string | null} [switchedTo] Set on a later operation in the same directory after a `switch` in the same
 *   command: the branch it runs on (null when unknown).
 * @property {boolean} [switchUncertain] True when the `switch` may have failed or been skipped (the operation does not
 *   follow it through `&&` only), so the branch read from the directory is a possibility too.
 */

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const SECRET_FILES = new Set(['.env.local', '.mcp.json']);
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--config-env']);
const PUSH_VALUE_OPTIONS = new Set(['-o', '--push-option', '--receive-pack', '--exec']);
const COMMIT_VALUE_OPTIONS = new Set([
  '--message',
  '--file',
  '--author',
  '--date',
  '--fixup',
  '--squash',
  '--template',
  '--reuse-message',
  '--reedit-message',
]);
const SWITCH_CREATE_OPTIONS = new Set(['-b', '-B', '-c', '-C', '--orphan']);
const COMMAND_PREFIXES = new Set(['command', 'exec', 'time', 'nohup', 'then', 'do', 'else', 'if', '!', '{']);
const WRAPPER_VALUE_OPTIONS = {
  sudo: new Set(['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T']),
  timeout: new Set(['-s', '-k', '--signal', '--kill-after']),
  xargs: new Set(['-I', '-L', '-n', '-P', '-s', '-d', '-E']),
  wsl: new Set(['-d', '-u', '--distribution', '--user', '--cd']),
  nice: new Set(['-n']),
  env: new Set(['-u', '-C', '--unset', '--chdir']),
};
const DIRECTORY_COMMANDS = new Set(['cd', 'pushd', 'set-location', 'sl']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell', 'cmd']);
const EVAL_COMMANDS = new Set(['eval', 'iex', 'invoke-expression']);
const POWERSHELL_COMMANDS = new Set(['pwsh', 'powershell', 'iex', 'invoke-expression']);
const AZURE_HOST = /(^|\.)dev\.azure\.com$|(^|\.)visualstudio\.com$/;
const MAX_NESTING = 3;

/**
 * Tells whether a tool runs shell commands that the Never guard inspects.
 * @param {string} tool The tool name of the tool call.
 * @returns {boolean} True for Bash and PowerShell.
 */
export const isShellTool = (tool) => SHELL_TOOLS.has(tool);

/**
 * Tells whether the lines around a here-string or heredoc hand its body to a shell or `iex`, so that the body is a
 * command line and not data.
 * @param {string} context The text of the lines that hold the start (and for a here-string the end) of the block.
 * @returns {'Bash' | 'PowerShell' | null} How to read the body, or null when it is data.
 */
const blockReader = (context) => {
  const names = context.split(/[\s;&|()<>]+/).map(baseName);
  if (!names.some((name) => SHELLS.has(name) || EVAL_COMMANDS.has(name))) return null;
  return names.some((name) => POWERSHELL_COMMANDS.has(name)) ? 'PowerShell' : 'Bash';
};

/**
 * Removes the bodies of here-strings (PowerShell `@'` ... `'@`, `@"` ... `"@`) and heredocs (Bash `<<TAG` ... `TAG`),
 * which are data and not commands, unless a shell or `iex` reads them: those bodies come back as command lines of
 * their own. A heredoc without its closing line is left as it is.
 * @param {string} command The command line.
 * @param {boolean} powershell True for PowerShell.
 * @returns {{text: string, bodies: {text: string, tool: string}[]}} The command line without those bodies, and the
 *   bodies that are read as commands.
 */
const stripBlocks = (command, powershell) => {
  /** @type {{text: string, tool: string}[]} */
  const bodies = [];
  /**
   * @param {string} whole The whole text.
   * @param {number} from The index where the block starts.
   * @param {number} to The index where the block ends.
   * @param {string} body The body of the block.
   */
  const collect = (whole, from, to, body) => {
    const lineEnd = whole.indexOf('\n', to);
    const reader = blockReader(whole.slice(whole.lastIndexOf('\n', from) + 1, lineEnd < 0 ? whole.length : lineEnd));
    if (reader) bodies.push({ text: body, tool: reader });
  };
  if (powershell) {
    const stripped = command.replaceAll(/@(['"])\r?\n([\s\S]*?)\r?\n\1@/g, (match, _quote, body, offset, whole) => {
      collect(whole, offset, offset + match.length, body);
      return "''";
    });
    return { text: stripped, bodies };
  }
  let text = command;
  for (let from = 0; ; ) {
    const match = /<<(?!<)(-?)\s*(['"]?)([A-Za-z_]\w*)\2/.exec(text.slice(from));
    if (!match) return { text, bodies };
    const start = from + match.index;
    const afterTag = start + match[0].length;
    const lineEnd = text.indexOf('\n', afterTag);
    const closing = lineEnd < 0 ? null : new RegExp(String.raw`\n[ \t]*${match[3]}[ \t]*\r?(?=\n|$)`).exec(text.slice(lineEnd));
    if (!closing) {
      from = afterTag;
      continue;
    }
    const bodyEnd = lineEnd + closing.index + closing[0].length;
    collect(text, start, lineEnd, text.slice(lineEnd + 1, lineEnd + closing.index));
    text = text.slice(0, lineEnd) + text.slice(bodyEnd);
    from = lineEnd;
  }
};

/**
 * Reads one character inside quotes: where the quote ends, an escaped character or an ordinary one.
 * @param {string} char The character.
 * @param {string | undefined} next The character after it.
 * @param {string} quote The quote character that is open.
 * @param {boolean} powershell True for PowerShell.
 * @returns {{close?: boolean, add?: string, skip?: number}} The step: close the quote, or add text and skip characters.
 */
const quotedStep = (char, next, quote, powershell) => {
  if (char === quote) return powershell && next === quote ? { add: quote, skip: 1 } : { close: true };
  const escape = powershell ? '`' : '\\';
  const escapable = powershell ? undefined : '\\"$`';
  if (quote === '"' && char === escape && next !== undefined && (escapable?.includes(next) ?? true)) {
    return { add: next, skip: 1 };
  }
  return { add: char };
};

/**
 * Reads one character outside quotes.
 * @param {string} text The command line.
 * @param {number} i The index of the character.
 * @param {boolean} powershell True for PowerShell.
 * @returns {{kind: 'quote' | 'skip' | 'add' | 'end' | 'space', add?: string, skip?: number}} What the character does.
 */
const unquotedStep = (text, i, powershell) => {
  const char = text[i];
  const next = text[i + 1];
  if (char === '"' || char === "'") return { kind: 'quote' };
  if (char === (powershell ? '`' : '\\') && /^\r?\n/.test(text.slice(i + 1, i + 3))) {
    return { kind: 'skip', skip: next === '\r' ? 2 : 1 };
  }
  if (char === '`' && powershell && next !== undefined) return { kind: 'add', add: next, skip: 1 };
  if (';&|\n\r()'.includes(char) || (char === '`' && !powershell)) return { kind: 'end' };
  if (/\s/.test(char)) return { kind: 'space' };
  return { kind: 'add', add: char };
};

/**
 * Cuts a shell command into simple commands, each a list of words. A command ends at `;`, `&`, `|`, a newline,
 * a parenthesis (and in Bash a backtick) outside quotes; quotes group words and are removed, and backslashes stay as
 * typed because they are Windows path separators. It knows `\"` in Bash double quotes, `''`, `""` and the backtick
 * escape in PowerShell, and a backslash (Bash) or backtick (PowerShell) before a newline joins the lines.
 * @param {string} command The command line.
 * @param {string} tool The tool name: `PowerShell` or anything else for Bash.
 * @returns {{commands: {words: string[], chained: boolean}[], bodies: {text: string, tool: string}[]}} The simple
 *   commands (`chained` is true for the first and for one that follows the previous one through `&&` alone), and the
 *   here-string or heredoc bodies that a shell reads as commands.
 */
const splitCommands = (command, tool) => {
  const powershell = tool === 'PowerShell';
  const { text, bodies } = stripBlocks(command, powershell);
  /** @type {{words: string[], chained: boolean}[]} */
  const commands = [];
  let separators = '';
  /** @type {string[]} */
  let words = [];
  let word = '';
  let hasWord = false;
  let quote = '';
  const endWord = () => {
    if (hasWord) words.push(word);
    word = '';
    hasWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length > 0) {
      commands.push({ words, chained: commands.length === 0 || separators.replaceAll(/[\r\n]/g, '') === '&&' });
      separators = '';
    }
    words = [];
  };
  for (let i = 0; i < text.length; i++) {
    if (quote) {
      const step = quotedStep(text[i], text[i + 1], quote, powershell);
      if (step.close) quote = '';
      else word += step.add;
      i += step.skip ?? 0;
      continue;
    }
    const step = unquotedStep(text, i, powershell);
    switch (step.kind) {
      case 'quote':
        quote = text[i];
        hasWord = true;
        break;
      case 'add':
        word += step.add;
        hasWord = true;
        break;
      case 'end':
        endCommand();
        separators += text[i];
        break;
      case 'space':
        endWord();
        break;
      default:
        break;
    }
    i += step.skip ?? 0;
  }
  endCommand();
  return { commands, bodies };
};

/**
 * Reduces a path or executable word to its lower-case file name without a `.exe` ending.
 * @param {string} word The word.
 * @returns {string} The name.
 */
const baseName = (word) => (word.split(/[/\\]/).pop() ?? '').toLowerCase().replace(/\.exe$/, '');

/**
 * Tells whether a path is one of the secret or local-settings files that are never committed.
 * @param {string} path The file path or name, in any letter case.
 * @returns {boolean} True for `.env.local` and `.mcp.json`.
 */
export const isSecretFile = (path) => SECRET_FILES.has(baseName(path));

/**
 * Tells whether a git remote URL is on Azure DevOps, by its host name: `scheme://[user@]host/...` and `user@host:path`.
 * @param {string} url The remote URL.
 * @returns {boolean} True when the host is `dev.azure.com`, `visualstudio.com` or a subdomain of either.
 */
export const isAzureUrl = (url) => {
  const match = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:?#]+)/i.exec(url) ?? /^(?:[^@/\s]+@)?([^/:\s]+):/.exec(url);
  const host = match?.[1].toLowerCase();
  return host !== undefined && AZURE_HOST.test(host);
};

/**
 * Tells whether a branch name is `main`, as `main`, `refs/heads/main` or `heads/main`, in any letter case.
 * @param {string} name The branch or ref name.
 * @returns {boolean} True for main.
 */
const isMain = (name) => name.toLowerCase().replace(/^(refs\/)?heads\//, '') === 'main';

/**
 * Reads the arguments of one `git push`: the remote, the refspecs and the flags.
 * @param {string[]} rest The words after `push`.
 * @param {string[]} dirs The directories the command runs in.
 * @returns {GitOperation} The push operation.
 */
const parsePush = (rest, dirs) => {
  /** @type {string | undefined} */
  let remote;
  let remoteGiven = false;
  /** @type {string[]} */
  const refspecs = [];
  /** @type {string[]} */
  const flags = [];
  for (let j = 0; j < rest.length; j++) {
    const word = rest[j];
    if (word === '--repo' || word.startsWith('--repo=')) {
      remote = word === '--repo' ? rest[++j] : word.slice('--repo='.length);
      remoteGiven = true;
    } else if (PUSH_VALUE_OPTIONS.has(word)) {
      j++;
    } else if (word.startsWith('-')) {
      flags.push(word);
    } else if (remote === undefined && !remoteGiven) {
      remote = word;
    } else {
      refspecs.push(word);
    }
  }
  return { kind: 'push', dirs, remote, refspecs, flags, files: [] };
};

/**
 * Reads the file names of a `git commit` or `git add`, leaving out the values of options such as `-m`, `-F`, `-am`
 * and `--message`, which are text and not files.
 * @param {string[]} rest The words after the subcommand.
 * @param {boolean} commit True for `commit`, whose options take values.
 * @returns {string[]} The lower-case file names.
 */
const parseFiles = (rest, commit) => {
  /** @type {string[]} */
  const files = [];
  for (let j = 0; j < rest.length; j++) {
    const word = rest[j];
    if (commit && (/^-[a-zA-Z]*[mFCct]$/.test(word) || COMMIT_VALUE_OPTIONS.has(word))) j++;
    else if (!word.startsWith('-')) files.push(baseName(word));
  }
  return files;
};

const RESTORE_OPTIONS = new Set(['-p', '--patch', '--ours', '--theirs']);

/**
 * Reads where a `git switch` or `git checkout` ends up. A `checkout` of one plain name may restore a file, so it counts
 * as a switch only when the name is `main` (the unsafe case); `switch` and `-b`/`-B` always name a branch.
 * @param {string[]} rest The words after the subcommand.
 * @param {string[]} dirs The directories the command runs in.
 * @param {boolean} checkout True for `checkout`, false for `switch`.
 * @returns {GitOperation | null} A `switch` operation, or null when the command restores files and keeps the branch.
 */
const parseSwitch = (rest, dirs, checkout) => {
  if (rest.includes('--') || rest.includes('.') || rest.some((word) => RESTORE_OPTIONS.has(word))) return null;
  const create = rest.findIndex((word) => SWITCH_CREATE_OPTIONS.has(word));
  const named = rest.filter((word) => !word.startsWith('-') || word === '-');
  if (create < 0 && named.length > 1) return null;
  const tracking = rest.includes('-t') || rest.includes('--track');
  const raw = create >= 0 ? rest[create + 1] : named[0];
  const name = tracking && raw !== undefined ? raw.replace(/^[^/]+\//, '') : raw;
  if (create < 0 && checkout && name !== undefined && name !== '-' && !isMain(name)) return null;
  const target = name === undefined || name === '-' || rest.includes('--detach') ? null : name;
  return { kind: 'switch', dirs, refspecs: [], flags: [], files: [], target };
};

/**
 * Reads what one `git` command does that the Never rules care about.
 * @param {string[]} args The words after `git`.
 * @param {string[]} dirs The directories the command runs in: `cd` targets before it.
 * @returns {GitOperation | null} The operation, or null for any other git command.
 */
const parseGit = (args, dirs) => {
  const where = [...dirs];
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    if (args[i] === '-C' && args[i + 1] !== undefined) where.push(args[i + 1]);
    i += GIT_VALUE_OPTIONS.has(args[i]) ? 2 : 1;
  }
  const subcommand = args[i];
  const rest = args.slice(i + 1);
  if (subcommand === 'push') return parsePush(rest, where);
  if (subcommand === 'switch' || subcommand === 'checkout') return parseSwitch(rest, where, subcommand === 'checkout');
  if (subcommand === 'commit' || subcommand === 'add' || subcommand === 'stage') {
    const files = parseFiles(rest, subcommand === 'commit');
    return { kind: subcommand === 'stage' ? 'add' : subcommand, dirs: where, refspecs: [], flags: [], files };
  }
  return null;
};

/**
 * Quotes a word so that `splitCommands` reads it back as one word.
 * @param {string} word The word.
 * @param {string} tool The tool name the text is read as.
 * @returns {string} The word, quoted when it holds anything but plain characters.
 */
const requote = (word, tool) => {
  if (/^[^\s;&|()`'"<>$\\]+$/.test(word)) return word;
  const escaped = tool === 'PowerShell' ? word.replaceAll("'", "''") : word.replaceAll("'", String.raw`'\''`);
  return `'${escaped}'`;
};

/**
 * Tells whether a word is the option of a shell that takes a command string: `-c`, `-xc`, `-Command`, `/c`, `/k`.
 * @param {string} word The word.
 * @returns {boolean} True for such an option.
 */
const isCommandFlag = (word) => /^-[a-z]*c$/i.test(word) || /^-command$/i.test(word) || /^\/[ck]$/i.test(word);

/**
 * Finds the Bash here-string (`<<< text`, also `<<<text`) that a shell reads as its commands.
 * @param {string[]} words The simple command.
 * @param {number} start The index of the command name.
 * @returns {string | undefined} The text of the here-string, or undefined when there is none.
 */
const hereString = (words, start) => {
  const index = words.findIndex((word, i) => i > start && word.startsWith('<<<'));
  if (index < 0) return undefined;
  const inline = words[index].slice(3);
  return inline === '' ? words[index + 1] : inline;
};

/**
 * Finds the command string that a shell or `eval` runs, to read it again as a command line of its own.
 * @param {string[]} words The simple command.
 * @param {number} start The index of the command name.
 * @param {string} name The lower-case command name.
 * @returns {{text: string, tool: string} | null} The nested command line and the tool it is read as, or null.
 */
const nestedCommand = (words, start, name) => {
  const flag = SHELLS.has(name) ? words.findIndex((word, index) => index > start && isCommandFlag(word)) : -1;
  const from = EVAL_COMMANDS.has(name) ? start + 1 : flag + 1;
  if (from === 0 || from >= words.length) {
    const text = SHELLS.has(name) && !POWERSHELL_COMMANDS.has(name) ? hereString(words, start) : undefined;
    return text === undefined ? null : { text, tool: 'Bash' };
  }
  const rest = words.slice(from);
  const tool = POWERSHELL_COMMANDS.has(name) ? 'PowerShell' : 'Bash';
  return { text: rest.length === 1 ? rest[0] : rest.map((word) => requote(word, tool)).join(' '), tool };
};

/**
 * Skips the options of a wrapper command such as `sudo`, `timeout`, `xargs` or `wsl`, and the duration of `timeout`.
 * @param {string[]} words The simple command.
 * @param {number} from The index of the word after the wrapper's name.
 * @param {string} wrapper The lower-case wrapper name.
 * @returns {number} The index of the first word after the wrapper's options.
 */
const skipWrapperOptions = (words, from, wrapper) => {
  const values = WRAPPER_VALUE_OPTIONS[/** @type {keyof typeof WRAPPER_VALUE_OPTIONS} */ (wrapper)];
  let index = from;
  while (index < words.length && words[index].startsWith('-')) index += values.has(words[index]) ? 2 : 1;
  return wrapper === 'timeout' && /^\d/.test(words[index] ?? '') ? index + 1 : index;
};

/**
 * Skips the words in front of a command name: environment assignments, `env`, `sudo`, `timeout`, `xargs`, `wsl` and
 * similar prefixes with their options.
 * @param {string[]} words The simple command.
 * @returns {number} The index of the command name.
 */
const commandStart = (words) => {
  let start = 0;
  while (start < words.length) {
    const word = words[start];
    const lower = baseName(word);
    if (/^[A-Za-z_]\w*=/.test(word) || COMMAND_PREFIXES.has(lower)) start++;
    else if (lower in WRAPPER_VALUE_OPTIONS) start = skipWrapperOptions(words, start + 1, lower);
    else break;
  }
  return start;
};

/**
 * Finds the target of a directory command (`cd`, `pushd`, `Set-Location`, `sl`), skipping option words and reading
 * the value of `-Path` and `-LiteralPath`.
 * @param {string[]} args The words after the command name.
 * @returns {string | undefined} The directory, or undefined when none is given or it is `-`.
 */
const directoryTarget = (args) => {
  for (let j = 0; j < args.length; j++) {
    const lower = args[j].toLowerCase();
    if (lower === '-path' || lower === '-literalpath') return args[j + 1];
    if (!args[j].startsWith('-')) return args[j];
  }
  return undefined;
};

/**
 * Adds an operation to the list and tracks `switch` operations: a later operation in the same directory gets
 * `switchedTo`, the branch the earlier `switch` ended on, and `switchUncertain` unless only `&&` joins them and the
 * `switch` named its branch. A `switch` that does not follow its predecessor through `&&` may be skipped, so it is
 * never sure.
 * @param {GitOperation[]} operations The operations found so far.
 * @param {Map<string, {target: string | null, sure: boolean}>} switched The latest `switch` per directory key.
 * @param {GitOperation} operation The operation to add.
 * @param {boolean} chained True when the command runs only if the ones before it succeeded (`&&` alone).
 */
const addOperation = (operations, switched, operation, chained) => {
  const key = operation.dirs.join('\0');
  const previous = switched.get(key);
  if (operation.kind === 'switch') {
    switched.set(key, { target: operation.target ?? null, sure: chained });
  } else if (previous) {
    operation.switchedTo = previous.target;
    if (!previous.sure || previous.target === null) operation.switchUncertain = true;
  }
  operations.push(operation);
};

/**
 * Marks every tracked `switch` as uncertain: the command that comes next is not joined to the earlier ones by `&&`.
 * @param {Map<string, {target: string | null, sure: boolean}>} switched The latest `switch` per directory key.
 */
const unchain = (switched) => {
  for (const entry of switched.values()) entry.sure = false;
};

/**
 * Reads command lines nested in another command (a `-c` string or a block that a shell reads), up to the nesting limit.
 * @param {{text: string, tool: string}[]} items The nested command lines and the tools they are read as.
 * @param {number} depth The nesting depth of the command that holds them.
 * @param {string[]} dirs The directories of the command that holds them.
 * @returns {GitOperation[]} The operations found in them.
 */
const nestedOperations = (items, depth, dirs) =>
  depth >= MAX_NESTING ? [] : items.flatMap((item) => findGitOperations(item.text, item.tool, depth + 1, dirs));

/**
 * Finds the git operations in a shell command that the Never rules care about: `git push`, `git commit`, `git add`
 * and the branch changes (`switch`, `checkout`) that tell which branch a later commit lands on, also behind `cd`, `-C`,
 * environment assignments, `sudo`, `timeout`, `xargs`, `wsl` and similar prefixes, in `&&`/`;`/`|` chains and in the
 * string given to `sh -c`, `pwsh -Command`, `cmd /c`, `eval` or `iex`.
 * @param {string} command The command line of a Bash or PowerShell call.
 * @param {string} [tool] The tool name, `Bash` or `PowerShell`; it decides how quotes and escapes are read.
 * @param {number} [depth] How deep the command is nested in another command's string; callers leave it out.
 * @param {string[]} [inherited] The directories of the command that holds this one; callers leave it out.
 * @returns {GitOperation[]} The operations in the order they appear.
 */
export const findGitOperations = (command, tool = 'Bash', depth = 0, inherited = []) => {
  /** @type {GitOperation[]} */
  const operations = [];
  /** @type {Map<string, {target: string | null, sure: boolean}>} */
  const switched = new Map();
  let dirs = inherited;
  const { commands, bodies } = splitCommands(command, tool);
  for (const { words, chained } of commands) {
    if (!chained) unchain(switched);
    const start = commandStart(words);
    const name = words[start] === undefined ? '' : baseName(words[start]);
    const target = DIRECTORY_COMMANDS.has(name) ? directoryTarget(words.slice(start + 1)) : undefined;
    if (target !== undefined) {
      dirs = [...dirs, target];
    } else if (name === 'git') {
      const operation = parseGit(words.slice(start + 1), dirs);
      if (operation) addOperation(operations, switched, operation, chained);
    }
    const nested = nestedCommand(words, start, name);
    if (nested) operations.push(...nestedOperations([nested], depth, dirs));
  }
  operations.push(...nestedOperations(bodies, depth, dirs));
  return operations;
};

/**
 * Tells whether the branch of the directory matters to an operation: it does for a push and a commit that no earlier
 * `switch` in the same command has already placed on a branch.
 * @param {GitOperation} operation The operation from `findGitOperations`.
 * @returns {boolean} True when the caller should read the checked-out branch.
 */
export const needsBranch = (operation) =>
  (operation.kind === 'push' || operation.kind === 'commit') &&
  (operation.switchedTo === undefined || operation.switchUncertain === true);

/**
 * Joins the directories of an operation onto the working directory of the tool call.
 * @param {string} cwd The working directory of the call.
 * @param {string[]} dirs The directories from `GitOperation.dirs`, in order.
 * @returns {string} The directory the operation runs in; an absolute entry replaces what came before it, and a Git Bash
 *   path (`/c/repo`) becomes a Windows path (`C:/repo`) when the working directory is one.
 */
export const operationDirectory = (cwd, dirs) =>
  dirs.reduce((current, raw) => {
    const dir = /^[A-Za-z]:/.test(cwd) ? raw.replace(/^(?:\/mnt)?\/([A-Za-z])(?=\/|$)/, (_, drive) => `${drive.toUpperCase()}:`) : raw;
    return /^([A-Za-z]:|[/\\])/.test(dir) ? dir : `${current.replace(/[/\\]$/, '')}/${dir}`;
  }, cwd);

/**
 * Tells whether a git remote may be pushed to. The `azure` remote is Azure DevOps unless its URL says otherwise. The
 * `origin` remote is too on a local checkout, but it is the public GitHub mirror in a cloud session. A URL is allowed
 * only when its host is on Azure DevOps.
 * @param {string | undefined} remote The remote named in the push; undefined stands for the default remote, `origin`.
 * @param {boolean} originIsPublic True when `origin` is not Azure DevOps.
 * @param {boolean} azureIsPublic True when the `azure` remote's push URL is not Azure DevOps.
 * @returns {boolean} True when the push goes to Azure DevOps.
 */
const isAzureRemote = (remote, originIsPublic, azureIsPublic) => {
  const name = remote ?? 'origin';
  if (name === 'azure') return !azureIsPublic;
  if (name === 'origin') return !originIsPublic;
  return /[:/\\@]/.test(name) && isAzureUrl(name);
};

const PUSH_REMOTE_REASON =
  'Blocked by the Never list in CLAUDE.md: push only to Azure DevOps (the azure remote, or origin on a local checkout), never to GitHub or any other remote. Name the remote in the command.';
const PUSH_MAIN_REASON =
  'Blocked by the Never list in CLAUDE.md: never push to main, not even the smallest change. Push a work item branch and open a pull request.';
const COMMIT_MAIN_REASON =
  'Blocked by the Never list in CLAUDE.md: never commit directly to main. Create a work item branch first (see /create-pull-request).';

/**
 * Checks the refspecs of a push to Azure DevOps for a push to `main`: the plain name, `HEAD:main`, `@:main`,
 * `refs/heads/main`, a deletion (`:main`), a forced one (`+x:main`) and a wildcard that includes it.
 * @param {GitOperation} operation The push.
 * @param {string | undefined} branch The checked-out branch, undefined when unknown.
 * @returns {boolean} True when the push may update `main`.
 */
const pushesMain = (operation, branch) => {
  if (operation.flags.includes('--all') || operation.flags.includes('--mirror')) return true;
  if (operation.refspecs.length === 0) return branch !== undefined && isMain(branch);
  return operation.refspecs.some((refspec) => {
    const target = refspec.replace(/^\+/, '').split(':').pop() ?? '';
    const resolved = target === 'HEAD' || target === '@' ? branch : target;
    return resolved !== undefined && (isMain(resolved) || resolved.includes('*'));
  });
};

/**
 * Checks one git operation against the Never list of CLAUDE.md: no push to GitHub, no push to `main`, no commit on
 * `main` and no `.env.local` or `.mcp.json` added to git.
 * @param {GitOperation} operation The operation from `findGitOperations`.
 * @param {{branch?: string, originIsPublic?: boolean, azureIsPublic?: boolean}} context The checked-out branch in the
 *   operation's directory (undefined when unknown, then only what the command itself shows is checked; an earlier
 *   `switch` in the same command, `operation.switchedTo`, replaces it), whether `origin` is public and whether
 *   `azure` is.
 * @returns {string | null} Why the operation is forbidden, or null when it may run.
 */
export const checkGitOperation = (operation, context) => {
  const { originIsPublic = false, azureIsPublic = false } = context;
  const secret = operation.files.find(isSecretFile);
  if (secret) return `Blocked by the Never list in CLAUDE.md: ${secret} holds secrets or local settings and is never committed.`;
  if (operation.kind !== 'commit' && operation.kind !== 'push') return null;
  const branches = possibleBranches(operation, context.branch);
  if (operation.kind === 'commit') {
    return branches.some((branch) => branch !== undefined && isMain(branch)) ? COMMIT_MAIN_REASON : null;
  }
  if (!isAzureRemote(operation.remote, originIsPublic, azureIsPublic)) return PUSH_REMOTE_REASON;
  return branches.some((branch) => pushesMain(operation, branch)) ? PUSH_MAIN_REASON : null;
};

/**
 * Lists the branches an operation may run on: the one an earlier `switch` ended on, plus the checked-out one when that
 * switch is uncertain, or just the checked-out one when no switch came before.
 * @param {GitOperation} operation The operation from `findGitOperations`.
 * @param {string | undefined} checkedOut The checked-out branch in the operation's directory, undefined when unknown.
 * @returns {(string | undefined)[]} The possible branches; undefined stands for an unknown one.
 */
const possibleBranches = (operation, checkedOut) => {
  if (operation.switchedTo === undefined) return [checkedOut];
  return operation.switchUncertain ? [operation.switchedTo ?? undefined, checkedOut] : [operation.switchedTo ?? undefined];
};

/**
 * The toast text of the "Tarkista origin/main" button: how the branch stands against origin/main.
 * The counts come from `git rev-list --left-right --count HEAD...origin/main`, the same figures that
 * worktree-sync.mjs reads at session start.
 * @param {number} ahead - Commits that HEAD has and origin/main lacks.
 * @param {number} behind - Commits that origin/main has and HEAD lacks.
 * @param {string} branch - The checked-out branch, empty on a detached HEAD.
 * @returns {string} A one-line Finnish report.
 */
export const syncStatus = (ahead, behind, branch) => {
  const where = branch ? `Haara ${branch}` : 'Irrallinen HEAD';
  const own = ahead === 1 ? '1 oma commit' : `${ahead} omaa committia`;
  if (behind > 0 && ahead > 0) return `${where} on ${behind} commitin jäljessä origin/mainista ja sillä on ${own}: päivitys vaatii rebasen tai mergen.`;
  if (behind > 0) return `${where} on ${behind} commitin jäljessä origin/mainista ja voidaan päivittää fast-forwardilla.`;
  if (ahead > 0) return `${where} ei ole jäljessä origin/mainista, sillä on ${own}.`;
  return `${where} on ajan tasalla origin/mainin kanssa.`;
};
