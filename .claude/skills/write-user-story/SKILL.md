---
name: write-user-story
description: 'Draft and create MyCV User Stories (and optional child Tasks) in Azure DevOps, written in the same style as the existing backlog, each with a work size and token estimate. Use when asked to write, add, or create a User Story or Task for the MyCV project, or to find small stories to work on when the usage limit is running low.'
argument-hint: '[what the story is about]'
user-invocable: true
model: sonnet
---

# Write A User Story

Use this workflow to add a User Story to the `MyCV` project in Azure DevOps, matching how the existing backlog is written.

Act as a product owner and technical analyst: clarify the goal, read the code before promising anything, and write a brief that a different chat can follow alone. The role of the chat that will do the work goes on the first line of the kickoff prompt; see [references/roles.md](references/roles.md).

## Workflow

1. **Understand the change.** If the request is vague, ask one short question. Otherwise draft right away.
2. **Check the ideas page.** If the change matches an idea on the ideas page, start from it. See *Ideas page*.
3. **Pick the parent Feature.** Every User Story has a Feature as its parent. Use the table below, and confirm the Feature still exists with a WIQL query if unsure.
4. **Check for duplicates.** Query existing User Stories for a similar title before drafting a new one. If one exists, suggest updating it or adding a Task under it instead.
5. **Study the code the story touches.** When `graphify-out/graph.json` exists, first ask the code graph where the change lands (`python -m graphify query "<question>" --budget 1500`; see *Code graph (Graphify)* in `CLAUDE.md`), then read the relevant files, components, endpoints and skills it points to (otherwise use Grep and Glob), so that the *Toteutusohje* names real paths and builds on how the code works today. See [references/implementation-prompt.md](references/implementation-prompt.md). Then choose the skills for the work; see [references/choosing-skills.md](references/choosing-skills.md).
6. **Estimate the work:** the size class, tokens, model and effort level, and the `Tokenien säästö` part of the `Toteutusohje`. See [references/estimate.md](references/estimate.md).
7. **Show the draft** to the user in the format under *Draft preview*. Do not create anything before the user approves it. Exception: when the `create-pull-request` skill calls this skill, create the story directly, because the user reviews it as part of the pull request.
8. **Create** the story with `wit_work_item_write` (`action: create`), with `Effort` set as under *Fields*, then link it to the parent Feature with `wit_work_item_link_write` (`type: parent`). Create any child Tasks with `wit_work_item_write` (`action: add_child`). Attach any screenshot the user gave with the request; see *Screenshots*. Then install any new skill the draft named; see [references/choosing-skills.md](references/choosing-skills.md). If the Azure DevOps tools are unavailable, as in a cloud session outside the `MyCV` environment, save the approved draft to the ideas page with status `luonnos` instead, and stop there.
9. **Delete the idea** from the ideas page when the story came from one. See *Ideas page*.
10. **Always post the kickoff prompt** to the work item's discussion once the work item exists, for every story and every Task with its own `Toteutusohje`, with no exception: also when the work is already done, when `create-pull-request` called this skill, and when the work continues in the same chat. A story without the comment is unfinished. See [references/kickoff-prompt.md](references/kickoff-prompt.md).
11. **Set the state** as described under *State*.
12. **Report** the new ID and its link: `<project url>/_workitems/edit/<id>` (`projectUrl` in `.claude/azure-devops.json`), the state it was set to and the `Työmäärä` line, and end with the kickoff prompt (not when `create-pull-request` called this skill: it gives its own follow-up prompts).

## Ideas Page

Ideas that were not ready to become stories, and drafts from cloud sessions that cannot reach Azure DevOps, wait in the `ideas` collection of the private `MyCV-ideat` artifact, as described in `CLAUDE.md` (*Ideas page*). Find its URL with the `Artifact` tool (`action: list`). Read and write the collection with the `ArtifactData` tool. This skill runs the same way in a local session and in a cloud session in the `MyCV` environment.

- **Before drafting**, list the collection (`action: list`, `collection: ideas`) and look for an idea that matches the request. When one matches, build the draft from its `title`, `descriptionHtml`, `parent`, `tags` and `tasks`, and show the draft for approval as usual.
- **After creating the story**, once the story exists with its parent link, delete that idea (`action: delete`, with `if_version` from the list). The work item is the source of truth from then on, so the ideas page holds only ideas that still need a story. Never delete the idea before the story is created, and do not delete it when the story creation failed or the draft was saved as `luonnos`.
- **Stop there.** The pipelines move the work item's state, so do not mirror later states to the ideas page.
- If `ArtifactData` is not available, give the user the idea's title and the new ID so they can delete the idea on the page by hand.

## Screenshots

