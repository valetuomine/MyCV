# Description

Part of the `write-user-story` skill. Read it when writing or updating a work item description.

Every User Story gets a description. Write it in Finnish, in this structure:

1. **Opening paragraph.** One or two sentences on *what* changes and *why*, in the passive present tense (`Parannetaan...`, `Toteutetaan...`, `Päivitetään...`, `Luodaan...`, `Muutetaan...`). Give the reason with `jotta...` or `...vuoksi`.
2. **`Muutokset:` list.** The concrete changes, one per bullet. Each bullet is a full sentence that a reader understands without opening the code: describe what the user or developer sees or gets, not file or class names. Aim for 3 to 7 bullets.
3. **`Lisäksi` line (optional).** One sentence for side work that lands in the same PR but is not part of the story's main purpose.
4. **`Työmäärä` line.** The size class, tokens, model and effort level, and what drives the size. See [estimate.md](estimate.md).
5. **`Toteutusohje` section.** A prompt for an AI agent that implements the story. See [implementation-prompt.md](implementation-prompt.md).

Keep implementation steps and done criteria out of the parts before the `Toteutusohje`. They belong in the `Toteutusohje`, so the top of the description stays readable for a person.

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
