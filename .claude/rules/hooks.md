---
paths:
  - ".claude/hooks/**"
  - ".claude/settings.json"
---

# Hooks and status line

Implementation notes for the hooks in `.claude/hooks/` and their registration in `.claude/settings.json`. `CLAUDE.md` (*Tools*) holds what each hook does for the user.

## Model hint hook

`.claude/hooks/model-hint.mjs` (`UserPromptSubmit`) stops the first message of a chat once (later messages are never checked, and a failed lookup is not retried) when it names a `User Story <id>` or `Task <id>` whose `Työmäärä` line recommends a model and effort level. It shows the recommendation so the user can switch with `/model` and `/effort` before tokens are spent, and resending the message lets it through. It does nothing on any failure, and it cannot change the model itself.

## Weekly usage budget

The status line (`.claude/hooks/usage-statusline.mjs`, `statusLine` in `.claude/settings.json`) shows the weekly usage, today's cumulative limit and the five-hour window usage with the time the window resets, e.g. `Viikko 38 % / raja 42 % · 5 h 12 % (nollautuu 14:30) · Konteksti 182k` (the last part is the context size, `context_window.total_input_tokens`); the time is left out when `resets_at` is missing or already past. It stores the weekly usage in the temp directory, and the `UserPromptSubmit` hook `.claude/hooks/usage-budget.mjs` reads it and shows a `systemMessage` warning once a day when usage nears the limit and once when it passes it. It never blocks a message.

Each weekday's share is set in `.claude/hooks/usage-budget.json` (default 14 % a day, warning margin 3 percentage points). The limit is cumulative from the week's start (`resets_at` minus 7 days), so an unused day moves its share to the following days. Both scripts share `usage-budget-core.mjs`.

Only a running local Claude Code CLI session reports usage, and a missing file or field is skipped silently. The VS Code chat panel does not run the status line, so it shows no numbers and the hook has nothing to read there: start sessions with `claude` in a terminal, or set `claudeCode.useTerminal` and use the "✻ Claude Code" status bar button (both need `claude` on PATH).

## Context budget

`.claude/hooks/context-budget.mjs` (`UserPromptSubmit` and `PostToolUse`, registered in `.claude/settings.json`) reads the context size of the latest main-chain assistant message from the end of the transcript, so it works in the VS Code chat panel too. Limits are in `.claude/hooks/context-budget.json` (`warnTokens` 150000, `stopTokens` 200000, `repeatEveryTokens` 25000; a missing file or bad value falls back to the default).

- Over `warnTokens` the user and Claude get one warning per session. The notices start again when the context has shrunk below the limit and grows back, as after `/compact`. A `warnTokens` at or above `stopTokens` falls back to the defaults.
- Over `stopTokens` a `UserPromptSubmit` message is blocked unless it starts with `/` (`/handoff`, `/compact`, `/clear` pass), and `PostToolUse` tells Claude to stop at the next safe point, run `/handoff` and end the turn, repeated every `repeatEveryTokens`.
- `/handoff` writes the work state as a `Handoff` comment on the work item and prints a start message for a new chat.
- Subagent context is not limited (tool calls with an `agent_id` are ignored), and the hook does nothing on any failure.
- The auto-compact threshold is left alone: a new chat with a handoff loses less detail than a compact.
