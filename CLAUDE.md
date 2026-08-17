# DesignLab V2 — Claude Code operating instructions

DesignLab V2 is a stage-gated app-design tournament operated through **natural conversation in Claude Code**.

## Primary user experience

The user should NOT need to run the internal `npm run designlab -- ...` commands manually.

When the user opens Claude Code in this repository and says something equivalent to:

> Design this repository: https://github.com/owner/app

or

> You're designing this app: https://github.com/owner/app

DesignLab must take ownership of the workflow.

### On receiving a target repository URL

1. Resolve the target repository URL.
2. Clone or fetch the target app into a temporary/workspace location outside DesignLab's own source tree when practical.
3. Run the deterministic inspect stage itself.
4. Build and audit the Current App Truth Pack itself.
5. Present a concise summary of what DesignLab believes the current live app is, including active structure, major journeys, and any important uncertainty. Do not burden the user with internal commands.
6. If the truth audit passes, automatically start the Architecture Tournament.
7. Stop only when a genuine human judgement is required.
8. Tell the user exactly which generated HTML artifacts to open and what they are choosing between.
9. Once the user names a winner in normal language, record the selection and automatically proceed to the next stage.
10. Repeat through UX and UI.
11. After UI, automatically generate the Feature Change Review and stop for the user's approve/reject/defer decisions.
12. Once feature decisions are complete, generate the final product contract and continue into implementation and verification unless the user asks to stop.

The internal CLI exists as tooling for Claude Code and for debugging. It is not the intended day-to-day user interface.

## Human gates

Claude Code should pause for the user only at these points unless a blocking ambiguity genuinely requires clarification:

1. **Architecture choice** — four HTML architecture boards.
2. **UX choice** — four clickable HTML UX prototypes.
3. **UI choice** — four polished clickable HTML UI prototypes.
4. **Feature Change Review** — approve, reject, or defer proposed new/altered/removed functionality.
5. Optional final approval if the user explicitly asks for one before implementation.

Do not stop between mechanical substeps merely to ask permission to continue.

## Product invariants

1. Trace the current app from active entry points, imports, routes, registrations and runtime evidence.
2. Repository presence is not product presence.
3. Unreferenced/orphaned code is excluded by default and must never be silently reconnected.
4. Every Truth Pack claim needs evidence.
5. Architecture owns structure. UX owns behavior, journeys and gestures. UI owns visual expression.
6. Tournament personas may propose new functionality, but it must be labelled `PROPOSED_NEW_FEATURE` or equivalent in the machine-readable spec.
7. New, altered or removed functionality requires a human decision before production implementation.
8. Each tournament stage stops for human selection. Losing concepts do not proceed downstream.
9. Use deterministic tooling instead of an LLM whenever code can prove the answer.
10. Keep model context compact: downstream rounds receive locked stage artifacts and winning specs, not the entire conversation/repository history.
11. Never make a final feature decision for the product owner.

## Model routing

- Deterministic scripts: scanning, graph extraction, route/dependency evidence, build/test/lint where possible.
- Sonnet (`worker`): Truth Pack construction, specs, compliance checks, production implementation, routine fixes.
- Opus (`reasoning`): Truth Pack audit, ambiguous live-vs-legacy decisions, Architecture/UX contestant reasoning, judging, final coherence audits, hard escalations.
- Visual (`visual`, default Sonnet): UI contestants and visual critique. Override with `DESIGNLAB_VISUAL_MODEL` when a preferred supported visual model is available.

Do not assume an undocumented model alias exists. Model names live in `designlab.config.json` and can be overridden by environment variables.

## Natural-language winner handling

The user may answer naturally, for example:

- `I want number 3`
- `Pick Cooper`
- `Architecture B`
- `Use the second UX one`

Resolve that choice to the corresponding contestant ID, lock it, and continue automatically. Do not make the user type internal IDs if the choice is already unambiguous.

## Internal tooling

The following commands are implementation details that Claude Code may invoke itself:

```bash
npm run designlab -- inspect <app-path>
npm run designlab -- truth <app-path>
npm run designlab -- round architecture <app-path>
npm run designlab -- select architecture <persona-id> <app-path>
npm run designlab -- round ux <app-path>
npm run designlab -- select ux <persona-id> <app-path>
npm run designlab -- round ui <app-path>
npm run designlab -- select ui <persona-id> <app-path>
npm run designlab -- feature-review <app-path>
```

Claude Code should run these on the user's behalf rather than teaching the user the command sequence.
