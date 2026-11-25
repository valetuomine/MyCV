// PreToolUse hook (Bash and PowerShell): enforces the Never list of CLAUDE.md before a command runs: no push to
// GitHub, no push or commit on main, no .env.local or .mcp.json added to git. The usage-band plugin has the same
// guard as a `tool.call` mode; this hook covers `claude -p`, cloud sessions and any surface that does not load it.
// Both use the detection in the plugin's core.mjs. A command that is not a forbidden git operation, and any failure
// of the hook itself, lets the call through.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  checkGitOperation,
  findGitOperations,
  isAzureUrl,
  isSecretFile,
  isShellTool,
  needsBranch,
  operationDirectory,
} from '../skills/usage-band/hooks/core.mjs';

/**
 * Runs a command in a directory and returns its trimmed output.
 * @param {string} command The executable.
 * @param {string} cwd The directory.
 * @param {string[]} args The arguments.
 * @returns {string} The output; throws when the command fails.
 */
const run = (command, cwd, args) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim();

/**
 * Runs git in a directory and returns its trimmed output.
 * @param {string} cwd The directory.
 * @param {string[]} args The git arguments.
 * @returns {string | undefined} The output, or undefined when git fails.
 */
const git = (cwd, args) => {
  try {
    return run('git', cwd, args);
  } catch {
    return undefined;
  }
};

/**
 * Tells whether `origin` is not Azure DevOps: always in a cloud session (the GitHub mirror), otherwise by its push URL.
 * @param {string} cwd The directory to ask git in.
 * @returns {boolean} True when pushing to `origin` would not go to Azure DevOps.
 */
const originIsPublic = (cwd) => {
  if (process.env.CLAUDE_CODE_REMOTE === 'true') return true;
  const url = git(cwd, ['remote', 'get-url', '--push', 'origin']);
  return url !== undefined && !isAzureUrl(url);
};

/**
 * Tells whether the `azure` remote's push URL is not Azure DevOps.
 * @param {string} cwd The directory to ask git in.
 * @returns {boolean} True when pushing to `azure` would not go to Azure DevOps.
 */
const azureIsPublic = (cwd) => {
  const url = git(cwd, ['remote', 'get-url', '--push', 'azure']);
  return url !== undefined && !isAzureUrl(url);
};

/**
 * Finds the reason a shell command breaks the Never list.
 * @param {string} command The command line of the tool call.
 * @param {string} cwd The working directory of the call.
 * @param {string} tool The tool name, `Bash` or `PowerShell`.
 * @returns {string | null} The reason, or null when the command may run.
 */
const violation = (command, cwd, tool) => {
  for (const operation of findGitOperations(command, tool)) {
    const dir = operationDirectory(cwd, operation.dirs);
    const branch = needsBranch(operation) ? git(dir, ['branch', '--show-current']) : undefined;
    const isPush = operation.kind === 'push';
    const reason = checkGitOperation(operation, {
      branch: branch || undefined,
      originIsPublic: isPush ? originIsPublic(dir) : false,
      azureIsPublic: isPush ? azureIsPublic(dir) : false,
    });
    if (reason) return reason;
    if (operation.kind === 'commit' && git(dir, ['diff', '--cached', '--name-only'])?.split('\n').some(isSecretFile)) {
      return 'Blocked by the Never list in CLAUDE.md: .env.local or .mcp.json is staged and would be committed. Unstage it first.';
    }
  }
  return null;
};

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (isShellTool(input?.tool_name) && typeof command === 'string') {
    const reason = violation(command, input.cwd || process.cwd(), input.tool_name);
    if (reason) {
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }),
      );
    }
  }
} catch {
  // Never block a command on an error of the hook itself.
}
