# Work Estimate

Part of the `write-user-story` skill. Read it when estimating a story or a Task, when writing the `Tokenien säästö` part of a `Toteutusohje`, and when the user asks for small stories to work on.

Every User Story, and every Task that has its own `Toteutusohje`, gets a work estimate: a size class, the tokens its implementation chat is expected to use, and the model and effort level to run that chat with. The user reads it to pick small stories when their usage limit is running low, so it has to be readable from the work item alone.

## What A Chat Costs

The implementation chat runs from the kickoff prompt to an open pull request, `/create-pull-request` included. Every turn sends the whole context again, so the tokens grow with the number of turns times the size of the context. Estimate from what drives those two:

| Driver | Why it costs |
|---|---|
| Exploring the code | Every file the agent reads stays in the context for the rest of the chat. A `Lähtötilanne` that names the exact files keeps this small. |
| Areas touched | Each area adds its checks from `/create-pull-request`: .NET build and tests, the migration check, lint and build. Their output lands in the context. |
| Browser checks | The largest single cost of a UI story. Every Playwright snapshot or screenshot adds thousands of tokens, and the checklist repeats them for desktop and mobile, both themes and reduced motion. A signed-in view also waits for the user to sign in. |
| Open decisions | Every `Avoimet kysymykset` item, and every choice the `Toteutus` leaves to the agent, costs a round trip with the full context. |
| Iteration risk | Animation tuning, unfamiliar libraries, migrations and flaky tests tend to need several rounds. |
| Fixed overhead | `CLAUDE.md`, the named skills and `/create-pull-request` (work item, review subagent, commits, pull request) cost about the same in every chat. |

## Size Classes

| Size | `Effort` | Typical work | Tokens | Model | Effort level |
|---|---|---|---|---|---|
| XS | 1 | Text in a skill, doc, setting or pipeline variable. 1–2 files, no build, no browser. | under 2 M | Sonnet | `low` |
| S | 2 | A small change in one area. 1–3 files, that area's checks, at most one view in the browser. | 2–5 M | Sonnet | `medium` |
| M | 3 | A feature in one area, or a small change across two. 4–8 files, new tests, or the full browser checklist for one or two views. | 5–12 M | Sonnet; Opus when the `Toteutus` leaves design choices to the agent | `medium` |
| L | 5 | Backend and frontend together, a migration, several views, or a signed-in view. | 12–30 M | Opus | `high` |
| XL | 8 | More than L. | over 30 M | Split it, see *Split Large Stories* | Set per Task |

- **Tokens** are the total the chat processes, including the context read again from the cache on every turn, which is most of it. They are starting values: the order of the classes matters more than the exact numbers. When the user reports what a chat actually used and the class was wrong, adjust this table, as `CLAUDE.md` says for corrections.
- **Pick the larger class** when the work falls between two. When the limit is close, an underestimate hurts more than an overestimate.
- **Model:** Sonnet uses less of the usage limit than Opus and is enough when the `Toteutusohje` already makes the decisions. Recommend Opus only when the agent has to design something or debug something unfamiliar. The user picks the model in the new chat before pasting the kickoff prompt, so the recommendation goes where they see it then (see *Where It Goes*). It covers the implementation. The frontmatter of `/write-user-story` and `/create-pull-request` sets `model: sonnet`, but only for the turn the skill is invoked in: after the user's next message, such as the code review decision, the chat's own model and effort level resume. The code review subagent of `/create-pull-request` gets its own model and effort level from the size (see its `references/code-review.md`).
- **Effort level:** how long the model thinks on every turn, set with `/effort`. It is not the `Effort` field, which holds the size class, so the description writes it out as `effort-taso <level>`. A higher level uses more of the limit on every turn, so recommend the lowest one that does the work: `low` for mechanical text changes, `medium` (the default of the current Sonnet and Opus) when the `Toteutusohje` makes the decisions, and `high` when the agent designs or debugs across areas. Never recommend `xhigh` or `max`: they cost the most, and work that would need them is an XL to split.
- **Set them for the new chat only**, so the user's saved defaults stay put: locally `claude --model <sonnet|opus> --effort <level>`, and in a running chat `s` in the `/model` picker or the `/effort` slider. A level typed as `/effort <level>`, or picked with `Enter`, becomes the default for later chats as well.

## Split Large Stories

