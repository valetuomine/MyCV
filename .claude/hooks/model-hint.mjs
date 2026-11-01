// UserPromptSubmit hook: stops the first message of a chat once when it names a work item
// whose `Työmäärä` line recommends a model and effort level, so the user can switch before tokens are spent.
import { closeSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TIMEOUT_MS = 4000;
const PLACEHOLDER_TOKEN = Buffer.from(':proxy-injected').toString('base64');

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
 * Creates the per-session marker file; fails when it already exists.
 * @param {string} sessionId The Claude Code session id.
 * @returns {boolean} True when this is the first checked message of the session.
 */
const claimFirstMessage = (sessionId) => {
  try {
    const name = `mycv-model-hint-${sessionId.replace(/[^\w-]/g, '_')}`;
    closeSync(openSync(join(tmpdir(), name), 'wx'));
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetches the work item description from Azure DevOps.
 * @param {string} id The work item id.
 * @returns {Promise<string | null>} The HTML description, or null on any failure.
 */
const fetchDescription = async (id) => {
  const url = `https://dev.azure.com/valetuominen/MyCV/_apis/wit/workitems/${id}?fields=System.Description&api-version=7.1`;
  const token = process.env.AZURE_DEVOPS_MCP || PLACEHOLDER_TOKEN;
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status !== 200) return null;
  const body = await response.json();
  return body?.fields?.['System.Description'] ?? null;
};

/**
 * Reads the size, model and effort level from the `Työmäärä` line.
 * @param {string} html The work item description.
 * @returns {{size: string, model: string, effort: string | undefined} | null} The estimate, or null when absent.
 */
const parseEstimate = (html) => {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  const match = text.match(/Työmäärä:\s*(XS|S|M|L|XL)\b.{0,200}?malli (Sonnet|Opus)(?:, effort-taso (\w+))?/);
  return match ? { size: match[1], model: match[2], effort: match[3] } : null;
};

/**
 * Runs the hook; any failure lets the message through silently.
 * @returns {Promise<void>}
 */
const main = async () => {
  const input = JSON.parse(await readStdin());
  const prompt = String(input.prompt ?? '');
  if (prompt.trimStart().startsWith('/')) return;
  if (!claimFirstMessage(String(input.session_id ?? ''))) return;
  const ticket = prompt.match(/\b(User Story|Task) (\d+)/);
  if (!ticket) return;
  const html = await fetchDescription(ticket[2]);
  const estimate = html && parseEstimate(html);
  if (!estimate) return;
  const settings = estimate.effort
    ? `malli ${estimate.model}, effort-taso ${estimate.effort}`
    : `malli ${estimate.model}`;
  const reason =
    `${ticket[1]} ${ticket[2]} on arvioitu kokoon ${estimate.size}: ${settings}. ` +
    'Vaihda tarvittaessa /model ja /effort (paina s, niin taso koskee vain tätä chattia) ja lähetä viesti uudelleen. ' +
    'Jos asetukset ovat jo oikein, lähetä viesti uudelleen sellaisenaan.';
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
};

try {
  await main();
} catch {
  // Never block the message on an error.
}
