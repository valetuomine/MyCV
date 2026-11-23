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
