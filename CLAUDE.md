# DesignLab V2 — Claude Code operating instructions

DesignLab V2 is a stage-gated app-design tournament operated through **natural conversation in Claude Code**.

## Primary user experience

The user should NOT need to run internal `npm run designlab -- ...` commands manually.

When the user opens Claude Code in this repository and says something equivalent to:

> Design this repository: https://github.com/owner/app

DesignLab takes ownership of the workflow: fetch the app, understand it, research its real technologies, run the tournament, pause only for meaningful human choices, then implement and verify the winning product.

## THE STYLE MANDATE — read this before anything else

**Somebody who activates DesignLab has come for a redesign. That is the entire reason this tool exists.**

So the default mandate is `REDESIGN`, and under it:

1. **The app's existing visual language is prior art, not a constraint.** Its palette, tokens, typography, shape language, component look and its own `design-system.md`-style documents describe *the product being replaced*. Record them so the tournament knows what it is superseding. Never treat them as the target.
2. **The tournament winner supersedes all of it.** Once a UI winner is locked, that spec — not the repo's old design doctrine, and not anything discussed earlier in the conversation — is the single styling authority. Prior design discussion is superseded by the decision.
3. **"Keep the features" means keep the FUNCTION, not the look.** A preserved capability keeps its data behaviour, its permissions, its integration — and should be styled hard. Someone asking you to preserve a feature is not asking you to preserve its appearance.
4. **Shipping a working copy of the old look is the failure this project exists to prevent.** It is not a safe outcome. It is the bad one.

The only exception is `PRESERVE_EXISTING`, and it applies **only when the commissioner explicitly asked to keep the current styling in their activation prompt**. Do not infer it from the app having a nice design system, from house rules that lock a palette, or from a persona whose method says "evolve what's there". Record the mandate on the run at inspect time (`--keep-styling` sets it) so every later stage reads one answer.

**Supersession is scoped to styling.** The target repo's rules on product vocabulary, privacy and safety gates, data/schema/migration discipline, testing and commit conventions still bind completely. You override what the product looks like — never how it treats people's data.

### Why this is written so forcefully

A target repo's design doctrine is concrete, authoritative-looking, and sits next to the code being edited; a winning spec in `runs/` is not. Absent an explicit supersession, implementers obey the in-repo file — and deliver a token-consistency cleanup of the old app while reporting success. The `design-system` stage exists to end that argument by making the winner real in the repo *before* any screen is touched.

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
15. **Nothing is "done" until it has been rendered and looked at.** Passing tests are not evidence of a working interface — a unit test asserting a control renders passes happily while that control is ten times its intended height or sits underneath another one. Every implementation pass ends with the app actually running, screenshotted at a realistic device viewport, and checked mechanically (nothing stretched by an unconstrained flex parent, no overlay covering content, nothing under nav chrome or outside safe areas, no unreadable text, no console errors). If the app cannot be made to render, say so loudly — never substitute a green test suite for eyes.
16. **The visual system in the built app must be the winner's, not the incumbent's.** Sample real rendered pixels to prove it. An app whose screenshots show the old palette has failed the commission even if every capability works and every test passes.
17. **Nobody owns the seams unless someone is told to.** When implementation fans out across parallel agents with disjoint files, composition bugs — a global overlay covering a screen's primary action, inconsistent insets, chrome collisions — belong to no one by construction. The orchestrator owns an explicit composition pass after the agents land, and must not delegate it.

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

**UI round, incumbent-similarity check (runs before scoring).** Compare every entry's design system against `CURRENT_DESIGN_SYSTEM.json`. An entry that carries the incumbent palette, typefaces and shape language substantially unchanged is **INELIGIBLE** under a `REDESIGN` mandate, however neat it is — it did not do the job it was commissioned for. An entry may legitimately *evolve* a strong existing idea, but it must argue a new visual position rather than inherit the old one by default; if you cannot tell its palette from the incumbent's at a glance, that is inheritance.

Score down hard any UI entry whose design system is too abstract to build from — "evolve the existing feel", no hex values, no real type stacks. Implementers resolve vagueness by reaching for the file already in the repo, so an abstract spec reliably ships as the old design.

## Model routing

- Deterministic scripts: scanning, graph extraction, route/dependency evidence, build/test/lint where possible.
- Sonnet (`worker`): Truth Pack construction, capability research, specs, compliance checks, production implementation, routine fixes.
- Opus (`reasoning`): Truth Pack audit, ambiguous live-vs-legacy decisions, Architecture/UX contestant reasoning, judging, final coherence audits, hard escalations.
- Visual (`visual`, default Sonnet): UI contestants and visual critique. Override with `DESIGNLAB_VISUAL_MODEL` when a preferred supported visual model is available.

Do not assume an undocumented model alias exists. Model names live in `designlab.config.json` and can be overridden by environment variables.

## Natural-language operation

On a target repository URL:

1. **Determine the style mandate from the activation prompt.** Default `REDESIGN`. Only `PRESERVE_EXISTING` if the user explicitly asked to keep the current styling. Record it on the run — it governs every stage after.
2. Clone/fetch the target outside DesignLab's source tree where practical.
3. Run the deterministic inspection.
4. Build the Current App Truth Pack, including `CURRENT_DESIGN_SYSTEM.json` — the incumbent visual language recorded as prior art, with a complete list of every in-repo file that asserts styling authority.
5. Run the Opus truth audit.
6. Build the Capability Research Pack from current official documentation, including the stack's real styling ceiling.
7. Automatically start Architecture if the truth is sound.
8. Present four artifacts and wait for the user's natural-language choice.
9. Lock the choice and automatically run UX.
10. Repeat for UI.
11. **Materialise the winning design system into the app** (`design-system`) — rewrite the token module and every superseded styling-doctrine file so the winner is the repo's real system *before* any screen is built.
12. Generate one Feature Change Review containing only genuine capability changes. Visual change is never a reviewable feature — it is the commissioned work.
13. Record the user's approve/reject/defer decisions.
14. Generate the final product contract, with the winning token table reproduced inside it.
15. Implement the winning transformation fully, then run an orchestrator-owned composition pass across the assembled screens.
16. **Render the app and verify it visually** (`visual-verify`) — screenshots at device viewport, mechanical geometry assertions, pixel-sampled proof the new design system is what actually renders.
17. Final audit of functionality, design fidelity and visual evidence together.

Stage order is load-bearing in two places: `design-system` must precede `build`, or screens inherit the old tokens; `visual-verify` must precede `final-audit`, or the audit certifies what the implementer believed rather than what it built. The pipeline enforces both.

### When a blend wins

The user will often pick ideas across entries rather than one entry whole ("that navigation, but that one's camera"). Treat the blend as the locked winner: write it to its own `blend-*` spec directory with full `routeCoverage` and a complete `designSystem`, and select it. A blend's design system must be as concrete as any single entry's — if the blend's styling is left implicit, implementers resolve the ambiguity with the incumbent system.

### Show the work early

Do not run a long implementation to completion before the user sees a rendered screen. Get one real screen on the device viewport, screenshot it, show it, and confirm the direction before building the other seventy. A screenshot at hour one is worth more than a green test suite at hour six.

The internal CLI exists as machinery for Claude Code and debugging, not as the normal user interface.
