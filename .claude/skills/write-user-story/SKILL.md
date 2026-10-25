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
2. **Pick the parent Feature.** Every User Story has a Feature as its parent. Use the table below, and confirm the Feature still exists with a WIQL query if unsure.
3. **Check for duplicates.** Query existing User Stories for a similar title before drafting a new one. If one exists, suggest updating it or adding a Task under it instead.
4. **Study the code the story touches.** Read the relevant files, components, endpoints and skills, so that the *Toteutusohje* names real paths and builds on how the code works today. See *Implementation Prompt*. Then choose the skills for the work; see *Choosing Skills*.
5. **Show the draft** to the user in the format under *Draft preview*. Do not create anything before the user approves it. Exception: when the `create-pull-request` skill calls this skill, create the story directly, because the user reviews it as part of the pull request.
6. **Create** the story with `wit_work_item_write` (`action: create`), then link it to the parent Feature with `wit_work_item_link_write` (`type: parent`). Create any child Tasks with `wit_work_item_write` (`action: add_child`). Then install any new skill the draft named; see *Choosing Skills*.
7. **Report** the new ID and its link: `https://dev.azure.com/valetuominen/MyCV/_workitems/edit/<id>`, and end with the kickoff prompt. See *Kickoff Prompt*.

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
| `System.AssignedTo` | Copy the `uniqueName` of the parent Feature's `System.AssignedTo` |
| `System.Tags` | See *Tags* |

Read the assignee from the parent Feature instead of writing an email address into this skill, because the repository is mirrored to a public GitHub repository. If the Feature has no assignee, ask the user who the story should be assigned to.

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
4. **`Toteutusohje` section.** A prompt for an AI agent that implements the story. See *Implementation Prompt*.

Keep implementation steps and done criteria out of the first three parts. They belong in the `Toteutusohje`, so the top of the description stays readable for a person.

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

## Implementation Prompt

The description ends with a `Toteutusohje` section: a prompt for an AI agent. The test is that the user can open a new chat, paste only the kickoff prompt (see *Kickoff Prompt*), and the agent understands the goal, the approach and when the work is done, from the story alone. The agent has `CLAUDE.md`, the repository and the project skills, but none of the conversation in which the story was written.

Write it in Finnish, in these parts:

| Part | Content |
|---|---|
| `Tavoite` | What the finished work achieves and why, as the user or developer experiences it. One short paragraph. |
| `Lähtötilanne` | How the code works today where the change lands: the real files, components, hooks, endpoints, entities and settings involved, with paths. Name the patterns the change should follow and the skills to use, chosen as in *Choosing Skills*, with what each one is for. |
| `Toteutus` | The approach as numbered steps, in the order the work should go. Record every decision already made with the user and the alternatives that were ruled out, with the reason, so the agent does not reopen them. Describe the behaviour and structure, not line-by-line code, and leave the rest to the agent's judgment. |
| `Rajaukset` | What is out of scope or must not change, such as related features, other stories' work, or existing behaviour that has to stay. |
| `Valmis, kun` | Observable done criteria: what the user sees or can do, edge cases and error states that work, and the checks and browser views from `/create-pull-request` that apply to this change. End with "Toimita muutos `/create-pull-request`-skillillä." |
| `Avoimet kysymykset` | Optional. Questions the agent must ask the user before starting, because the answer changes the work. Leave the part out when there are none. |

Rules:

- **Self-contained.** No references to the chat ("kuten sovittiin"), to plans in git-ignored files, or to anything else the next agent cannot read. Copy the needed content into the prompt.
- **Verified.** Every path, name and endpoint in it exists in the code today, or is clearly marked as new (`luodaan uusi ...`). Read the code before writing; never guess a path from memory.
- **No repeats of `CLAUDE.md`.** Leave out the general workflow, branch and commit rules and the full checklist. Mention only what is specific to this story.
- **Safe to share.** No secrets, email addresses, or real tenant and client IDs. Name a setting by its key, never by its value.
- **Sized to the work.** A small upgrade needs a few lines per part; a new feature can need a few hundred words. Every sentence should change what the agent does.

Format it as HTML after the rest of the description, separated with a rule. Use `<b>` labels for the parts, lists for steps and criteria, and `<code>` for paths and names:

