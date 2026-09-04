# Forge — Roadmap

## v0.1 — The Brew Moment (DONE, in final pre-launch checks)

- [x] CLI: `add`, `remove`, `list`, `search`, `info`, `doctor` (TypeScript)
- [x] Adapters: claude-code, opencode, cursor, codex, dsh, windsurf, generic (7 harnesses)
- [x] Package types: `skill` + `mcp` + `plugin` + `agent` + `command` + `hook` (6 types)
- [x] Registry: `registry/index.json` + `registry/packages/*.json` (inside this repo)
- [x] 250 seeded packages (Phase 2: 100 + Phase 13-lite: +150)
- [x] `forge install` (bulk install from forge.toml) + `--frozen` + `--mock`
- [x] Fail-closed installer (hash/download error = exit 1), `--mock` opt-in, config `.bak`
- [x] README + 7s demo gif
- [ ] Product Hunt + HN launch (Phases 6-7, outside this file — see docs/private/LAUNCH.md)
- [x] CI: index build + build + test (`registry:build --check`)
- [ ] R2 deploy (deferred to v0.3 — registry is local/bundled for now)

**Exit bar:** install with `npm i -g tryforge` and `forge add anthropics/plan --mock` works (a real-SHA package is required for non-mock installs).

## v0.2 — The npm Moment (partly DONE)

- [ ] `forge publish` (creator workflow — next big item)
- [x] `forge init` (6-type skeletons)
- [x] Adapters: dsh, windsurf, generic (pulled into v0.1)
- [x] Package types: `plugin`, `agent`, `command`, `hook` (all 6 types — pulled into v0.1)
- [x] Dependency resolution (semver ranges)
- [x] `forge update` + `forge audit` (skeleton) + `forge outdated`
- [x] Search: offline scored (<200ms) — Algolia deferred
- [x] Private registry support (fork + `registry = "<url>"` config)
- [x] Project-level `forge.toml` (team sync)

## v0.3 — The Store Moment (2-3 months)

- [ ] Web: `forge.sh` — package pages, search, stats, `forge add` copy button (like npmjs.com)
- [ ] `forge run <agent>` — harness abstraction (run on whichever harness is installed)
- [ ] Rust rewrite (single binary, speed)
- [ ] `brew`, `winget`, `cargo`, `npm` distribution
- [ ] GitHub Action: `forge-action` (`forge install` in CI)
- [ ] VS Code extension: forge packages in the sidebar

## v1.0 — The OS Moment (6 months)

- [ ] `forge cloud` — team registry, private packages
- [ ] Billing (for private publishing)
- [ ] `forge create` — interactive package builder
- [ ] Telemetry (opt-in, download counts)
- [ ] Agent runtime: run any agent with any model via `forge run`

## Milestones (rational — no star goals before distribution works)

| Date | Goal | Metric |
|-------|-------|--------|
| Launch hardening (now) | 250 packages, 7 harnesses, fail-closed | 34 tests green, clean `npm pack`, HN first-comment ready |
| Week 1 (launch) | npm install works, HN Show | 100-300 stars, 20+ install reports |
| Weeks 2-4 | Close the feedback loop | 10+ requested packages added, real-SHA count growing |
| Months 2-3 | `forge publish` + 500 packages | creator flow live, registry growing |
| After | Long-term phase plan | phase by phase, with metrics |

## Risks

- Anthropic ships an official registry? -> We are already universal (Anthropic is Claude-only); we cover every harness.
- DeepSeek closes its own store? -> The adapter keeps us independent.
- Spam packages? -> `forge audit` + manual curation (like npm).