When the user gives a screenshot with the request, attach it to the story and show it in the description, so the next chat and the user see what the story started from. See [references/screenshots.md](references/screenshots.md). The image stays in Azure DevOps and never reaches the public GitHub mirror, so do not copy it into the repository.

If the upload fails, the story is still valid: say in the report that the image is missing, and do not put it anywhere else. A draft saved to the ideas page has no work item, so it takes no attachment: say in the report that the image was not saved, so the user can give it again when the story is created.

## Parent Features

First decide which Epic the work belongs to. The Epic depends on whether the story builds something new or improves something that already exists:

| Epic | ID | Use for |
|---|---|---|
| Backend & Data | 1 | Building **new** backend or database functionality, such as new REST APIs, services or entities |
| Frontend | 24 | Building **new** frontend functionality, such as new pages, components or API calls from the UI |
| Kokonaisuuksien parantelut | 43 | **Updating or improving** an existing feature area, such as authentication |
| Järjestelmän ylläpito ja tekninen kehittäminen | 9 | Maintenance and technical work that is not product functionality |

Then pick the Feature under that Epic:

| Feature | ID | Epic | Use for |
|---|---|---|---|
| Backend Core & Architecture | 2 | 1 | New Web API projects, services, controllers, REST APIs, error handling, backend multi-language |
| Data Model & Database Foundation | 5 | 1 | New entities, migrations, DbContext, database identifiers |
| Pohjatyöt ja komponentit | 25 | 24 | New frontend setup, npm packages, components, UI and API calls from the UI |
| Autentikaatio | 44 | 43 | Updates and improvements to sign-in, sign-out and authentication |
| Yleisten ylläpitotöiden hallinta | 10 | 9 | Pipelines, version upgrades, formatting, folder structure, performance, tooling |

When an improvement concerns an existing area that has no Feature under Epic #43 yet, suggest a new Feature under #43 named after that area (in the same style as `Autentikaatio`) and ask the user before creating it. Tag a new Feature with the tags that its User Stories will cover. When a new story adds a tag that its parent Feature or Epic does not have yet, add that tag to them as well. In any other unclear case, ask the user which Feature to use.

## Fields

| Field | Value |
|---|---|
| `System.WorkItemType` | `User Story` |
| `System.Title` | See *Title* |
| `System.Description` | See [references/description.md](references/description.md), HTML format |
| `System.AreaPath` | `MyCV\Work Items` |
| `System.IterationPath` | `MyCV\Backlog\Work Items` |
| `System.AssignedTo` | Copy the `uniqueName` of the parent Feature's `System.AssignedTo` |
| `System.Tags` | See *Tags* |
| `Microsoft.VSTS.Scheduling.Effort` | The size class number, see [references/estimate.md](references/estimate.md). User Stories only; Tasks have no such field |

Read the assignee from the parent Feature instead of writing an email address into this skill, because the repository is mirrored to a public GitHub repository. If the Feature has no assignee, ask the user who the story should be assigned to.

Leave these out, since the backlog does not use them: Acceptance Criteria, Story Points, Priority. Create the story in its default state (`New`) and set the state afterwards, see *State*.

## State

A User Story moves `New` → `Ready for Development` → `In Progress` → `Waiting for Deployment` → `Closed`. A Task that has its own `Toteutusohje` moves `New` → `Ready for Development` → `In Progress` → `Closed`; other Tasks keep their default state (`New`) until the pipeline moves them. This skill sets only the first step; `create-pull-request` and the pipelines set the rest.

A User Story can also be `Waiting for Predecessor`: it depends on another story (Predecessor link, `System.LinkTypes.Dependency-Reverse`; the other story has the Successor link, `Dependency-Forward`) that is not done yet. A predecessor is done when it is `Waiting for Deployment`, `Closed` or `Removed`. A new story with an unfinished predecessor gets this state instead of `Ready for Development` or `New`, whether or not it has `Avoimet kysymykset`. When its last unfinished predecessor is merged, the `main` pipeline moves the story to `New` if its description mentions `Avoimet kysymykset`, and to `Ready for Development` otherwise (`templates/work-item-state-job.yml`). Tasks have no such state, so only stories use it. Never set it on a story whose predecessors are all done. The pipeline releases successors only after a merge, so when you move a story to `Removed` (investigation only, no pull request), release its `Waiting for Predecessor` successors yourself with the same rule, once all of their predecessors are done.

A User Story can also be `On Hold`: it is valid work that is deliberately not scheduled, for example a story that only matters if the app is opened to other users (like the privacy notice). Move a story there only when the user asks. Leave it out of the estimate and "small stories to work on" lists; when work on it starts, `create-pull-request` moves it to `In Progress`.

