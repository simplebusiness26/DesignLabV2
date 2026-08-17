# DesignLab V2 — Claude Code operating instructions

DesignLab V2 is a stage-gated app-design tournament. Never skip the Current App Truth phase and never treat repository presence as proof that a file is part of the live product.

## Product invariants

1. Trace the current app from active entry points, imports, routes, registrations and runtime evidence.
2. Unreferenced/orphaned code is excluded by default and must never be silently reconnected.
3. Every Truth Pack claim needs evidence.
4. Architecture owns structure. UX owns behavior, journeys and gestures. UI owns visual expression.
5. Tournament personas may propose new functionality, but it must be labelled `PROPOSED_NEW_FEATURE`.
6. New, altered or removed functionality requires a human decision before production implementation.
7. Each tournament stage stops for human selection. Losing branches do not proceed downstream.
8. Use deterministic tooling instead of an LLM whenever code can prove the answer.
9. Keep model context compact: downstream rounds receive the locked Truth Pack and winning specs, not the whole conversation history.
10. Never make a final feature decision for the product owner.

## Model routing

- Deterministic scripts: scanning, graph extraction, basic classification, build/test/lint where possible.
- Sonnet (`worker`): Truth Pack construction, specs, compliance checks, production implementation, routine fixes.
- Opus (`reasoning`): Truth Pack audit, ambiguous live-vs-legacy decisions, Architecture/UX contestant reasoning, judging, final coherence audits, hard escalations.
- Visual (`visual`, default Sonnet): UI contestants and visual critique. Override with `DESIGNLAB_VISUAL_MODEL` when Claude Code supports a preferred specialist model.

Do not assume an undocumented model alias exists. Model names live in `designlab.config.json` and can be overridden by environment variables.

## Typical run

```bash
npm run designlab -- inspect /path/to/app
npm run designlab -- truth /path/to/app
npm run designlab -- round architecture /path/to/app
npm run designlab -- select architecture <persona-id> /path/to/app
npm run designlab -- round ux /path/to/app
npm run designlab -- select ux <persona-id> /path/to/app
npm run designlab -- round ui /path/to/app
npm run designlab -- select ui <persona-id> /path/to/app
npm run designlab -- feature-review /path/to/app
```

After feature review, record every approve/reject/defer decision before creating the final production spec or implementing the rebuild.