Several short chats cost less than one long one, because each starts from a small context.

- **XL:** always split into child Tasks, each with its own `Toteutusohje`, estimate and chat. See [child-tasks.md](child-tasks.md).
- **L:** suggest a split in the draft when the work has a natural seam, such as the backend API first and the UI in a second Task.

The story's estimate then covers all its Tasks, and each Task with its own `Toteutusohje` gets its own estimate.

## Where It Goes

1. **Description:** a `Työmäärä` line after `Muutokset:` and `Lisäksi`, before the `Toteutusohje` rule. After the class, tokens, model and effort level, one sentence names what drives the size, so the user can judge it:

   ```html
   <div><br></div>
   <div><b>Työmäärä:</b> S, noin 2–5 milj. tokenia, malli Sonnet, effort-taso medium. Kaksi komponenttia frontendissä ja yksi näkymä selaimessa.</div>
   ```

   The `.claude/hooks/model-hint.mjs` hook reads this line when a chat starts, so keep the wording `malli <Sonnet|Opus>, effort-taso <level>` exactly.

2. **`Microsoft.VSTS.Scheduling.Effort`** on a User Story: the class number from the table. It makes the size queryable and can be shown on the board cards. Tasks have no `Effort` field, so a Task's estimate lives only in its description.
3. **Draft preview and report:** the `Työmäärä` line, see *Draft Preview* in `SKILL.md`.
4. **Kickoff prompt comment:** the same line above the prompt, with the model and effort level to start the chat with. See [kickoff-prompt.md](kickoff-prompt.md).

When an update changes the scope of a story, update its `Työmäärä` line and `Effort` in the same update.

When `create-pull-request` calls this skill, the work is already done: set the class from the actual diff and the checks that ran, and leave out the `Tokenien säästö` part.

## Tokenien Säästö

The `Toteutusohje` gets a `Tokenien säästö` part (see [implementation-prompt.md](implementation-prompt.md)): instructions specific to this story that let the agent finish in fewer turns and with a smaller context. Write only what holds for this story, usually one to four bullets:

- **What to read.** Which `Lähtötilanne` files are enough to start from, and which areas need no reading because they do not change ("Backendiä ei tarvitse avata: rajapinta ei muutu."). For a large file, name the component or function; for a large skill, the section.
- **Which checks.** The check areas that apply and the ones that do not, as `CLAUDE.md` already scopes them by area ("Backend ei muutu, joten aja vain frontend-tarkistukset.").
- **What to check in the browser.** The exact views, states and interactions, and whether a signed-in view is needed. Ask for all UI changes to be done before the browser check, so the views are gone through once.
- **What is already known.** A fact that the agent would otherwise spend turns finding out, such as a command that is blocked in a cloud session, or a file that looks relevant but is not.

Never drop or weaken a check that `Valmis, kun` or `CLAUDE.md` requires. The browser checklist still covers both viewports, both themes, reduced motion and the console for every view it names; the saving comes from not exploring and from not browsing views that did not change.

The writing chat saves tokens for the next chat too:

- Ask the user the questions you can while writing the story, and leave in `Avoimet kysymykset` only what the user wants to decide later.
- Recommend starting the work in a new chat with the recommended model and effort level, since a new chat carries none of the context of writing the story.

## Finding Small Stories

When the user asks for small stories to work on, for example because their usage limit is running low, run this query with `wit_query` (`action: wiql`), and read the titles, tags and descriptions of the results with `wit_work_item` (`action: get_batch`):

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = 'MyCV'
  AND [System.WorkItemType] = 'User Story'
  AND [System.State] = 'Ready for Development'
  AND [Microsoft.VSTS.Scheduling.Effort] <= 2
ORDER BY [Microsoft.VSTS.Scheduling.Effort]
```

- Raise the limit to `3` when the user also wants medium ones.
- Tasks have no `Effort`: also list the `Ready for Development` Tasks with the same query without the `Effort` condition and with `[System.WorkItemType] = 'Task'`, and read their size from the `Työmäärä` line.
- Stories written before this estimate have no `Effort`. List them separately and offer to estimate them; with the user's approval, add the `Työmäärä` line, `Effort` and a `Tokenien säästö` part in one update each.
- Show each story with its ID, title, size, model and effort level, smallest first, and point to the kickoff prompt in its discussion.
