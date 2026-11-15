# Choosing Skills

Part of the `write-user-story` skill. Read it when choosing the skills a `Toteutusohje` or prompt names.

Pick the skills the next agent needs to reach the story's goal, and name them in `Lähtötilanne` with what each one is for. Search what is installed before looking for anything new.

1. **Name the goal's domains.** List what the work needs know-how for, such as React component APIs, animation, accessibility, EF Core migrations or pipeline YAML.
2. **Search the installed skills first.** Check the skill list of this session (project `.claude/skills/`, user `~/.claude/skills/` and `~/.agents/skills/`, plugins) and both `skills-lock.json` files (root and `src/Frontend`). Read the `SKILL.md` of each candidate, not only its description. The project skills (`/create-cv-skills`, `/setup-frontend`) come first for the parts they cover; add a general skill only where it adds something they don't.
3. **Look for a new skill only for a domain no installed skill covers.** Search with `npx skills find <keywords>` and the [skills.sh](https://skills.sh/) leaderboard; if the command is blocked, search skills.sh with WebFetch. Vet each candidate as the `find-skills` skill says: 1K+ installs, a known source such as `vercel-labs` or `anthropics`, and read its `SKILL.md` before naming it. List each new skill in the draft with its source and install count, so the user's approval of the draft covers the skill and its install step in the `Toteutus`.
4. **Install it when the work starts, never while writing the story.** The story-writing chat installs nothing: an install there would leave changes in the working tree of whatever branch is checked out. Write the install into the `Toteutus` as its first step, with these parts:
   - Run `npx skills add <owner/repo> --skill <name> --agent claude-code -y` from the repository root. If the command is blocked, give the user the command to run and wait.
   - Check that the root `skills-lock.json` lists the skill.
   - Add the exception `!.claude/skills/<name>/` to `.gitignore`, because project skills are tracked only through such exceptions.
   - Read its `SKILL.md` ("lue se ennen rajapinnan suunnittelua" when it shapes the approach).

   `Valmis, kun` gets "`skills-lock.json` sisältää `<name>`-skillin" and "`.gitignore` sisältää `<name>`-skillin poikkeuksen", the `Lähtötilanne` and the kickoff prompt mark the skill as not yet installed, and the story gets the `Skills` tag. The same applies in a cloud session. When `create-pull-request` calls this skill, the work is already done: install nothing, and make a skill that the remaining work needs the first step of what remains.
5. **UI work.** For a frontend UI story, name `emil-design-eng` for motion and polish (easing, timing, whether to animate at all, interruptibility), and `ui-ux-pro-max` for layout, responsive behaviour, accessibility and forms: its `--domain` searches and the pre-delivery checklist in its `references/pro-rules.md`. Never use its `--design-system` workflow, because `DESIGN.md` and `/setup-frontend` are the source of truth, and they win wherever its advice conflicts with them. Name only the ones the story's work needs.
6. **Keep it short.** Usually one to three skills. Every named skill is loaded into the next chat, so leave out any that would not change the work, and for a large skill name the section to read in `Tokenien säästö` (see [estimate.md](estimate.md)). If nothing fits and nothing worth installing turns up, name none and say so in the draft.
