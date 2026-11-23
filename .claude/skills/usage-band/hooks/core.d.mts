/** Types of core.mjs for the TypeScript hooks module; core.mjs holds the code and its JSDoc. */
export type BudgetConfig = { shares: number[]; margin: number }
export type ContextLimits = { warnTokens: number; stopTokens: number; repeatEveryTokens: number }

export declare const isNonNegativeNumber: (value: unknown) => value is number
export declare const parseBudgetConfig: (raw: unknown) => BudgetConfig
export declare const computeLimit: (resetsAt: number, nowSeconds: number, shares: number[]) => { dayIndex: number; limit: number }
export declare const budgetWarning: (
  usedPercentage: number,
  resetsAt: number,
  nowSeconds: number,
  config: BudgetConfig,
) => { level: 'over' | 'near'; key: string; text: string } | null
export declare const parseContextLimits: (raw: unknown) => ContextLimits
export declare const kilo: (tokens: number) => string
export declare const contextStopReason: (tokens: number, stopTokens: number) => string
export declare const contextWarning: (tokens: number, stopTokens: number) => string