```html
<div><br></div>
<hr>
<div><b>Toteutusohje</b></div>
<div><br></div>
<div><b>Tavoite</b></div>
<div>Käyttäjä tietää koko kirjautumisen ajan, mitä tapahtuu, ja osaa toimia, jos kirjautuminen ei onnistu. Nyt kirjautumisen alkaessa ja epäonnistuessa näkymä jää tyhjäksi.</div>
<div><br></div>
<div><b>Lähtötilanne</b></div>
<div><ul>
<li>Microsoft-kirjautuminen alkaa <code>src/Frontend/src/auth/entraAuth.ts</code>-moduulista, ja paluu käsitellään komponentissa <code>src/Frontend/src/auth/SignInCallback.tsx</code>.</li>
<li>Kirjautumisen tilaviestit ovat komponentissa <code>src/Frontend/src/auth/SignInMessage.tsx</code>. Noudata sen rakennetta ja <code>/setup-frontend</code>-skillin ohjeita.</li>
</ul></div>
<div><b>Toteutus</b></div>
<div><ol>
<li>Näytä kirjautumisen alkaessa viesti siirtymisestä Microsoftin kirjautumiseen. Jos uudelleenohjaus kestää yli 5 sekuntia, neuvo lataamaan sivu uudelleen.</li>
<li>Erota peruttu ja epäonnistunut kirjautuminen omiksi viesteikseen, ja anna molemmista linkki takaisin CV:hen. Virheen teknisiä tietoja ei näytetä käyttäjälle, vaan ne kirjataan konsoliin.</li>
</ol></div>
<div><b>Rajaukset</b></div>
<div><ul>
<li>Kirjautumisen tekninen toteutus ja backendin autentikaatio eivät muutu.</li>
</ul></div>
<div><b>Valmis, kun</b></div>
<div><ul>
<li>Aloitettu, peruttu ja epäonnistunut kirjautuminen näyttävät oikean viestin työpöydällä ja mobiilissa, molemmissa teemoissa.</li>
<li>Lint ja build menevät läpi, eikä selaimen konsolissa ole uusia virheitä.</li>
<li>Toimita muutos <code>/create-pull-request</code>-skillillä.</li>
</ul></div>
```

When the story is created after the work is done (as `create-pull-request` does), write the `Toteutusohje` from the diff: it then describes how the work was done, so a follow-up chat can continue from it.

## Choosing Skills

Pick the skills the next agent needs to reach the story's goal, and name them in `Lähtötilanne` with what each one is for. Search what is installed before looking for anything new.

1. **Name the goal's domains.** List what the work needs know-how for, such as React component APIs, animation, accessibility, EF Core migrations or pipeline YAML.
2. **Search the installed skills first.** Check the skill list of this session (project `.claude/skills/`, user `~/.claude/skills/` and `~/.agents/skills/`, plugins) and both `skills-lock.json` files (root and `src/Frontend`). Read the `SKILL.md` of each candidate, not only its description. The project skills (`/create-cv-skills`, `/setup-frontend`) come first for the parts they cover; add a general skill only where it adds something they don't.
3. **Look for a new skill only for a domain no installed skill covers.** Search with `npx skills find <keywords>` and the [skills.sh](https://skills.sh/) leaderboard; if the command is blocked, search skills.sh with WebFetch. Vet each candidate as the `find-skills` skill says: 1K+ installs, a known source such as `vercel-labs` or `anthropics`, and read its `SKILL.md` before naming it. List each new skill in the draft with its source and install count, so the user's approval of the draft covers installing it.
4. **Install it once the draft is approved.** From the repository root run `npx skills add <owner/repo> --skill <name> --agent claude-code -y`, check that the root `skills-lock.json` lists it, and read its `SKILL.md`. If the command is blocked, give the user the command to run and wait. The install leaves `skills-lock.json` changed but uncommitted; the change is committed in this story's pull request. So the `Toteutus` names the skill as already installed ("lue se ennen rajapinnan suunnittelua" when it shapes the approach), `Valmis, kun` gets "`skills-lock.json` sisältää `<name>`-skillin", and the story gets the `Skills` tag. When `create-pull-request` calls this skill, the work is already done: install nothing, and make a skill that the remaining work needs the first `Toteutus` step instead.
5. **Keep it short.** Usually one to three skills. Every named skill is loaded into the next chat, so leave out any that would not change the work. If nothing fits and nothing worth installing turns up, name none and say so in the draft.

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

A Task that is worked on in its own chat and pull request gets its own `Toteutusohje`, written the same way but limited to the Task. It names the parent story for the bigger picture instead of repeating it.

Use the same area path, iteration path and assignee as the story. Tag each Task with the tags from *Tags* that match the Task's own work, which is usually a subset of the story's tags (for example `Backend` for an endpoint Task under a `Backend; Database` story).

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

## Kickoff Prompt

End the report with a prompt that the user copies into a new chat to start the work. Write it in English, in its own fenced `text` code block so it copies cleanly, one block per work item that is worked on in its own chat: the story, or each Task that has its own `Toteutusohje`.

The prompt points to the work item instead of repeating the `Toteutusohje`, so the instructions live in one place. It adds only what lets the new chat start right away:

```text
Implement User Story <id>: <title>.
Read the work item in Azure DevOps and follow the Toteutusohje at the end of its description. Ask its Avoimet kysymykset before you start.
Branch: feat/US-<id>_<Title_slug>
Skills: <the skills its Lähtötilanne names>
When every Valmis, kun criterion holds, ship the change with /create-pull-request.
```

- Build the branch name with the slug rules in *Branch* of the `create-pull-request` skill.
- For a Task, start with `Implement Task <id>: <title> (part of User Story <parent id>: <parent title>).` and use the Task branch pattern `feat/<id>_<Title_slug>`.
- Leave out the `Skills:` line when the `Toteutusohje` names no skill, and the `Avoimet kysymykset` sentence when it has none.
- Skip the kickoff prompt when the story was created for work that is already done, as when `create-pull-request` calls this skill. That skill gives its own follow-up prompts.
