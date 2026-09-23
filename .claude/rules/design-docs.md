---
paths:
  - "docs/design/**"
---

# Design canon rules — `docs/design/**`

- **These files are canon.** Edit them directly. There is no Notion, no export step, no snapshot to refresh.
- **§ numbers are an API.** Code, tests and other docs cite `§N.N.N` (~1,600 citations). Never renumber by hand and never delete a section. `npm run check:refs` proves every citation resolves — keep it green.
- **Rationale lives next to the rule.** Why a rule is the way it is belongs in its section, in a sentence or two. There is no separate decision log: git holds the diffs, the prose holds the reasoning.
- **The written design is mutable, not sacred** (user, 2026-09-24). A better name, idea or item, or a row that is not quite right: change, delete or add it, with the rationale in the section, and report it. Naming, tuning, content and item calls are delegated — decide them.
- **Unresolved points** that genuinely need the user (the game's direction: a new mode, a pillar, a big scope shift) are written as `> ⚠️ **OPEN (YYYY-MM-DD)**: …` inline in the section they affect, naming who decides. Never start a parallel list of them; an idea for later goes to the roadmap backlog.
- **Direction-level design changes follow the `design-change` skill**: read the §, generate 2–4 named options with pillar impact, present without picking, the user decides, then record it in the section itself (plus the codex date, and the roadmap if scope moved). Everything smaller is decided and recorded directly.
- **The codex (`00-codex.md`) is derived.** When a topic changes meaningfully, regenerate the affected codex section and bump its date. Canon wins over the codex.
- **`implementation-status.md` is derived too.** System → canon § → code path → status, plus every place the build diverges from canon. Update a row whenever a system's state changes. A rule that appears only there is a bug — put it in canon.
- **`catalogs/` is the content authoring source.** Every content row lives there once, with a stable kebab id, the § it implements, a status mark and the roadmap version that first needs it; then it is ported to `src/content/data/`. `npm run check:catalogs` fails if a referenced id has no definition — keep it green.
- **Canon states the current rule once.** When a rule changes, rewrite the section — do not append an override block underneath it. A superseded design goes in a clearly-marked historical section at the end of the file, or nowhere. 
- Style: en-GB spelling, active voice, rule first then rationale, one rule per paragraph, tables for catalogues, Mermaid for flows/state machines, canonical terms only (Lead, Swap, Step-Forward/Step-Backward, Faint, Intent, Mastery Move).
- **Mockups** (`ui/mockups/*.html`) are references, not the implementation. When a screen ships, add the implementing component path to `ui/mockups/README.md`.
- The Unity-era wording "UI Toolkit / USS / ScriptableObject" in older sections reads as "React / CSS / content JSON"; fix wording opportunistically when editing a section for another reason, never in a bulk pass that would blur the change history.
