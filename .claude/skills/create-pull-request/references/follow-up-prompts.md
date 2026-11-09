# Follow-up Prompts

Part of the `create-pull-request` skill. Read it in step 9 of the workflow, before writing the report.

End the report with prompts that the user copies into a new chat to continue the work. Write them in English, each in its own fenced `text` code block with a one-line Finnish heading above it that says when to use it. Like the kickoff prompt of the `write-user-story` skill, they point to the work item and the pull request instead of repeating them.

**Review fixes**, always. The user pastes it after reviewing the PR:

```text
Act as <role>.
Address the review comments on pull request <PR id> (User Story <id>: <title>).
Read its active comment threads, fix each one on branch <branch>, and reply to each thread with what changed, using repo_pull_request_thread_write (action: reply, status: Closed) so the thread is closed and the reviewer does not have to resolve it.
Ship the fixes with /create-pull-request: it pushes to the same branch and pull request.
Reply to me in Finnish, even though this prompt is in English.
```

**Next work item**, when work remains on the story after this PR:

- If the PR has the `Jatkuu` label, continue the story:

  ```text
  Act as <role>.
  Continue User Story <id>: <title>.
  Wait until pull request <PR id> is completed, then start from an up-to-date main.
  Read the work item in Azure DevOps. Start from what remains in the Tilanne part of its Toteutusohje, and follow the rest of the Toteutusohje.
  Skills: <the skills for what remains, chosen as in references/choosing-skills.md of write-user-story>
  When every Valmis, kun criterion holds, ship the change with /create-pull-request.
  Reply to me in Finnish, even though this prompt is in English.
  ```

- If the story has open child Tasks that this PR does not link, give the kickoff prompt of the next one, in the Task form from `references/kickoff-prompt.md` in `write-user-story`, with the `Wait until pull request <PR id> is completed` line added when it builds on this PR.

Every prompt starts with the role line, chosen as in `references/roles.md` of `write-user-story`: the role of the work it continues, so review fixes keep the role of the original story and a `Jatkuu` prompt uses the role of what remains.

Every prompt, the Task kickoff prompt included, ends with the line `Reply to me in Finnish, even though this prompt is in English.`: the prompts are in English, but the user wants the chat to answer in Finnish.

Leave out the `Skills:` line when the `Toteutusohje` names no skill.

## In Azure DevOps

Post the prompts where the user reads them later, with the same Finnish heading and `text` block as in the report:

- **Review fixes:** add it as a last part of the reviewer comment (see `pull-request.md`), under `## Korjausten aloituskomento`. A follow-up push to an active pull request posts no new one.
- **Next work item:** post it to the discussion of the work item it starts, the story for `Jatkuu` or the next Task, with `wit_work_item_comment_write` (`action: add`, `format: Markdown`). Start the comment with `**Kopioi tämä komento uuteen chattiin, jotta saat parhaiten toteutettua halutun lopputuloksen:**`. Skip it when no work remains.
