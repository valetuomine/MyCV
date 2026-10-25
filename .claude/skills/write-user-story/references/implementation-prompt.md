# Implementation Prompt

Part of the `write-user-story` skill. Read it when writing or updating a `Toteutusohje`.

The description ends with a `Toteutusohje` section: a prompt for an AI agent. The test is that the user can open a new chat, paste only the kickoff prompt (see [kickoff-prompt.md](kickoff-prompt.md)), and the agent understands the goal, the approach and when the work is done, from the story alone. The agent has `CLAUDE.md`, the repository and the project skills, but none of the conversation in which the story was written.

Write it in Finnish, in these parts:

| Part | Content |
|---|---|
| `Tavoite` | What the finished work achieves and why, as the user or developer experiences it. One short paragraph. |
| `Lähtötilanne` | How the code works today where the change lands: the real files, components, hooks, endpoints, entities and settings involved, with paths. Name the patterns the change should follow and the skills to use, chosen as in [choosing-skills.md](choosing-skills.md), with what each one is for. |
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
