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

export type WorkItemRef = { label: string; id: string }
export type Estimate = { size: string; model: string; effort: string | undefined }
export declare const findWorkItem: (text: string) => WorkItemRef | null
export declare const parseEstimate: (html: string) => Estimate | null
export declare const formatEstimate: (label: string, estimate: Estimate) => string

export type ColdConfig = { coldAfterSeconds: number }
export declare const parseColdConfig: (raw: unknown) => ColdConfig
export declare const coldSessionWarning: (
  lastTurnMs: number | undefined,
  nowMs: number,
  tokens: number | undefined,
  config: ColdConfig,
) => string | null

/** One git command that the Never rules care about. */
export type GitOperation = {
  kind: 'push' | 'commit' | 'add' | 'switch'
  dirs: string[]
  remote?: string
  refspecs: string[]
  flags: string[]
  files: string[]
  target?: string | null
  switchedTo?: string | null
  switchUncertain?: boolean
}
export function isShellTool(tool: string): boolean
export function isSecretFile(path: string): boolean
export function isAzureUrl(url: string): boolean
export function findGitOperations(command: string, tool?: string, depth?: number, inherited?: string[]): GitOperation[]
export function needsBranch(operation: GitOperation): boolean
export function operationDirectory(cwd: string, dirs: string[]): string
export function checkGitOperation(
  operation: GitOperation,
  context: { branch?: string; originIsPublic?: boolean; azureIsPublic?: boolean },
): string | null
export declare const syncStatus: (ahead: number, behind: number, branch: string) => string
