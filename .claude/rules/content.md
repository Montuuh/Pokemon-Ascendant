---
paths:
  - "src/content/**"
  - "public/art/**"
---

# Content & art rules — `src/content/**`, `public/art/**`

- **Content is JSON** in `src/content/data/`, validated by the Zod schemas in `src/content/schemas/`. The schema is the master schema (§10.3.2 lineage); a schema change is a content migration: update the data, the tests and the catalogue row.
- **Ids are kebab-case** and stable forever (saves reference them). Art paths are derived from ids by the helpers in `schemas/species.ts`, never stored in JSON.
- **No duplication.** A value lives in one file; everything else references it by id.
- **Balance values cite their §** in the schema's doc comment or a `_note` field. Placeholder numbers are marked `"_tuning": "placeholder"`.
- **Rot-guards.** Content tests assert every referenced move/ability/art exists. Keep them green when adding content.
- **Art files** live under `public/art/<domain>/…`, lowercase kebab filenames, sizes and lanes per `docs/art/pipeline.md`. Third-party assets get a line in `docs/art/ATTRIBUTION.md`.
- Never commit generated art without having looked at it in context (`npm run shot`).
