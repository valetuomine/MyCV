# Screenshots

Part of the `write-user-story` skill. Read it when the user gives a screenshot with the request.

Name the file `us-<id>-<view>-<device>.png`, in ASCII. Upload it with the Bash tool (Git Bash), because the image is too large to pass to `wit_work_item_attachment_upload` as base64. The image's path is in the user's message:

```bash
project=$(node -p "require('./.claude/azure-devops.json').projectUrl")
curl -sS -X POST \
  -H "Authorization: Basic $AZURE_DEVOPS_MCP" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"<image path>" \
  "$project/_apis/wit/attachments?fileName=<file>.png&api-version=7.1"
```

`AZURE_DEVOPS_MCP` is the base64 token that `.mcp.json` passes to the Azure DevOps MCP server. Use its value as it is, and never print it or run `curl` with `-v`. In a cloud session, leave out the `Authorization` header, because the network secret adds the token to requests to Azure DevOps.

The response is JSON with a `url`. Use it in two places, because an attachment alone shows only on the work item's *Attachments* tab:

1. Link it with `wit_work_item_attachment_link`, with a short Finnish `comment` on what the image shows.
2. Show it in the description, right before the `Toteutusohje` rule, with the same text as `alt`:

   ```html
   <div><b>Kuvakaappaus</b></div>
   <div><img src="<url>" alt="<what the image shows>"></div>
   <div><br></div>
   ```

Upload the image after creating the story, then update the description with `wit_work_item_write` (`action: update`).
