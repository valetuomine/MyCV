# Pull Request

Part of the `create-pull-request` skill. Read it in step 8 of the workflow, unless the branch already has an active pull request.

Create the PR with `repo_pull_request_write` (`action: create`):

| Parameter | Value |
| --- | --- |
| `project` | `MyCV` |
| `repositoryId` | `MyCV` |
| `sourceRefName` | `refs/heads/<branch>` |
| `targetRefName` | `refs/heads/main` |
| `title` | See below |
| `description` | See below |
| `workItems` | The linked work item IDs, space-separated |

Title, using the work item title as written in Azure DevOps:

| Work item | Format | Example |
| --- | --- | --- |
| User Story | `User Story <id>: <title>` | `User Story 46: Sisään- ja uloskirjautumisen UI - parannukset` |
| Several stories | `User Story <id> & User Story <id>: <shared title>` | `User Story 41 & User Story 42: Autentikaatio` |
| Task | `Task <id>: <title>` | `Task 37: Profile - Queries` |
| Follow-up PR | add ` - <tarkennus>` | `User Story 38: Käyttöliittymän UI-muutokset ja parannukset - Taustan UI-parannukset` |

Description: only the commit list, in the same format as the earlier PRs, so that the squash merge commit on `main` looks the same as before. One link per commit, oldest first, separated by blank lines, followed by the attribution line:

```markdown
- [US-46: Move project skills from .github/skills to .claude/skills](<project url>/_git/MyCV/commit/<full sha>?refName=refs/heads/<branch>)

- [US-46: Improve Microsoft sign-in and sign-out experience](<project url>/_git/MyCV/commit/<full sha>?refName=refs/heads/<branch>)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Get each full SHA with `git log --reverse --format='%H %s' origin/main..HEAD` after pushing (`azure/main` in a cloud session).

Labels: when the PR is a follow-up for a story that is still being worked on (like User Story 38, which had several PRs), pass `labels: ["Jatkuu"]`. The pipeline then leaves the story `In Progress` after the merge. See [after-merge.md](after-merge.md).

## Work Item State

Do not move the linked work items yourself. Creating the PR starts the PR pipeline, whose first stage (`templates/work-item-in-progress-job.yml`, no dependencies) moves them to `In Progress` by the rule in [work-item.md](work-item.md) and writes `Tila: In Progress: Pull request <n> on auki.` in the same update, soon after the PR is created. If an item has still not moved when you write the report, do not move it yourself either: the run may be queued or may have failed. Say in the report which item has not moved yet and that the PR pipeline run should be checked.

Every description update (`Muutokset`, `Toteutusohje`, a decision or departure to record) belongs to step 2, before the PR is created, so that nothing you write races with the pipeline. If something must still be written after the PR exists:

1. Read the work item again right before the update, and build the new description from that fresh copy, so that the `Tila` line the pipeline wrote stays as it is.
2. Send it with `wit_work_item_write` (`action: update`), with a `test` operation on `/rev` holding the revision you just read as the first operation.
3. If the update is rejected because the revision changed, the pipeline moved the item meanwhile, which is expected and not worth reporting: repeat steps 1 and 2 once. If that is rejected too, stop and say in the report which change is missing from the description.

## Screenshots

Only when the change is a Frontend UI change and [checks.md](checks.md) produced screenshots. Otherwise skip this part and leave the *Kuvakaappaukset* section out of the comment. Do it right after creating the PR, because the upload needs the PR ID.

The images go to the reviewer comment, never to the description, because the description ends up in the public GitHub mirror through the squash commit. Name each file `us-<id>-<view>-<device>.png`, in ASCII and unique within the PR. Upload each image as a pull request attachment, with the Bash tool (Git Bash), because the command uses bash syntax:

```bash
project=$(node -p "require('./.claude/azure-devops.json').projectUrl")
curl -sS -X POST \
  -H "Authorization: Basic $AZURE_DEVOPS_MCP" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @.playwright-mcp/<file>.png \
  "$project/_apis/git/repositories/MyCV/pullRequests/<pr id>/attachments/<file>.png?api-version=7.1"
```

`AZURE_DEVOPS_MCP` is the base64 token that `.mcp.json` passes to the Azure DevOps MCP server. Use its value as it is, without encoding it again, and never print it or run `curl` with `-v`, because the token would end up in the transcript. In a cloud session, leave out the `Authorization` header, because the network secret adds the token to requests to `dev.azure.com`.

The response is JSON with a `url`. Use it as returned, and build the *Kuvakaappaukset* section from the URLs, desktop first:

```markdown
## Kuvakaappaukset
**<View name>, työpöytä**

![<View name>, työpöytä](<url>)

**<View name>, mobiili**

![<View name>, mobiili](<url>)
```

A cloud session that cannot reach Azure DevOps has no pull request to attach to: it takes no upload, leaves the section out and names the skipped screenshots under *Huomioitavaa*.

If an upload fails, do not retry another route and do not put the image anywhere else. Leave that image out and write under *Huomioitavaa* which screenshots are missing and why.

## Reviewer Comment

Right after creating the PR, post the additional information as a PR comment with `repo_pull_request_thread_write` (`action: create`, `status: Closed`: the reviewer comment is information, so the thread must not need resolving), in Finnish:

````markdown
## Yhteenveto
<One or two sentences: what this PR changes and why.>

<The Kuvakaappaukset section from above, only for a Frontend UI change. Leave it out otherwise.>

## Tarkistukset
- <Each check that was run and its result, for example "dotnet build: OK", "npm run lint: OK".>

## Koodikatselmointi
- <The findings of the code review (`code-review.md`) by category, each marked "korjattu" or "jätetty ennalleen", then the user's own comments under "Omat kommentit", each with what changed. Write "Ei havaintoja." when there were none.>

## Huomioitavaa
- <Anything the reviewer must know or do: new migrations, new configuration values or environment variables, manual setup steps, known limitations, a Must fix finding of the code review that the user chose to leave. Leave the section out when there is nothing.>

## Korjausten aloituskomento
Kopioi tämä komento uuteen chattiin, kun olet kommentoinut pull requestin:

```text
<the review fixes prompt from follow-up-prompts.md>
```
````

Do not set auto-complete, do not complete the PR, and do not add reviewers. The user approves and completes every PR themselves.
