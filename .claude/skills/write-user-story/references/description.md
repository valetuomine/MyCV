# Description

Part of the `write-user-story` skill. Read it when writing or updating a work item description.

Every User Story gets a description. Write it in Finnish, in this structure:

0. **`Tila` line.** The first line of every Epic, Feature, User Story and Task description: the current state and the reason for it. See *Tila line* below.
1. **Opening paragraph.** One or two sentences on *what* changes and *why*, in the passive present tense (`Parannetaan...`, `Toteutetaan...`, `Päivitetään...`, `Luodaan...`, `Muutetaan...`). Give the reason with `jotta...` or `...vuoksi`.
2. **`Muutokset:` list.** The concrete changes, one per bullet. Each bullet is a full sentence that a reader understands without opening the code: describe what the user or developer sees or gets, not file or class names. Aim for 3 to 7 bullets.
3. **`Lisäksi` line (optional).** One sentence for side work that lands in the same PR but is not part of the story's main purpose.
4. **`Työmäärä` line.** The size class, tokens, model and effort level, and what drives the size. See [estimate.md](estimate.md).
5. **`Kuvakaappaus` (optional).** The screenshot the user gave with the request. See [screenshots.md](screenshots.md).
6. **`Toteutusohje` section.** A prompt for an AI agent that implements the story. See [implementation-prompt.md](implementation-prompt.md).

## Tila line

The first line of every Epic, Feature, User Story and Task description tells the current state and why the item is in it, so a reader does not need the state history:

```html
<div><b>Tila:</b> <state>: <reason></div>
<div><br></div>
```

- `<state>` is the exact `System.State` value. `<reason>` is one Finnish sentence with a concrete reference when there is one: a predecessor's ID, the pull request number, the questions that are waited on, or the user's decision.
- A Task gets its line when it is created (`Tila: New: <reason>`), even when the rest of its description is optional (see [child-tasks.md](child-tasks.md)).
- Write the line in the same update that changes `System.State`, whoever changes it: this skill, `create-pull-request`, the pipelines (`templates/work-item-in-progress-job.yml`, `templates/work-item-state-job.yml`) or a manual move. When the line already exists, replace it; otherwise insert it at the top of the description, followed by the blank `<div><br></div>` line (no blank line when the description is empty).
- The reason must never contain the string `Avoimet kysymykset`, because the `main` pipeline decides a released successor's target state from that string in the description. Write `kysymyksiin odotetaan vastausta` instead.
- Azure DevOps adds spaces when it saves HTML (`</b> `, ` </div>`), so match the line with whitespace allowed: `<div>\s*<b>\s*Tila:\s*</b>[^<]*</div>`. The reason therefore contains no `<` either.

Typical reasons by state:

| State | Typical reason |
| --- | --- |
| `New` | `Toteutusohjeen kysymyksiin odotetaan vastausta.` / `Toteutusohje on vielä tarkentamatta.` / after a release: `Kaikki edeltäjät on tehty, mutta kysymyksiin odotetaan vastausta.` |
| `Ready for Development` | `Toteutusohje on valmis ja työn voi aloittaa.` / after a release: `Kaikki edeltäjät on tehty, työn voi aloittaa.` |
| `In Progress` | `Pull request <n> on auki.` / `Pull request <n> on yhdistetty, mutta työ jatkuu (Jatkuu-label).` / `Pull request <n> on yhdistetty, mutta kesken olevat Taskit: #<id>.` |
| `Waiting for Predecessor` | `Odottaa edeltäjää #<id>.` |
| `On Hold` | `Käyttäjä on päättänyt, ettei työtä aikatauluteta: <syy>.` |
| `Waiting for Deployment` | `Pull request <n> on yhdistetty, odottaa julkaisua.` |
| `Closed` | `Julkaistu ja käyttäjä on sulkenut tiketin.` (Tasks: `Pull request <n> on yhdistetty.`) |
| `Removed` | `Käyttäjä päätti poistaa työn: <syy>.` / `Tutkimus tehty, löydökset ja päätös on kirjattu kuvauksen loppuun.` |

Epics and Features have no pipeline moves; their reason tells the state of their children, for example `In Progress: User Storyt 87 ja 141 ovat kesken.`, `Ready for Development: kaikki User Storyt odottavat aloitusta.`, `Closed: kaikki User Storyt on suljettu.`, or `New: Featurella ei ole vielä User Storyja.` `write-user-story` refreshes the line of the parent Feature and Epic when it adds a story under them, and every move of the Epic's or Feature's own state writes it too; nothing else updates it, so keep the wording to what those moments know.

Keep implementation steps and done criteria out of the parts before the `Toteutusohje`. They belong in the `Toteutusohje`, so the top of the description stays readable for a person.

When the story is written after the work is done, base the description on the actual changes: read the linked PR's commits and diff rather than guessing from the title. When it is written before the work, describe the planned changes, and update the description afterwards if the work ended up different.

Example (User Story 46; the `Tila` line comes first in every description, see *Tila line*):

```html
<div><b>Tila:</b> Ready for Development: Toteutusohje on valmis ja työn voi aloittaa.</div>
<div><br></div>
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
<div><br></div>
<div><b>Työmäärä:</b> M, noin 5–12 milj. tokenia, malli Sonnet, effort-taso medium. Neljä kirjautumisen tilaa frontendissä, ja jokainen tarkistetaan selaimessa työpöydällä ja mobiilissa, molemmissa teemoissa.</div>
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
<div><br></div>
<div><b>Työmäärä:</b> M, noin 5–12 milj. tokenia, malli Sonnet, effort-taso medium. Kaikki backend-projektit ja niiden paketit; käännösvirheiden korjaaminen voi vaatia useita kierroksia.</div>
```
