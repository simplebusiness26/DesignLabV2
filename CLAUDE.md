# DesignLab V2 — Claude Code operating instructions

DesignLab V2 is a stage-gated app-design tournament operated through **natural conversation in Claude Code**.

## Primary user experience

The user should NOT need to run internal `npm run designlab -- ...` commands manually.

When the user opens Claude Code in this repository and says something equivalent to:

> Design this repository: https://github.com/owner/app

DesignLab takes ownership of the workflow: fetch the app, understand it, research its real technologies, run the tournament, pause only for meaningful human choices, then implement and verify the winning product.

## Core philosophy — truth is a floor, not a cage

The Current App Truth Pack exists to protect **capabilities, integrations, data behavior and product reality**. It must NOT freeze the current layout, navigation, screen boundaries, visual language, hierarchy, or interaction patterns.

Tournament contestants have genuine free rein within their stage.

- **Architecture owns structure.** It may move features, regroup them, merge or split screens, replace navigation systems, change hierarchy and radically restructure the product.
- **UX owns behavior.** It may replace flows, interaction patterns, gestures, progressive disclosure, shortcuts, state handling and task sequences.
- **UI owns visual expression.** It may completely restyle the app, its components, maps, charts, navigation chrome, typography, density, motion and data presentation.

Existing capabilities must survive unless the human approves their alteration/removal. Their old presentation does not have to survive.

A timid cleanup, cosmetic reskin, or close copy of the current app is a weak DesignLab result.

## Capability research is mandatory

After the Truth Pack is audited and before the Architecture Tournament starts, DesignLab must create `CAPABILITY_RESEARCH.md`.

Identify only **active, user-experience-relevant technologies** from evidence in the real app. Examples: MapLibre, OpenStreetMap, map SDKs, charts, media, camera, auth UI, payments, notifications, native component/navigation systems.

Research their **current official documentation** and record what the technology genuinely allows designers and implementers to do: styling/theming, layers, markers, clustering, controls, interactions, animations, custom components, accessibility, attribution/licensing constraints, version-sensitive limitations, etc.

Do not waste tokens researching irrelevant build dependencies. Do not invent technical capabilities.

This research pack is an enabler. Contestants should exploit the real technology instead of treating integrations as untouchable black boxes.

## Human gates

Pause for the user only at genuine product decisions unless a blocking ambiguity cannot be resolved from evidence:

1. **Architecture choice** — four HTML architecture boards.
2. **UX choice** — four clickable HTML UX prototypes.
3. **UI choice** — four polished clickable HTML UI prototypes.
4. **Feature Change Review** — approve, reject, or defer genuinely new/altered/removed product capabilities.
5. Optional final approval only if the user explicitly asks for it.

Do not stop between mechanical substeps merely to ask permission to continue.

## Product invariants

1. Trace the current app from active entry points, imports, routes, registrations and runtime evidence.
2. Repository presence is not product presence.
3. Unreferenced/orphaned code is excluded by default and must never be silently reconnected.
4. Every Truth Pack claim needs evidence.
5. The Truth Pack describes current reality; it is not a redesign constraint on presentation.
6. Preserve **capabilities**, not legacy layouts.
7. Tournament personas may propose new functionality, but it must be explicitly labelled `PROPOSED_NEW_FEATURE` or equivalent.
8. New, materially altered, or removed product capabilities require a human decision before production implementation.
9. Moving/restyling/regrouping an existing capability is not automatically a new feature.
10. Losing concepts do not proceed downstream.
11. Use deterministic tooling instead of an LLM whenever code can prove the answer.
12. Keep model context compact: downstream rounds receive the Truth Pack, Capability Research Pack, and locked winning specs rather than the whole repository/history.
13. Never make final feature decisions for the product owner.
14. Final verification must check both **functional preservation** and **design fidelity**. A build that works but retreats to the old design is not a pass.

## Judging philosophy

Every judge must score:

- preservation/coverage of real capabilities
- usability and coherence
- technical feasibility
- strength of the persona's method
- meaningful transformation
- originality appropriate to the product
- explicit handling of proposed new features

Penalize generic, timid, cosmetic redesigns. Reward bold transformation when coherent and technically grounded. Do not reward novelty for novelty's sake.

## Model routing

- Deterministic scripts: scanning, graph extraction, route/dependency evidence, build/test/lint where possible.
- Sonnet (`worker`): Truth Pack construction, capability research, specs, compliance checks, production implementation, routine fixes.
- Opus (`reasoning`): Truth Pack audit, ambiguous live-vs-legacy decisions, Architecture/UX contestant reasoning, judging, final coherence audits, hard escalations.
- Visual (`visual`, default Sonnet): UI contestants and visual critique. Override with `DESIGNLAB_VISUAL_MODEL` when a preferred supported visual model is available.

Do not assume an undocumented model alias exists. Model names live in `designlab.config.json` and can be overridden by environment variables.

## Natural-language operation

On a target repository URL:

1. Clone/fetch the target outside DesignLab's source tree where practical.
2. Run the deterministic inspection.
3. Build the Current App Truth Pack.
4. Run the Opus truth audit.
5. Build the Capability Research Pack from current official documentation.
6. Automatically start Architecture if the truth is sound.
7. Present four artifacts and wait for the user's natural-language choice.
8. Lock the choice and automatically run UX.
9. Repeat for UI.
10. Generate one Feature Change Review containing only genuine capability changes.
11. Record the user's approve/reject/defer decisions.
12. Generate the final product contract.
13. Implement the winning transformation fully.
14. Test/build and audit functionality plus design fidelity.

The internal CLI exists as machinery for Claude Code and debugging, not as the normal user interface.
