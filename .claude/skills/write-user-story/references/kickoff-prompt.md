# Kickoff Prompt

Part of the `write-user-story` skill. Read it in step 7, when posting the kickoff prompt, and when ending the report with it.

End the report with a prompt that the user copies into a new chat to start the work. Write it in English, in its own fenced `text` code block so it copies cleanly, one block per work item that is worked on in its own chat: the story, or each Task that has its own `Toteutusohje`.

The prompt points to the work item instead of repeating the `Toteutusohje`, so the instructions live in one place. It adds only what lets the new chat start right away:

```text
Implement User Story <id>: <title>.
Read the work item in Azure DevOps and follow the Toteutusohje at the end of its description. Ask its Avoimet kysymykset before you start.
Branch: feat/US-<id>_<Title_slug>
Skills: <the skills its Lähtötilanne names>
When every Valmis, kun criterion holds, ship the change with /create-pull-request.
```

- Build the branch name with the slug rules in `references/branch.md` of the `create-pull-request` skill.
- For a Task, start with `Implement Task <id>: <title> (part of User Story <parent id>: <parent title>).` and use the Task branch pattern `feat/<id>_<Title_slug>`.
- Leave out the `Skills:` line when the `Toteutusohje` names no skill, and the `Avoimet kysymykset` sentence when it has none.
- Skip the kickoff prompt when the story was created for work that is already done, as when `create-pull-request` calls this skill. That skill gives its own follow-up prompts.
- Give the kickoff prompt even when the work continues in the same chat, so the work item carries it for a later chat.

## Work Item Comment

Also post each kickoff prompt to the discussion of the work item it starts, so it can be copied from Azure DevOps later. Use `wit_work_item_comment_write` (`action: add`, `format: Markdown`) right after creating the work item, with a Finnish heading and the same `text` block:

````markdown
**Kopioi tämä komento uuteen chattiin, jotta saat parhaiten toteutettua halutun lopputuloksen:**

```text
<the kickoff prompt>
```
````

When the prompt later changes, for example because the branch or the skills change, add a new comment that starts with `Päivitetty aloituskomento` and keep the old one.
