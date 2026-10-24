# B04 ownership — 2026-10-24

Owner: the B04 implementation task. Scope inferred from the B04 finding and its
acceptance criteria (the request's file/model fields were unexpanded placeholders).

- `src/ui/screens/run-end/FinalTeam.tsx`: preference-aware source selection.
- `src/ui/hooks/useMotionPref.ts`: live OS preference subscription; necessary for
  the requested live updates. Initially clean; no competing modification found.
- `src/ui/art.ts`, `src/content/schemas/species.ts`: optional animation argument,
  preserving all existing callers' default GIF URLs. Initially clean.
- `scripts/build-battle-stills.mjs`, normal/shiny front/back PNG derivatives in
  `public/art/pokemon/battle/`, `e2e/run-end-motion.spec.ts` and the single source
  assertion in `e2e/run-end-art.spec.ts` (initially clean).
- Additive rebuild/credit notes in `docs/art/pipeline.md` and `ATTRIBUTION.md`
  (initially clean). No composition, gameplay or catalogue change.

Release-file ownership was released explicitly in B03's `release-result.md`.
B04 claims the six clean release files for v0.9.43 after its exact candidate checks.
Do not stage any B02, A02/A03/results changes. Preserve their pending queue and
existing scoped deferral. Do not run the global queue-clearing hook.

Initial shared modifications and queue are saved separately in this directory.