When `create-pull-request` called this skill, skip this step: that skill moves the story to `In Progress`. Otherwise, once the story is complete (parent link, child Tasks and the kickoff prompt comment), update `System.State` with `wit_work_item_write` (`action: update`) on the story and on each Task that has its own `Toteutusohje`:

| Story or Task | State |
|---|---|
| Its `Toteutusohje` is complete and has no `Avoimet kysymykset` | `Ready for Development`: the next chat can start from the kickoff prompt right away |
| It has `Avoimet kysymykset`, or the user said it still needs refining | Leave it `New`, and say in the report what keeps it there |
| It has an unfinished predecessor, whatever the rows above say | `Waiting for Predecessor`, and say in the report which story it waits for |

Whenever you update the description of a `New` story, or of a `New` Task with its own `Toteutusohje`, so that its `Avoimet kysymykset` are answered and its `Toteutusohje` is complete, move it to `Ready for Development` in the same update.

## Tags

Every User Story gets one or more of these tags.

Code areas, based on which parts of the codebase the work touches:

- `Frontend`: the React client (`src/Frontend`)
- `Backend`: the ASP.NET Core API, services and controllers
- `Database`: entities, migrations, DbContext or the database schema

Tooling and maintenance:

- `Pipeline`: Azure DevOps and GitHub pipelines
- `Skills`: GitHub Copilot and Claude skills and other AI agent instructions
- `Versioning`: framework, package and tool version upgrades

Combine tags when the work spans several, separated with a semicolon, for example `Backend; Database` or `Versioning; Backend`. Do not invent other tags. If none fits, ask the user whether a new tag is needed.

## Title

- Write in Finnish.
- Use a short noun phrase that names the change, not a "As a user I want..." sentence.
- When the story is one part of a larger topic, use `<Aihe> - <tarkennus>` with spaces around the hyphen.
- No trailing period.

Examples from the backlog:

- `Autentikaatio - Backend`
- `Autentikaatio - Frontend`
- `.NET 10 - päivitys`
- `Pipeline - Ylläpito ja kehittäminen`
- `Sisään- ja uloskirjautumisen UI - parannukset`
- `Entiteettien tunnisteiden muuttaminen GUID-pohjaisiksi`
- `Tietokantataulujen entiteetit ja niiden migraatiot`

## Description And Toteutusohje

The rules and examples for these live in reference files. Read each one when the workflow reaches it:

| File | Read when |
|---|---|
| [references/description.md](references/description.md) | Writing or updating the description: opening paragraph, `Muutokset:`, `Lisäksi`, `Työmäärä` |
| [references/implementation-prompt.md](references/implementation-prompt.md) | Writing or updating the `Toteutusohje` |
| [references/estimate.md](references/estimate.md) | Estimating the size, tokens, model and effort level, writing the `Tokenien säästö` part, and finding small stories |
| [references/choosing-skills.md](references/choosing-skills.md) | Choosing the skills a `Toteutusohje` or prompt names, and installing a new one |
| [references/child-tasks.md](references/child-tasks.md) | The story splits into child Tasks |
| [references/roles.md](references/roles.md) | Choosing the `Act as ...` role line that starts a kickoff prompt |
| [references/kickoff-prompt.md](references/kickoff-prompt.md) | Posting the kickoff prompt to the work item (always) and ending the report with it (skipped only when `create-pull-request` calls this skill) |
| [references/screenshots.md](references/screenshots.md) | The user gave a screenshot with the request |

## Draft Preview

Show the draft to the user like this before creating anything:

```
User Story: <title>
Parent:     #<feature id> <feature title>
Tags:       <tags, or "(ei tageja)">
Työmäärä:   <koko>, noin <x–y> milj. tokenia, malli <Sonnet|Opus>, effort-taso <low|medium|high> (Effort-kenttä <n>): <what drives the size>
Rooli:      <the role line of the kickoff prompt, e.g. "Act as a UI designer and front-end developer.">
Skills:     <installed skills to use; new ones as "<name> (asennetaan: <owner/repo>, <installs> asennusta)", or "(ei skillejä)">
Description:
  <plain-text rendering of the description, or "(tyhjä)">
Toteutusohje:
  <plain-text rendering of the Toteutusohje, part by part>
Tasks:
  - <task title>   (<koko>, when it has its own Toteutusohje; or "ei tehtäviä")
```

## Small Stories

When the user asks for small stories to work on, for example because their usage limit is running low, query them by `Effort` as described under *Finding Small Stories* in [references/estimate.md](references/estimate.md).

## After Creation

Branches and pull requests reference the story as `User Story <id>: <title>`, for example `User Story 46: Sisään- ja uloskirjautumisen UI - parannukset`. Give the user that line, then the kickoff prompt.
