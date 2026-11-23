// SessionStart hook: brings the local code graph (graphify-out/graph.json) up to date and gives Claude a short
// summary of it as additional context: the commit it was built at, its age, the hub nodes and the query commands.
// A worktree session starts from a copy of the main checkout's graph, which is never modified from the worktree.
// The hook runs no LLM, never fails a session start and stays silent when the graph or the graphify package is missing.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOTAL_BUDGET_MS = 55_000;
const MIN_COMMAND_MS = 1_000;
const UPDATE_TIMEOUT_MS = 35_000;
const COMMAND_TIMEOUT_MS = 10_000;
const HUB_COUNT = 5;
const HUB_CANDIDATES = 15;
const HOUR_MS = 60 * 60 * 1000;
const GRAPH_FILES = ['graph.json', 'manifest.json'];
const PYTHON_COMMANDS = ['python', 'python3'];
const startedAt = Date.now();
const startDir = resolve(process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

/**
 * Runs a command and returns its standard output. The time left of the hook's total budget caps every command, so
 * the hook ends before Claude Code stops it.
 * @param {string} command - Executable to run.
 * @param {string[]} args - Arguments of the command.
 * @param {number} timeout - Time in milliseconds after which the command is stopped.
 * @param {string} cwd - Folder to run the command in.
 * @returns {string} The output; the call throws when the command fails, times out or the budget is used up.
 */
const run = (command, args, timeout, cwd) => {
  const left = TOTAL_BUDGET_MS - (Date.now() - startedAt);
  if (left < MIN_COMMAND_MS) throw new Error('The hook budget is used up.');
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: Math.min(timeout, left),
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
};

/**
 * Normalises a path for comparison; Windows paths are case-insensitive.
 * @param {string} path - Path to normalise.
 * @returns {string} The absolute path, in lower case on Windows.
 */
const normalise = (path) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path));

/**
 * Finds the Python command that can run the graphify package.
 * @returns {string | undefined} The command, or undefined when the package is not installed.
 */
const findPython = () =>
  PYTHON_COMMANDS.find((command) => {
    try {
      run(command, ['-m', 'graphify', '--help'], COMMAND_TIMEOUT_MS, startDir);
      return true;
    } catch {
      return false;
    }
  });

/**
 * Finds the working tree's top folder and the main checkout's folder; they differ in a worktree session.
 * @returns {{ top: string, mainRoot: string, isWorktree: boolean }} The two folders and whether this is a worktree.
 */
const findCheckout = () => {
  const [top, gitDir, commonDir] = run(
    'git',
    ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir'],
    COMMAND_TIMEOUT_MS,
    startDir,
  )
    .trim()
    .split('\n')
    .map((line) => line.trim());
  return {
    top: resolve(top),
    mainRoot: dirname(resolve(commonDir)),
    isWorktree: normalise(gitDir) !== normalise(commonDir),
  };
};

/**
 * Reads the commit that a graph was built at.
 * @param {string} graphPath - Path of graph.json.
 * @returns {string | undefined} The commit, or undefined when the file or field is missing.
 */
const readBuiltCommit = (graphPath) => {
  try {
    return JSON.parse(readFileSync(graphPath, 'utf8')).built_at_commit;
  } catch {
    return undefined;
  }
};

/**
 * Copies the main checkout's graph files into the worktree, so that the worktree gets a graph of its own.
 * @param {string} mainGraphDir - The main checkout's graphify-out folder.
 * @param {string} localGraphDir - The worktree's graphify-out folder.
 */
const copyGraph = (mainGraphDir, localGraphDir) => {
  mkdirSync(localGraphDir, { recursive: true });
  for (const file of GRAPH_FILES) {
    if (existsSync(join(mainGraphDir, file))) copyFileSync(join(mainGraphDir, file), join(localGraphDir, file));
  }
};

