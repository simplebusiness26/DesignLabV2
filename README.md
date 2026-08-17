# DesignLab V2

DesignLab V2 is a **token-efficient, stage-gated app design tournament for Claude Code**. It establishes what an existing app actually is, runs separate Architecture, UX and UI competitions, stops for a human winner after each round, surfaces every proposed feature change for approval, and only then allows a production rebuild.

## Core rule

> Repository presence is not product presence. Only reachable, referenced, registered or otherwise verified functionality belongs in the Current App Truth Pack.

Old, unconnected files stay excluded unless evidence proves they are part of the live product. Tournament entrants may propose new functionality, but proposals are never silently promoted into the final build.

## Model routing

| Work | Default |
|---|---|
| File/dependency scan | No LLM |
| Current app reconstruction | Sonnet |
| Truth audit / ambiguity | Opus |
| Architecture contestants | Opus |
| UX contestants | Opus |
| UI contestants | Configurable visual model; Sonnet by default |
| Feature-change extraction | Sonnet |
| Final product contract | Opus |
| Production implementation | Sonnet |
| Final product audit | Opus |

Override without editing code:

```bash
export DESIGNLAB_WORKER_MODEL=sonnet
export DESIGNLAB_REASONING_MODEL=opus
export DESIGNLAB_VISUAL_MODEL=sonnet
```

## What you judge

**Architecture:** four self-contained HTML boards showing hierarchy, navigation, information architecture and core journeys.

**UX:** four clickable HTML wireframe prototypes built on the selected architecture, covering important journeys, gestures, forms and interface states without pretending to be backend-complete apps.

**UI:** four polished clickable HTML concepts built on the locked architecture + UX, demonstrating the design system across representative whole-app flows.

Each round writes a compact `spec.json` beside the HTML artifact and an Opus `JUDGE.md`. The human selects the winner; DesignLab does not auto-lock the judge's recommendation.

## Feature proposal firewall

After the UI round, `feature-review` compares the three winning specs with the original Truth Pack and extracts every `NEW_FEATURE`, `ALTERED_FEATURE` and `REMOVED_EXISTING` item. Each must be marked `APPROVE`, `REJECT` or `DEFER`. `final-spec` refuses to run while decisions remain pending. Only approved changes can enter implementation.

## Requirements

- Node.js 20+
- Claude Code installed and authenticated
- target app checked out locally

## Run

```bash
npm run designlab -- inspect /absolute/path/to/app
npm run designlab -- truth /absolute/path/to/app

npm run designlab -- round architecture /absolute/path/to/app
npm run designlab -- select architecture <persona-id> /absolute/path/to/app

npm run designlab -- round ux /absolute/path/to/app
npm run designlab -- select ux <persona-id> /absolute/path/to/app

npm run designlab -- round ui /absolute/path/to/app
npm run designlab -- select ui <persona-id> /absolute/path/to/app

npm run designlab -- feature-review /absolute/path/to/app
npm run designlab -- decide <change-id> approve /absolute/path/to/app
npm run designlab -- decide <change-id> reject /absolute/path/to/app

npm run designlab -- final-spec /absolute/path/to/app
npm run designlab -- build /absolute/path/to/app
npm run designlab -- final-audit /absolute/path/to/app
```

Run artifacts live under `runs/<app>/<timestamp>/` and are gitignored.

## Pipeline

```text
EXISTING APP
    │
    ▼
Deterministic reachability/dependency scan
    │
    ▼
Sonnet: Current App Truth Pack
    │
    ▼
Opus: skeptical truth audit
    │
    ▼
🔒 TRUTH LOCK
    │
    ▼
4× Architecture contestants (Opus)
    │
    ▼
HTML boards + judge report
    │
    ▼
👤 HUMAN SELECTS ARCHITECTURE
    │
    ▼
4× UX contestants (Opus)
    │
    ▼
Clickable HTML wireframes + judge report
    │
    ▼
👤 HUMAN SELECTS UX
    │
    ▼
4× UI contestants (visual model)
    │
    ▼
Polished clickable HTML concepts + judge report
    │
    ▼
👤 HUMAN SELECTS UI
    │
    ▼
Sonnet: Feature Change Review
    │
    ▼
👤 APPROVE / REJECT / DEFER EVERY CHANGE
    │
    ▼
Opus: Final Product Contract
    │
    ▼
Sonnet: Production implementation + tests/build
    │
    ▼
Opus: Final product audit
```

## Token-efficiency rules

1. Scan with code before asking a model.
2. Pass compact stage artifacts forward, not the whole repository repeatedly.
3. Only winners proceed downstream.
4. Keep contestants isolated so one does not anchor the others.
5. Use Sonnet for production work and Opus where a wrong decision has high downstream cost.
6. Never spend model tokens proving something a compiler, route graph, linter or test can prove.
7. Escalate narrow ambiguity packets rather than re-sending the whole repository.

## Scanner limitation

The static scanner is deliberately conservative. Dynamic imports, reflection, generated routes, dependency-injection containers, feature flags and native/runtime registration can require targeted model verification. `orphanCandidates` therefore means **candidate**, never automatic deletion.

The UI model is intentionally configurable rather than hard-coded to an undocumented specialist alias.
