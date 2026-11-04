# Roles

Part of the `write-user-story` skill, and used by `create-pull-request`. Read it when choosing the role line of a kickoff or follow-up prompt, and when starting either skill.

A fresh chat knows nothing about the kind of work ahead. A one-line role at the top of the prompt tells it which expertise, priorities and quality bar to apply, before it reads the work item. Write the role in English, as the first line of the prompt, in the form `Act as <role>.`

## Choosing The Role

Pick the role from the work item's tags and the `Toteutusohje`, not from its title. Name the role that fits most of the work. When a story spans areas, join at most two roles with "and" and let the larger part come first.

| Work | Role line |
|---|---|
| Frontend UI: layout, styling, motion, accessibility, theme | `Act as a UI designer and front-end developer.` |
| Frontend logic: RTK Query, Jotai state, routing, API calls from the UI | `Act as a senior front-end developer (React, TypeScript).` |
| Backend: controllers, services, DTOs, validation | `Act as a senior .NET backend developer.` |
| Database: entities, migrations, DbContext | `Act as a senior .NET backend developer with EF Core and data-modelling expertise.` |
| Backend and frontend together | `Act as a full-stack developer (.NET, React, TypeScript).` |
| Pipeline: Azure DevOps and GitHub pipelines | `Act as a DevOps engineer who maintains Azure DevOps pipelines.` |
| Skills: Claude skills and other AI agent instructions | `Act as a prompt engineer who writes clear, tested AI agent instructions.` |
| Versioning: framework, package and tool upgrades | `Act as a senior developer doing a careful framework and dependency upgrade.` |
| Security audit: authentication, authorization or another security review | `Act as an application security engineer who audits authentication and authorization.` |
| Investigation only, no code to merge | `Act as a technical analyst who investigates before recommending.` |

For a security audit that is not about authentication, replace `authentication and authorization` in the role line with the audited area, for example `input handling and data exposure`.

If none fits, write a role in the same style: a job title and the one thing it cares most about. Do not invent a persona with a name or a backstory.

## Roles Of The Skills Themselves

The chat that runs a skill also acts in a role. The full wording lives only in that skill's `SKILL.md`, so it cannot drift:

| Skill | Role |
|---|---|
| `write-user-story` | Product owner and technical analyst. See the top of its `SKILL.md`. |
| `create-pull-request` | Senior developer, code reviewer and release engineer. See its *Role* section. |

## Rules

- **One line.** The role is not a place for instructions. Rules, steps and decisions stay in the `Toteutusohje`.
- **Matches the work, not the skill.** A kickoff prompt for a UI story says `Act as a UI designer and front-end developer.`, even though the chat will end by running `/create-pull-request`, which brings its own reviewer role for that step.
- **Follow-up prompts keep the role of the work they continue.** A review fix prompt uses the role of the original story; for a `Jatkuu` continuation, use the role of what remains.
- **Never overrides `CLAUDE.md`.** A role changes the viewpoint and the priorities, not the repository's rules, checks or `Never` list.
