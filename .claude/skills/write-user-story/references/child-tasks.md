# Child Tasks

Part of the `write-user-story` skill. Read it only when the story splits into child Tasks.

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

Use the same area path, iteration path and assignee as the story. Tag each Task with the tags from *Tags* in `SKILL.md` that match the Task's own work, which is usually a subset of the story's tags (for example `Backend` for an endpoint Task under a `Backend; Database` story).
