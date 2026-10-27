---
name: write-user-story
description: 'Draft and create MyCV User Stories (and optional child Tasks) in Azure DevOps, written in the same style as the existing backlog. Use when asked to write, add, or create a User Story or Task for the MyCV project.'
argument-hint: '[what the story is about]'
user-invocable: true
model: sonnet
---

# Write A User Story

Use this workflow to add a User Story to the `MyCV` project in Azure DevOps organization `valetuominen`, matching how the existing backlog is written.

## Workflow

1. **Understand the change.** If the request is vague, ask one short question. Otherwise draft right away.
2. **Check the ideas page.** If the change matches an idea on the ideas page, start from it. See *Ideas page*.
3. **Pick the parent Feature.** Every User Story has a Feature as its parent. Use the table below, and confirm the Feature still exists with a WIQL query if unsure.
4. **Check for duplicates.** Query existing User Stories for a similar title before drafting a new one. If one exists, suggest updating it or adding a Task under it instead.
5. **Study the code the story touches.** Read the relevant files, components, endpoints and skills, so that the *Toteutusohje* names real paths and builds on how the code works today. See [references/implementation-prompt.md](references/implementation-prompt.md). Then choose the skills for the work; see [references/choosing-skills.md](references/choosing-skills.md).
6. **Show the draft** to the user in the format under *Draft preview*. Do not create anything before the user approves it. Exception: when the `create-pull-request` skill calls this skill, create the story directly, because the user reviews it as part of the pull request.
7. **Create** the story with `wit_work_item_write` (`action: create`), then link it to the parent Feature with `wit_work_item_link_write` (`type: parent`). Create any child Tasks with `wit_work_item_write` (`action: add_child`). Then install any new skill the draft named; see [references/choosing-skills.md](references/choosing-skills.md).
8. **Mark the idea exported** on the ideas page when the story came from one. See *Ideas page*.
9. **Post the kickoff prompt** to the work item's discussion. See [references/kickoff-prompt.md](references/kickoff-prompt.md).
10. **Set the state** as described under *State*.
11. **Report** the new ID and its link: `https://dev.azure.com/valetuominen/MyCV/_workitems/edit/<id>`, the state it was set to, and end with the kickoff prompt.

## Ideas Page

Ideas and story drafts written away from the computer wait in the `ideas` collection of the private `MyCV-ideat` artifact. Find its URL with the `Artifact` tool (`action: list`). Cloud sessions add them, as described in `CLAUDE.md`. Read and write the collection with the `ArtifactData` tool.

- **Before drafting**, list the collection (`action: list`, `collection: ideas`) and look for an idea that matches the request and is not yet `viety`. When one matches, build the draft from its `title`, `descriptionHtml`, `parent`, `tags` and `tasks`, and show the draft for approval as usual.
- **After creating the story**, update that idea (`action: update`, with `if_version` from the list): set `status` to `viety`, `workItemId` to the new ID and `updatedAt` to the current UTC time in ISO 8601. If the approved title or description differs from the idea, update `title` and `descriptionHtml` as well, so the page matches the work item.
- **Stop there.** The work item is the source of truth after this, and the pipelines move its state, so do not mirror later states to the ideas page.
- If `ArtifactData` is not available, give the user the idea's title and the new ID so they can set the status on the page by hand.

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

Read the assignee from the parent Feature instead of writing an email address into this skill, because the repository is mirrored to a public GitHub repository. If the Feature has no assignee, ask the user who the story should be assigned to.

Leave these out, since the backlog does not use them: Acceptance Criteria, Story Points, Priority. Create the story in its default state (`New`) and set the state afterwards, see *State*.

## State

A User Story moves `New` → `Ready for Development` → `In Progress` → `Waiting for Deployment` → `Closed`. A Task that has its own `Toteutusohje` moves `New` → `Ready for Development` → `In Progress` → `Closed`; other Tasks keep their default state (`New`) until the pipeline moves them. This skill sets only the first step; `create-pull-request` and the pipelines set the rest.

When `create-pull-request` called this skill, skip this step: that skill moves the story to `In Progress`. Otherwise, once the story is complete (parent link, child Tasks and the kickoff prompt comment), update `System.State` with `wit_work_item_write` (`action: update`) on the story and on each Task that has its own `Toteutusohje`:

| Story or Task | State |
|---|---|
| Its `Toteutusohje` is complete and has no `Avoimet kysymykset` | `Ready for Development`: the next chat can start from the kickoff prompt right away |
| It has `Avoimet kysymykset`, or the user said it still needs refining | Leave it `New`, and say in the report what keeps it there |

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
| [references/description.md](references/description.md) | Writing or updating the description: opening paragraph, `Muutokset:`, `Lisäksi` |
| [references/implementation-prompt.md](references/implementation-prompt.md) | Writing or updating the `Toteutusohje` |
| [references/choosing-skills.md](references/choosing-skills.md) | Choosing the skills a `Toteutusohje` or prompt names, and installing a new one |
| [references/child-tasks.md](references/child-tasks.md) | The story splits into child Tasks |
| [references/kickoff-prompt.md](references/kickoff-prompt.md) | Ending the report with the kickoff prompt and posting it to the work item (skipped when `create-pull-request` calls this skill) |

## Draft Preview

Show the draft to the user like this before creating anything:

```
User Story: <title>
Parent:     #<feature id> <feature title>
Tags:       <tags, or "(ei tageja)">
Skills:     <installed skills to use; new ones as "<name> (asennetaan: <owner/repo>, <installs> asennusta)", or "(ei skillejä)">
Description:
  <plain-text rendering of the description, or "(tyhjä)">
Toteutusohje:
  <plain-text rendering of the Toteutusohje, part by part>
Tasks:
  - <task title>   (or "ei tehtäviä")
```

## After Creation

Branches and pull requests reference the story as `User Story <id>: <title>`, for example `User Story 46: Sisään- ja uloskirjautumisen UI - parannukset`. Give the user that line, then the kickoff prompt.
