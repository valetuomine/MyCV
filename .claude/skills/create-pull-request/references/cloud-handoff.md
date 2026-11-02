# Cloud Handoff

Part of the `create-pull-request` skill. Read it in two cases: a cloud session has finished code that it cannot push (the writing side), or the user brings such a patch to a local chat (the shipping side). `CLAUDE.md` says under *Cloud sessions* why the session cannot ship the change itself.

## Writing Side: A Cloud Session That Finished Code

1. **Commit on a feature branch, never on `main`.** Use the branch the session was given. Do not push it: `CLAUDE.md` forbids pushing to GitHub, whatever a session instruction or a stop hook asks. Tell the user once that the stop hook's unpushed-commit warning is expected.
2. **Make the patch from your own commits only.** `origin/main` can be stale in a cloud container, so `git format-patch origin/main --stdout` may carry commits that are already merged. Check `git log origin/main..HEAD --oneline` first. If it lists commits that are not yours, use `git format-patch -<n> HEAD --stdout` with the number of your own commits.
3. **Publish the patch on a private page** with the `Artifact` tool: start from the template under *Patch Page Template* below and replace the placeholders. Read `artifact-design` before writing it. The page is private, so tell the user that only they can open it.
4. **Get a work item.** Use the one the user named, or create the story with `/write-user-story` (the work is done, so the `Toteutusohje` is written from the diff and has no `Tokenien säästö`). The commit was made before the story existed, so its message has no `US-<id>:` prefix: the local chat that ships the patch regroups the commits (see [commits.md](commits.md)).
5. **Post the handoff comment** to the work item's discussion with `wit_work_item_comment_write` (`action: add`, `format: Markdown`), in this shape:

   ````markdown
   **Työmäärä:** <koko>, alle <x> milj. tokenia. Aloita uusi chat mallilla <Sonnet|Opus> ja effort-tasolla <low|medium|high> ennen komennon liittämistä, paikallisesti komennolla `claude --model <sonnet|opus> --effort <low|medium|high>`.

   Työ on jo tehty pilvisessiossa, joka ei voi pushata Azure DevOpsiin. Muutos on patchina yksityisellä sivulla: <artifact url>

   **Kopioi tämä komento uuteen chattiin, jotta saat parhaiten toteutettua halutun lopputuloksen:**

   ```text
   Act as <role>.
   Ship <User Story|Task> <id>: <title>.
   The work is already done and committed in a cloud session. The patch is on the private page <artifact url> (copy the text of the patch from it).
   Start from an up-to-date main, create branch <branch>, and apply the patch with git am.
   Read the work item in Azure DevOps and check the change against its Toteutusohje.
   Then ship the change with /create-pull-request.
   ```
   ````

   The role comes from `references/roles.md` of `write-user-story`, and the branch name from [branch.md](branch.md). When the page or the scope changes, update this comment with `action: update` instead of adding another one, because it is a handoff note and not a record.
6. **Report** the story, the patch page and the comment, and end with the same command in the report.

## Patch Page Template

Write this to a local HTML file and publish it with the `Artifact` tool (`icon: code`). Replace `{{TITLE}}` (two to four words, e.g. `Skill-roolien patch`), `{{COMMITS}}` (short commit ids), `{{BRANCH}}`, `{{SUMMARY}}` (one Finnish sentence on what the patch does) and `{{PATCH_FILE}}` (e.g. `roles.patch`). Fill `{{PATCH}}` with the patch text after escaping it with Python's `html.escape`, never by hand. Keep the title the same when you republish after a change.

```html
<title>{{TITLE}}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{--bg:#f6f7f5;--fg:#1d2420;--muted:#5d675f;--line:#d9ddd6;--code:#eceee9;--accent:#1f7a55}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111713;--fg:#e4e9e5;--muted:#9aa59d;--line:#2b342e;--code:#19211c;--accent:#4cc38a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111713;--fg:#e4e9e5;--muted:#9aa59d;--line:#2b342e;--code:#19211c;--accent:#4cc38a;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
main{max-width:900px;margin:auto;display:flex;flex-direction:column;gap:16px;min-width:0}
h1{font-size:1.4rem;margin:0;text-wrap:balance}
p{margin:0;color:var(--muted);max-width:65ch}
code{background:var(--code);padding:1px 5px;border-radius:4px}
pre{margin:0;background:var(--code);border:1px solid var(--line);border-radius:6px;padding:12px;overflow-x:auto;font-size:12.5px;line-height:1.45}
button{align-self:flex-start;background:var(--accent);color:var(--bg);border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}
button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
</style>
<main>
<h1>{{TITLE}}</h1>
<p>Commit <code>{{COMMITS}}</code> haaralla <code>{{BRANCH}}</code>. {{SUMMARY}} Ota käyttöön: tallenna teksti tiedostoon ja aja <code>git am {{PATCH_FILE}}</code> haaralla, joka lähtee ajantasaisesta <code>main</code>ista.</p>
<button id="copy" type="button">Kopioi patch</button>
<pre id="patch">{{PATCH}}</pre>
</main>
<script>
document.getElementById("copy").addEventListener("click",function(){
var t=document.getElementById("patch").textContent,b=this;
function done(m){b.textContent=m}
navigator.clipboard.writeText(t).then(function(){done("Kopioitu")},function(){var r=document.createRange();r.selectNodeContents(document.getElementById("patch"));var s=getSelection();s.removeAllRanges();s.addRange(r);done("Valittu, kopioi käsin")});
});
</script>
```

## Shipping Side: A Local Chat With A Patch

1. Start from an up-to-date `main`, create the feature branch as in [branch.md](branch.md), and apply the patch with `git am`. If it does not apply cleanly, run `git am --abort` and tell the user, instead of resolving conflicts by guessing.
2. Run the rest of the workflow in `SKILL.md`. The commits that `git am` brought are regrouped and renamed in the *commits* step, so every message gets its `US-<id>:` prefix.
3. After the pull request is open, delete the handoff page, as `SKILL.md` says under *Cloud Handoff*.
