# Forge — The Homebrew for AI Agents

[![CI](https://github.com/oomerevren-beep/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/oomerevren-beep/forge/actions)
[![npm version](https://img.shields.io/npm/v/tryforge?label=npm&color=CB3837)](https://www.npmjs.com/package/tryforge)
[![npm downloads](https://img.shields.io/npm/dw/tryforge?label=downloads)](https://www.npmjs.com/package/tryforge)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![registry](https://img.shields.io/badge/registry-100%20packages-green.svg)](registry/index.json)
[![GitHub stars](https://img.shields.io/github/stars/oomerevren-beep/forge?style=social)](https://github.com/oomerevren-beep/forge)

> **One CLI to install skills, MCPs, plugins, agents on any harness.**

`brew` is for system packages. `forge` is for AI agent packages.

```bash
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
# or
npm i -g tryforge

forge add anthropics/plan          # skill → Claude Code + Codex + OpenCode + Cursor
forge add mcp/filesystem           # MCP server → auto mcp.json
forge add obra/superpowers         # agent collection
```

No more `git clone + cp SKILL.md`. One command, every harness. **Star to get notified at v1.0.**

<p align="center">
  <img src="docs/assets/og.png" alt="Forge — The Homebrew for AI Agents" width="640" />
</p>
<p align="center">
  <img src="docs/assets/demo.gif" alt="forge demo — 7 seconds" width="640" />
  <br><em>7-second wow: <code>forge doctor → search → add → list</code></em>
</p>

---

## Table of Contents

- [Why Forge?](#why-forge)
- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Team Sync — `forge install`](#team-sync--forge-install)
- [Create a Package](#create-a-package)
- [How it Works](#how-it-works)
- [Comparison](#comparison)
- [Registry — 100 Packages](#registry--100-packages)
- [Architecture](#architecture)
- [Docs](#docs)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

---

## Why Forge?

2026: everything is a skill/plugin/MCP — but install is still stone age. Every harness has its own folder, no versioning, no update.

- `obra/superpowers` — **280k stars** — install is manual `git clone + cp`
- `deepseek-harness` — **207k stars in 18 days** — proves "Everything is a Plugin", but DeepSeek-only
- `anthropics/skills` — **172k stars** — Claude-only
- `mcp-registry` — MCP-only, no skills/agents

Result: a developer using Claude Code + Codex + OpenCode + Cursor installs the **same package 4 times by hand**. No `update`, no `forge.toml`, no team sync.

**Forge fixes it:** 6 package types × 5+ harnesses × one CLI. Like `brew` unified system packages, `forge` unifies agent packages. Viral loop: creators promote `forge add me` to distribute their own work.

| Type | Example | What it does |
|------|---------|--------------|
| `skill` | `anthropics/plan` | `SKILL.md` capability (Anthropic standard) |
| `mcp` | `mcp/filesystem` | Model Context Protocol server |
| `plugin` | `dsh/desktop` | Harness extension |
| `agent` | `agency/frontend` | Subagent definition |
| `command` | `cmd/plan` | Slash command `/plan` |
| `hook` | `hook/pre-tool` | Lifecycle hook |

---

## Features

- **Universal — 6 types, one registry.** Skills + MCPs + plugins + agents + commands + hooks in one place.
- **Multi-harness — 5 adapters today.** Claude Code, Codex, OpenCode, Cursor, Generic. Symlink (junction on Windows) preferred, copy fallback. One file per harness → easy to add Antigravity, Droid, Copilot.
- **Team sync — `forge.toml` + `forge.lock`.** Like `package.json` for agents. `forge install` / `forge install --frozen` for CI.
- **Search in <500ms.** Offline `search.json` + typed index, no API key.
- **Git-native registry.** Every package is a GitHub repo. Forkable, private registry ready. No central DB.
- **Safe by default.** `sha256` pinned tarballs, `forge doctor` health check, Windows/Linux/macOS.

---

## Install

```bash
# via curl (recommended)
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
# Windows PowerShell
irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex

# via npm
npm i -g tryforge

# via cargo (v0.2 — Rust rewrite)
cargo install tryforge
```

Requires Node 18+ for v0.1 (TypeScript). Rust binary in v0.2 — single binary, no runtime.

---

## Quick Start

```bash
forge doctor              # detect your harnesses (5 checked)
forge search plan         # find packages (try: pdf, mcp, agent)
forge add anthropics/plan # install latest (resolves ^1.2.0)
forge add mcp/filesystem  # MCP → auto-writes to mcp.json
forge list                # 8 installed, with versions
forge info mcp/github     # detail + versions + engines
forge outdated            # what can be updated
forge update              # update all (or: forge update mcp/github)
forge remove obra/superpowers
```

```bash
# version pinning
forge add anthropics/plan@1.1.0
forge add anthropics/plan@^1.2.0

# dry run — see what would happen
forge add anthropics/plan --dry-run
```

---

## Team Sync — `forge install`

Add `forge.toml` to your project, everyone gets the same set with one command.

```toml
# my-project/forge.toml
[project]
name = "my-app"
version = "0.1.0"

[dependencies]
"anthropics/plan" = "^1.2.0"
"mcp/filesystem" = "^1.0.0"
"obra/superpowers" = "^3.0.0"
"skill/pdf" = "^1.0.0"
```

```bash
forge install          # installs all, writes forge.lock
forge install --frozen # CI: exact versions from lock (like npm ci)
forge outdated         # shows 1.1.0 → 1.2.0 etc.
forge update           # bumps to latest within semver
```

Lockfile `forge.lock` is `[[packages]]` TOML — commit it. `~/.forge/config.toml` holds user defaults (registry URL, default harnesses).

---

## Create a Package

```bash
forge init my-skill --type skill --yes   # → SKILL.md + forge.toml
forge init my-mcp --type mcp --yes       # → MCP template + [mcp] config
forge init my-agent --type agent --yes   # → agent.md template
# types: skill | mcp | plugin | agent | command | hook

cat forge.toml
# [package] name="my-skill" version="0.1.0" type="skill" ...

forge publish   # (v0.2) validates → tarball → GitHub Release → registry PR
```

Until `publish` lands, open a PR adding `registry/packages/<slug>.json` (see `schema/forge.schema.json`), then `npm run registry:build`.

---

## How it Works

```
forge add anthropics/plan
  → fetch registry/index.json (R2 CDN, 5-min cache)
  → resolve ^1.2.0 → tarball URL + sha256
  → download to ~/.forge/cache/tarballs/ → extract to ~/.forge/packages/anthropics-plan@1.2.0/
  → adapter: symlink/copy to ~/.claude/skills/ + ~/.codex/skills/ + .opencode/skills/ + .cursor/skills/
  → if MCP: inject into ~/.claude/settings.json + ~/.codex/mcp.json
```

Add a harness = one file in `cli/src/adapters/`. See `docs/ADAPTERS.md`.

```
~/.forge/
  config.toml               # user config
  packages/<slug>@<ver>/    # extracted content
  cache/tarballs/           # downloaded .tar.gz
  links.json                # {pkg, version, adapters[]} source of truth
```

---

## Comparison

|  | **Forge** | `anthropics/skills` | `DSH` | `mcp-registry` | Manual `git clone` |
|---|---|---|---|---|---|
| Types | **6** (skill/mcp/plugin/agent/command/hook) | 1 (skill) | plugin | 1 (mcp) | 1 |
| Harnesses | **5+** (Claude/Codex/OpenCode/Cursor/Generic) | 1 | 1 (DeepSeek) | ~1 | per-harness manual |
| Versioning | **semver + lock** | none | none | partial | none |
| Update | `forge update` | manual | manual | manual | manual |
| Team sync | **`forge.toml` + `forge.lock`** | none | none | none | none |
| Search | `<500ms` offline | GitHub search | none | web only | none |
| Registry | **Git-native, forkable** | repo | repo | central | — |

Narrow tools fragment. Universal wins — same lesson as `brew`.

---

## Registry — 100 Packages

Seeded at v0.1 — `registry/packages/*.json` → `registry/index.json` + `search.json` + `stats.json`.

```bash
forge search mcp        # 24 results
forge search --type skill plan  # filtered
forge info skill/pdf    # versions, engines, sha
```

Stats: **57 skills, 24 MCPs, 8 agents, 5 commands, 3 hooks, 3 plugins.** Generated via:

```bash
npm run seed            # idempotent: 100 packages from catalog
npm run registry:build  # index + search + stats + --check in CI
```

Publish flow (v0.2): `forge publish` → GitHub Release → PR to `registry/packages/` → bot merges → R2 deploy.

See `docs/REGISTRY.md` and `docs/SPEC.md`.

---

## Architecture

```
CLI (TypeScript v0.1 → Rust v0.2)
  ├─ registry client (index.json + semver)
  ├─ store (~/.forge/packages/ + links.json + cache)
  ├─ adapters (detect/install/list — 1 file per harness)
  └─ commands (add/remove/list/search/info/doctor/init/install/update)
```

Full diagram and crate layout in `docs/ARCHITECTURE.md`. Tech choices: `commander` + `smol-toml` + `tsx` (no `bun` on Windows), `tsc` emit to `dist/` for `npm pack`.

---

## Docs

- [Vision](docs/VISION.md) — why now, why 100k
- [PRD](docs/PRD.md) — users, stories, commands, harness matrix
- [Architecture](docs/ARCHITECTURE.md) — components, security, perf
- [Package Spec](docs/SPEC.md) — `forge.toml` fields per type
- [Registry](docs/REGISTRY.md) — index schema, publish, fork
- [Adapters](docs/ADAPTERS.md) — add a harness in one file
- [Roadmap](docs/ROADMAP.md) — v0.1 → v1.0
- [100K Plan](docs/100K-PLAN.md) — 30 phases to 100k stars (6 epochs)

---

## Roadmap

**v0.1 — Homebrew moment** (now): 5 harnesses, 100 packages, `add/search/list/doctor/install/init` — Trending prep.
**v0.2 — NPM moment**: `forge publish`, deps, `cargo install`.
**v0.3 — Store moment**: `forge run`, Rust binary, GUI.
**v1.0 — Cloud**: team registry, `brew install forge`, `winget`.

See `docs/ROADMAP.md` and `docs/FAZ4-PLAN.md`.

---

## Contributing

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
npm install
npm run build
npm test                  # 5 smoke tests
npm run dev -- --help     # or: npx tsx cli/src/index.ts --help
```

- Add a package: create `registry/packages/<slug>.json` → `npm run registry:build`
- Add a harness: `cli/src/adapters/<name>.ts` → register in `adapters/index.ts` → `forge doctor`
- PR checklist: `npm run build && npm test && npm run registry:build -- --check`

See `CONTRIBUTING.md` and `AGENTS.md`.

---

## FAQ

**Is this just for Claude Code?**
No. 5 harnesses today, one file per new harness. The point is *universal* — same reason `brew` beat per-OS managers.

**How is this different from `mcp-registry` or `skills` repos?**
Those are single-type and single-harness. Forge is `brew` for *all* agent package types, on *every* harness, with versioning/lock/search.

**Does `install.sh` need `forge.sh` domain?**
No. `curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh` works today. `forge.sh` is a future vanity alias.

**Windows symlinks?**
Junction (`symlinkSync(..., 'junction')`) on dirs, fallback to `cpSync` on `EPERM`. `doctor` checks `links.json` (source of truth), not just dir scan.

**Why TypeScript first, not Rust?**
Speed to market. v0.1 is TypeScript + `tsx`; v0.2 rewrites to Rust for single binary `cargo install`. Adapters stay cheap.

**Private registry?**
Yes. Fork this repo, keep `registry/` private, point `~/.forge/config.toml` `registry = "https://your-r2/index.json"`.

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">
  <strong>Star this repo to get notified at launch. First 100 packages are live at <a href="https://github.com/oomerevren-beep/forge/releases/tag/v0.1.0">v0.1.0</a>.</strong><br>
  <code>forge add</code> → 5 places at once. <code>forge install</code> → team sync. Homebrew simple.
</p>
