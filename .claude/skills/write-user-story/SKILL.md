---
name: write-user-story
description: 'Draft and create MyCV User Stories (and optional child Tasks) in Azure DevOps, written in the same style as the existing backlog. Use when asked to write, add, or create a User Story or Task for the MyCV project.'
argument-hint: '[what the story is about]'
user-invocable: true
---

# Write A User Story

Use this workflow to add a User Story to the `MyCV` project in Azure DevOps organization `valetuominen`, matching how the existing backlog is written.

## Workflow

1. **Understand the change.** If the request is vague, ask one short question. Otherwise draft right away.
2. **Pick the parent Feature.** Every User Story has a Feature as its parent. Use the table below, and confirm the Feature still exists with a WIQL query if unsure.
3. **Check for duplicates.** Query existing User Stories for a similar title before drafting a new one. If one exists, suggest updating it or adding a Task under it instead.
4. **Show the draft** to the user in the format under *Draft preview*. Do not create anything before the user approves it. Exception: when the `create-pull-request` skill calls this skill, create the story directly, because the user reviews it as part of the pull request.
5. **Create** the story with `wit_work_item_write` (`action: create`), then link it to the parent Feature with `wit_work_item_link_write` (`type: parent`). Create any child Tasks with `wit_work_item_write` (`action: add_child`).
6. **Report** the new ID and its link: `https://dev.azure.com/valetuominen/MyCV/_workitems/edit/<id>`.

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
| `System.Description` | See *Description*, HTML format |
| `System.AreaPath` | `MyCV\Work Items` |
| `System.IterationPath` | `MyCV\Backlog\Work Items` |
| `System.AssignedTo` | `vale.tuominen@gmail.com` |
| `System.Tags` | See *Tags* |

Leave these out, since the backlog does not use them: Acceptance Criteria, Story Points, Priority. Leave the state at its default (`New`).

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

## Description

Every User Story gets a description. Write it in Finnish, in this structure:

1. **Opening paragraph.** One or two sentences on *what* changes and *why*, in the passive present tense (`Parannetaan...`, `Toteutetaan...`, `Päivitetään...`, `Luodaan...`, `Muutetaan...`). Give the reason with `jotta...` or `...vuoksi`.
2. **`Muutokset:` list.** The concrete changes, one per bullet. Each bullet is a full sentence that a reader understands without opening the code: describe what the user or developer sees or gets, not file or class names. Aim for 3 to 7 bullets.
3. **`Lisäksi` line (optional).** One sentence for side work that lands in the same PR but is not part of the story's main purpose.

Leave out acceptance criteria, implementation steps and test plans.

When the story is written after the work is done, base the description on the actual changes: read the linked PR's commits and diff rather than guessing from the title. When it is written before the work, describe the planned changes, and update the description afterwards if the work ended up different.

Example (User Story 46):

```html
<div>Parannetaan Microsoft-kirjautumisen ja uloskirjautumisen käyttökokemusta, jotta käyttäjä tietää koko ajan, mitä kirjautumisessa tapahtuu, ja osaa toimia, jos kirjautuminen ei onnistu.</div>
<div><br></div>
<div>Muutokset:</div>
<div><ul>
<li>Kirjautumisen alkaessa näytetään viesti, joka kertoo käyttäjän siirtyvän Microsoftin kirjautumiseen. Jos uudelleenohjaus kestää tavallista pidempään, käyttäjää neuvotaan lataamaan sivu uudelleen.</li>
<li>Peruttu ja epäonnistunut kirjautuminen erotetaan toisistaan omilla viesteillään, ja käyttäjä pääsee niistä takaisin CV:hen.</li>
<li>Uloskirjautumisen jälkeen näytetään hetken näkyvä ilmoitus onnistuneesta uloskirjautumisesta.</li>
<li>Puuttuva kirjautumiskonfiguraatio näytetään selkeänä virheviestinä.</li>
</ul></div>
<div>Lisäksi projektin skillit siirretään <code>.github/skills</code>-kansiosta <code>.claude/skills</code>-kansioon.</div>
```

For a small or ongoing story, the opening paragraph and a shorter list are enough:

```html
<div>Päivitetään sovellus .NET 10 -versioon, koska nykyisen .NET 8 -version tuki päättyy lähikuukausina.</div>
<div><br></div>
<div>Muutokset:</div>
<div><ul>
<li>Kaikkien backend-projektien kohdeversioksi vaihdetaan .NET 10.</li>
<li>NuGet-paketit päivitetään .NET 10 -yhteensopiviin versioihin.</li>
</ul></div>
```

## Child Tasks (optional)

Add Tasks only when the story splits into clearly separate pieces of work, such as one per endpoint or one per table.

- **Title:** `<Toimenpide> - <Kohde>` or `<Kohde> - <Toimenpide>`, for example `GET - Profile - REST API`, `Tietokantataulun luonti - Profile`, `Profile - Queries`.
- **Description:** optional. Use a field list, an endpoint in a code block, or one sentence:

```html
<div>Kentät:</div><div><ul><li>Id</li><li>FullName</li><li>CreatedAt</li></ul></div>
```

```html
<pre><code>GET /api/Profile/{profileId}</code></pre>
```

Use the same area path, iteration path and assignee as the story. Tag each Task with the tags from *Tags* that match the Task's own work, which is usually a subset of the story's tags (for example `Backend` for an endpoint Task under a `Backend; Database` story).

## Draft Preview

Show the draft to the user like this before creating anything:

```
User Story: <title>
Parent:     #<feature id> <feature title>
Tags:       <tags, or "(ei tageja)">
Description:
  <plain-text rendering of the description, or "(tyhjä)">
Tasks:
  - <task title>   (or "ei tehtäviä")
```

## After Creation

Branches and pull requests reference the story as `User Story <id>: <title>`, for example `User Story 46: Sisään- ja uloskirjautumisen UI - parannukset`. Give the user that line so they can use it for the branch and PR.
