# Commits

Part of the `create-pull-request` skill. Read it in step 5 of the workflow.

Check the branch before each commit as described in *Never Commit On `main`* in `SKILL.md`.

Split the changes into several commits, one per logical step. A reviewer should be able to read the commits in order and follow the change. Typical order:

1. Database: entities, configurations and the migration
2. Backend: services, DTOs and controllers
3. Generated API types (`src/Frontend/src/generated/openapi.ts`)
4. Frontend: API queries, state, components and pages
5. Skills and documentation (`.claude/skills`, `README.md`, `DESIGN.md`)

Merge steps that only make sense together into one commit, and leave out steps the change does not have. A small change can be a single commit.

Commit message format, in English, with an imperative summary:

| Work item | Format | Example |
|---|---|---|
| User Story | `US-<id>: <summary>` | `US-46: Improve Microsoft sign-in and sign-out experience` |
| Several stories | `US-<id> && US-<id>: <summary>` | `US-41 && US-42: Implement authentication and admin login features` |
| Task | `<id>: <summary>` | `37: Refactor profile queries and forms` |

- Keep the summary line under about 72 characters. Add a body with short bullets when the commit needs more explanation.
- End every message with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, matching the `model` this skill runs on.
- Stage files by name. Never use `git add -A` or `git add .`.
- Never commit secrets or local settings: `.env.local`, `.mcp.json`, user secrets, credentials.
- Leave changes that have nothing to do with this work item unstaged, and mention them in the report.
- `write-user-story` installs a story's new skill when the story is created, leaving `skills-lock.json` uncommitted. Commit that change in the story's pull request, first, as `US-<id>: Add the <name> skill`. If `git diff skills-lock.json` adds a skill that another work item names instead, leave it unstaged.
