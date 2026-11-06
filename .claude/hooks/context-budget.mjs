// UserPromptSubmit and PostToolUse hook: warns when the conversation context passes warnTokens and
// stops the work at stopTokens, so a long task continues in a new chat through /handoff.
// The size is read from the end of the transcript, so it also works where the status line does not run.
// It never fails: any error means doing nothing. Subagent tool calls are ignored.
// For tests, the CONTEXT_BUDGET_CONFIG environment variable replaces the settings file name (a path
// resolved against this folder).
import { closeSync, fstatSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULTS = { warnTokens: 150000, stopTokens: 200000, repeatEveryTokens: 25000 };
const TAIL_BYTES = 256 * 1024;
const LARGE_TAIL_BYTES = 4 * 1024 * 1024;

/**
 * Checks that a value is a finite positive number.
 * @param {unknown} value The value to check.
 * @returns {boolean} True for usable token limits.
 */
const isPositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Reads context-budget.json; a missing file, bad JSON, a bad value or warnTokens at or above
 * stopTokens falls back to the defaults.
 * @returns {{warnTokens: number, stopTokens: number, repeatEveryTokens: number}} The limits.
 */
const loadConfig = () => {
  let raw = {};
  try {
    const name = process.env.CONTEXT_BUDGET_CONFIG ?? 'context-budget.json';
    raw = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), name), 'utf8')) ?? {};
  } catch {
    raw = {};
  }
  /**
   * Picks a configured limit, or its default when the value is unusable.
   * @param {string} key The setting name.
   * @returns {number} The limit.
   */
  const pick = (key) => (isPositive(raw[key]) ? raw[key] : DEFAULTS[key]);
  const limits = { warnTokens: pick('warnTokens'), stopTokens: pick('stopTokens'), repeatEveryTokens: pick('repeatEveryTokens') };
  return limits.warnTokens < limits.stopTokens ? limits : { ...DEFAULTS };
};

/**
 * Reads the whole hook input from stdin.
 * @returns {Promise<string>} The raw JSON text.
 */
const readStdin = async () => {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
};

/**
 * Reads the last bytes of a file as text.
 * @param {string} path The file path.
 * @param {number} bytes The most bytes to read.
 * @returns {{text: string, whole: boolean}} The tail text (its first line may be cut) and whether it is the whole file.
 */
const readTail = (path, bytes) => {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const length = Math.min(size, bytes);
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, size - length);
    return { text: buffer.toString('utf8'), whole: length === size };
  } finally {
    closeSync(fd);
  }
};

/**
 * Finds the context size of the latest main-chain assistant message in a transcript tail.
 * @param {string} text The tail text.
 * @returns {number | null} Input, cache read and cache creation tokens, or null when none is found.
 */
const findContextTokens = (text) => {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"usage"')) continue;
    try {
      const entry = JSON.parse(lines[i]);
      const usage = entry?.message?.usage;
      if (entry?.type !== 'assistant' || entry.isSidechain === true || !usage) continue;
      const total = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
      if (Number.isFinite(total) && total > 0) return total;
    } catch {
      // A cut or broken line is skipped.
    }
  }
  return null;
};

/**
 * Reads the context size from the end of the transcript, retrying once with a larger tail when a
 * very long line hides the latest usage.
 * @param {string} path The transcript JSONL path.
 * @returns {number | null} The context size, or null when none is found.
 */
const readContextTokens = (path) => {
  const small = readTail(path, TAIL_BYTES);
  const found = findContextTokens(small.text);
  if (found !== null || small.whole) return found;
  return findContextTokens(readTail(path, LARGE_TAIL_BYTES).text);
};

/**
 * Builds the path of the per-session state file in the temp directory.
 * @param {string} sessionId The session id.
 * @returns {string} The file path.
 */
const statePath = (sessionId) => join(tmpdir(), `mycv-context-${sessionId.replace(/[^\w-]/g, '_')}.json`);

/**
 * Reads the per-session notice state.
 * @param {string} sessionId The session id.
 * @returns {{warned: boolean, lastStopStep: number}} The state; a missing or bad file means no notice was given.
 */
