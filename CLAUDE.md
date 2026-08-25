# DesignLab V2 — Claude Code operating instructions

DesignLab V2 is a stage-gated app-design tournament operated through **natural conversation in Claude Code**.

## Primary user experience

The user should NOT need to run internal `npm run designlab -- ...` commands manually.

When the user opens Claude Code in this repository and says something equivalent to:

> Design this repository: https://github.com/owner/app

DesignLab takes ownership of the workflow: fetch the app, understand it, research its real technologies, run the tournament, pause only for meaningful human choices, then reproduce and verify the winning product.

## Core philosophy — truth is a floor, not a cage

The Current App Truth Pack exists to protect **capabilities, integrations, data behavior and product reality**. It must NOT freeze the current layout, navigation, screen boundaries, visual language, hierarchy, or interaction patterns.

Tournament contestants have genuine free rein within their stage.

- **Architecture owns structure.** It may move features, regroup them, merge or split screens, replace navigation systems, change hierarchy and radically restructure the product.
- **UX owns behavior.** It may replace flows, interaction patterns, gestures, progressive disclosure, shortcuts, state handling and task sequences.
- **UI owns visual expression.** It may completely restyle the app, its components, maps, charts, navigation chrome, typography, density, motion and data presentation.

Existing capabilities must survive unless the human approves their alteration/removal. Their old presentation does not have to survive.

A timid cleanup, cosmetic reskin, or close copy of the current app is a weak DesignLab result.

## The Design Lock — mandatory and immutable

**Once the user selects the UI winner, design is over.**

At UI selection, DesignLab creates `design-lock/` inside the run and snapshots the selected:

- Architecture `artifact.html` + `spec.json`
- UX `artifact.html` + `spec.json`
- UI `artifact.html` + `spec.json`

The lock manifest stores SHA-256 hashes. If any locked artifact changes after selection, the pipeline must fail rather than silently accept a changed design.

The locked HTML artifacts are **implementation references, not inspiration or mood boards**.

Precedence after locking:

1. Human feature decisions govern capability additions/alterations/removals.
2. Architecture HTML/spec governs structure, hierarchy, navigation and screen boundaries.
3. UX HTML/spec governs flows, states, gestures and interaction behavior.
4. UI HTML/spec governs visual appearance: layout composition, typography, spacing, color, component anatomy, shape, density, navigation chrome, map/camera treatment and motion treatment.
5. Existing app code is only an implementation substrate. It has no design authority where it conflicts with the lock.

After the Design Lock, no agent may invent another product design merely because the approved design is difficult to implement. Refactor the code instead. If a locked detail is truly impossible with the active technology, verify that with evidence, implement the nearest faithful equivalent, and record a `FIDELITY_EXCEPTION`. Never silently redesign.

## Capability research is mandatory

After the Truth Pack is audited and before the Architecture Tournament starts, DesignLab must create `CAPABILITY_RESEARCH.md`.

Identify only **active, user-experience-relevant technologies** from evidence in the real app. Examples: MapLibre, OpenStreetMap, map SDKs, charts, media, camera, auth UI, payments, notifications, native component/navigation systems.

Research their **current official documentation** and record what the technology genuinely allows designers and implementers to do: styling/theming, layers, markers, clustering, controls, interactions, animations, custom components, accessibility, attribution/licensing constraints, version-sensitive limitations, etc.

Do not waste tokens researching irrelevant build dependencies. Do not invent technical capabilities.

This research pack is an enabler. Contestants should exploit the real technology instead of treating integrations as untouchable black boxes.

## Whole-app coverage

`ROUTE_COVERAGE.json` is a binding coverage contract. It must enumerate every reachable user-facing destination and state family: hero screens, profile/profile subpages, settings, camera/capture, details, modals/sheets, onboarding, low-frequency routes, empty/error/loading states and other reachable UI.

Every contestant must account for every route id. A selected UI artifact must contain an actual designed representation for every route, either directly in the clickable prototype or in a clearly linked route/state gallery. Specs alone are not enough to leave a route visually unspecified.

A beautiful main screen does not compensate for legacy-looking secondary screens.

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
12. Downstream rounds receive the winning HTML **and** spec, not a lossy text summary alone.
13. Never make final feature decisions for the product owner.
14. Final verification must check both **functional preservation** and **direct fidelity to the locked artifacts**. A build that works but is materially different from the selected design is not a pass.
15. Locked artifacts are immutable and hash-verified before/after implementation and repair stages.

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

## Implementation mode — reproduction, not redesign

The production agent is a **reproduction engineer** after UI selection.

Before its first product edit it must read the Design Lock manifest, final contract, and all six locked HTML/spec files. It must implement route-by-route against those references.

Forbidden implementation behavior includes:

- generating another UI direction
- replacing distinctive locked components with generic defaults
- restoring old layouts because they are easier to code
- leaving profile/settings/camera/secondary routes on the previous design system
- treating the selected UI HTML as a loose mood board
- silently changing interactions or capability behavior

If code architecture fights the design, change the code architecture.

## Final fidelity audit and repair loop

The final Opus audit must compare the CURRENT APP directly against the locked Architecture, UX and UI artifacts, not merely against the implementation report.

It must audit every reachable route and concrete visual/interaction qualities such as hierarchy, composition, component anatomy, typography, spacing, shape, density, navigation chrome, state treatment and integration surfaces. Where practical, use existing preview/e2e/screenshot tooling to inspect rendered routes.

A compile/test pass is not sufficient evidence of design fidelity.

If the audit returns `STATUS: NEEDS_REVIEW`, DesignLab automatically runs a fidelity repair pass that is expressly forbidden from redesigning. It may only correct deviations toward the existing lock, then Opus re-audits. Up to three audit attempts are allowed. If fidelity still cannot be established, the run remains `NEEDS_REVIEW` rather than pretending completion.

## Model routing

- Deterministic scripts: scanning, graph extraction, route/dependency evidence, design-lock hashing, build/test/lint where possible.
- Sonnet (`worker`): Truth Pack construction, capability research, specs, compliance checks, production reproduction, fidelity repairs.
- Opus (`reasoning`): Truth Pack audit, ambiguous live-vs-legacy decisions, Architecture/UX contestant reasoning, judging, final contract and final fidelity audit.
- Visual (`visual`, default Sonnet): UI contestants and visual critique. Override with `DESIGNLAB_VISUAL_MODEL` when a preferred supported visual model is available.

Do not assume an undocumented model alias exists. Model names live in `designlab.config.json` and can be overridden by environment variables.

## Natural-language operation

On a target repository URL:

1. Clone/fetch the target outside DesignLab's source tree where practical.
2. Run the deterministic inspection.
3. Build the Current App Truth Pack and route coverage contract.
4. Run the Opus truth audit.
5. Build the Capability Research Pack from current official documentation.
6. Automatically start Architecture if the truth is sound.
7. Present four artifacts and wait for the user's natural-language choice.
8. Pass the selected Architecture HTML + spec directly into UX.
9. Present UX choices, then pass the selected UX HTML + spec directly into UI.
10. Present UI choices. When the user selects one, create and hash the immutable Design Lock.
11. Generate one Feature Change Review from the locked artifacts and Truth Pack.
12. Record the user's approve/reject/defer decisions.
13. Generate the final product contract from the locked artifacts without redesigning them.
14. Reproduce the selected design in the real app route-by-route.
15. Test/build and run direct design-fidelity audit.
16. If needed, automatically repair deviations toward the same lock and re-audit. Never generate a replacement design during repair.

The internal CLI exists as machinery for Claude Code and debugging, not as the normal user interface.