/**
 * Lists the most connected nodes of the project's own code and docs, leaving out the npm package nodes (`ref_` ids).
 * @param {string} python - Python command.
 * @param {string} graphPath - Path of graph.json.
 * @param {string} cwd - Folder to run the command in.
 * @returns {string[]} The hub nodes as `label (edges)`, or an empty list when the command fails.
 */
const readHubs = (python, graphPath, cwd) => {
  try {
    const output = run(
      python,
      ['-m', 'graphify', 'god-nodes', '--json', '--top', String(HUB_CANDIDATES), '--graph', graphPath],
      COMMAND_TIMEOUT_MS,
      cwd,
    );
    return JSON.parse(output)
      .filter((node) => typeof node.label === 'string' && !String(node.id).startsWith('ref_'))
      .slice(0, HUB_COUNT)
      .map((node) => `${node.label} (${node.degree})`);
  } catch {
    return [];
  }
};

/**
 * Describes how old a graph file is.
 * @param {string} graphPath - Path of graph.json.
 * @returns {string} The age in hours or days.
 */
const describeAge = (graphPath) => {
  const hours = Math.max(0, Math.round((Date.now() - statSync(graphPath).mtimeMs) / HOUR_MS));
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} d`;
};

/**
 * Brings the graph up to date when it was built at another commit than HEAD, and describes the outcome.
 * @param {{ python: string, top: string, graphPath: string, head: string, mainGraph: string | undefined }} context -
 * Python command, working tree, its graph, HEAD, and the main checkout's graph when this is a worktree.
 * @returns {string} A note for the summary; empty when the graph was already current or was rebuilt.
 */
const refreshGraph = ({ python, top, graphPath, head, mainGraph }) => {
  if (readBuiltCommit(graphPath) === head) return '';
  try {
    run(python, ['-m', 'graphify', 'update', '.'], UPDATE_TIMEOUT_MS, top);
  } catch {
    const hint = mainGraph ? `; use --graph "${mainGraph}" for queries` : '';
    return ` The update failed, so it may be behind HEAD${hint}.`;
  }
  const builtAt = readBuiltCommit(graphPath);
  return builtAt === head
    ? ''
    : ` No code changes since ${(builtAt ?? 'unknown').slice(0, 7)}, so the graph matches HEAD.`;
};

/**
 * Builds the session start summary and refreshes the graph when it is behind HEAD.
 * @returns {string | undefined} The summary, or undefined when there is no graph or no graphify package to use.
 */
const buildSummary = () => {
  const { top, mainRoot, isWorktree } = findCheckout();
  const localGraphDir = join(top, 'graphify-out');
  const localGraph = join(localGraphDir, 'graph.json');
  const mainGraph = join(mainRoot, 'graphify-out', 'graph.json');
  if (!existsSync(localGraph) && !(isWorktree && existsSync(mainGraph))) return undefined;
  const python = findPython();
  if (!python) return undefined;

  if (!existsSync(localGraph)) copyGraph(join(mainRoot, 'graphify-out'), localGraphDir);
  const head = run('git', ['rev-parse', 'HEAD'], COMMAND_TIMEOUT_MS, top).trim();
  const note = refreshGraph({
    python,
    top,
    graphPath: localGraph,
    head,
    mainGraph: isWorktree ? mainGraph : undefined,
  });

  const builtAt = (readBuiltCommit(localGraph) ?? 'unknown').slice(0, 7);
  const hubs = readHubs(python, localGraph, top);
  const lines = [
    `Code graph (graphify-out/graph.json): built at commit ${builtAt}, HEAD is ${head.slice(0, 7)}, file age ${describeAge(localGraph)}.${note}`,
    hubs.length > 0 ? `Hub nodes (edges): ${hubs.join(', ')}.` : '',
    'Before reading files for any implementation task, query it: python -m graphify query "<question>" --budget 1500; explain "<node>"; affected "<node>". Verify what it returns in the files, because it holds code only.',
  ];
  return lines.filter(Boolean).join('\n');
};

try {
  const summary = buildSummary();
  if (summary) {
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: summary } }),
    );
  }
} catch {
  // The hook never fails a session start.
}