const loadState = (sessionId) => {
  try {
    const raw = JSON.parse(readFileSync(statePath(sessionId), 'utf8'));
    return { warned: raw.warned === true, lastStopStep: Number.isInteger(raw.lastStopStep) ? raw.lastStopStep : -1 };
  } catch {
    return { warned: false, lastStopStep: -1 };
  }
};

/**
 * Stores the per-session notice state; failures are ignored.
 * @param {string} sessionId The session id.
 * @param {{warned: boolean, lastStopStep: number}} state The state.
 * @returns {void}
 */
const saveState = (sessionId, state) => {
  try {
    writeFileSync(statePath(sessionId), JSON.stringify(state));
  } catch {
    // Notices are best effort.
  }
};

/**
 * Formats a token count as thousands, e.g. 182k.
 * @param {number} tokens The token count.
 * @returns {string} The text.
 */
const kilo = (tokens) => `${Math.round(tokens / 1000)}k`;

/**
 * Builds the hook output for the event and context size and updates the notice state, so a notice
 * is not repeated until the context grows again after it shrank (for example after /compact).
 * @param {string} event The hook event name.
 * @param {string} sessionId The session id.
 * @param {number} tokens The context size.
 * @param {string} prompt The submitted prompt, for UserPromptSubmit.
 * @param {{warnTokens: number, stopTokens: number, repeatEveryTokens: number}} limits The limits.
 * @returns {object | null} The JSON output, or null when there is nothing to say.
 */
const buildOutput = (event, sessionId, tokens, prompt, limits) => {
  const { warnTokens, stopTokens, repeatEveryTokens } = limits;
  const state = loadState(sessionId);
  if (tokens < warnTokens) {
    if (state.warned || state.lastStopStep >= 0) saveState(sessionId, { warned: false, lastStopStep: -1 });
    return null;
  }
  if (tokens < stopTokens && state.lastStopStep >= 0) {
    saveState(sessionId, { ...state, lastStopStep: -1 });
    state.lastStopStep = -1;
  }
  if (tokens >= stopTokens && event === 'UserPromptSubmit' && !prompt.trimStart().startsWith('/')) {
    return {
      decision: 'block',
      reason: `Konteksti on ${kilo(tokens)} tokenia (raja ${kilo(stopTokens)}). Aja /handoff ja jatka työtä uudessa chatissa annetulla aloitusviestillä. /-komennot (/handoff, /compact, /clear) sallitaan.`,
    };
  }
  if (tokens >= stopTokens) {
    const step = Math.floor((tokens - stopTokens) / repeatEveryTokens);
    if (event !== 'PostToolUse' || step <= state.lastStopStep) return null;
    saveState(sessionId, { warned: true, lastStopStep: step });
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: `Context is ${kilo(tokens)} tokens, over the ${kilo(stopTokens)} limit. Stop at the next safe point (not in the middle of a commit or a file edit), run /handoff and end your turn so the work continues in a new chat.`,
      },
    };
  }
  if (state.warned) return null;
  saveState(sessionId, { ...state, warned: true });
  return {
    systemMessage: `Konteksti on ${kilo(tokens)} tokenia. Rajalla ${kilo(stopTokens)} työ pitää jatkaa uudessa chatissa /handoff-skillin kautta.`,
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: `Context is ${kilo(tokens)} tokens. Past ${kilo(stopTokens)} the work must continue in a new chat through /handoff, so plan a safe stopping point.`,
    },
  };
};

try {
  const input = JSON.parse(await readStdin());
  const event = input?.hook_event_name;
  if (!input?.agent_id && (event === 'UserPromptSubmit' || event === 'PostToolUse') && typeof input.transcript_path === 'string') {
    const tokens = readContextTokens(input.transcript_path);
    if (tokens !== null) {
      const output = buildOutput(event, String(input.session_id ?? 'unknown'), tokens, String(input.prompt ?? ''), loadConfig());
      if (output) process.stdout.write(JSON.stringify(output));
    }
  }
} catch {
  // Never block or break on an error.
}
