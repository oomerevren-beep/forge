# Forge — The Homebrew for AI Agents

[![CI](https://github.com/oomerevren-beep/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/oomerevren-beep/forge/actions)
[![npm version](https://img.shields.io/npm/v/forge?label=npm)](https://www.npmjs.com/package/forge)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![registry 100](https://img.shields.io/badge/registry-100%20packages-green.svg)](registry/index.json)

> One CLI to install skills, MCPs, plugins, agents on any harness.

> **v0.1.0 — 100 packages, 5 harnesses, team sync ready** — `forge install` now live.

![demo](docs/assets/demo.gif)

```bash
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
# Windows: irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex
# or
npm i -g forge
```

`brew` is for system packages. `forge` is for AI agent packages.

```bash
forge add anthropics/plan          # skill -> Claude Code + Codex + OpenCode + Cursor
forge add mcp/filesystem           # MCP server -> auto mcp.json
forge add obra/superpowers         # agent collection
forge search pdf                   # search 500+ packages
forge update                       # update everything
```

No more `git clone + cp SKILL.md`. One command, every harness.

---

## Why Forge?

2026'da her sey skill/plugin/MCP ama kurulum tas devri. Her harness farkli klasor, versiyon yok, guncelleme yok.

- `obra/superpowers` 280k star ama kurulum manuel
- `deepseek-harness` 18 gunde 207k star — "Everything is a Plugin" kaniti
- `anthropics/skills` 172k star ama sadece Claude

**Forge hepsini birlestirir:** 6 paket tipi, 5+ harness, tek CLI.

| Type | Example | What it does |
|------|---------|--------------|
| `skill` | `anthropics/plan` | SKILL.md yetenek |
| `mcp` | `mcp/filesystem` | MCP server |
| `plugin` | `dsh/desktop` | Harness extension |
| `agent` | `agency/frontend` | Subagent |
| `command` | `/plan` | Slash command |
| `hook` | `pre-tool` | Lifecycle hook |

---

## Install

```bash
# via curl (recommended)
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh

# via npm
npm i -g forge

# via cargo (v0.2)
cargo install forge
```

## Quick Start

```bash
forge doctor              # detect your harnesses
forge search plan         # find packages
forge add anthropics/plan # install one package
forge list                # see installed
forge update              # update all
```

### Takim senkronu — `forge install`

`forge.toml` dosyasini projene ekle, herkes ayni seti tek komutla kurar (npm'deki `package.json` gibi):

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
forge install          # hepsini kurar, forge.lock olusturur
forge install --frozen # lock'taki surumleri birebir kurar (CI icin)
forge outdated         # eskileri gosterir
forge update           # hepsini gunceller
forge update mcp/github # tek paketi gunceller
```

### Yeni paket olusturma

```bash
forge init my-skill --type skill --yes   # skill sablonu + SKILL.md
forge init my-mcp --type mcp --yes       # mcp sablonu + [mcp] config
forge init my-agent --type agent --yes   # agent sablonu
```

Project-level (team sync) kisaca:

```toml
# forge.toml in your project
[dependencies]
"anthropics/plan" = "^1.2.0"
"mcp/filesystem" = "^2.0.0"
```

```bash
forge install  # installs all from forge.toml (yukaridaki ornek detayli)
```

---

## How it works

```
forge add anthropics/plan
  -> fetch registry/index.json (R2 CDN)
  -> download tarball from GitHub Release
  -> adapter: copy to ~/.claude/skills/ + ~/.codex/skills/ + .opencode/skills/ + .cursor/skills/
```

Adapters handle every harness. Add a new harness = one file in `cli/src/adapters/`.

## Registry

Git-native. Every package is a GitHub repo. Registry is just an index (`registry/index.json`). Forkable, private registry supported.

Publish your package:

```bash
forge init my-skill --type skill
# edit forge.toml
forge publish
```

See [docs/SPEC.md](docs/SPEC.md) and [docs/REGISTRY.md](docs/REGISTRY.md).

## Docs

- [Vision](docs/VISION.md) — why Forge
- [PRD](docs/PRD.md) — product spec
- [Architecture](docs/ARCHITECTURE.md) — how it's built
- [Package Spec](docs/SPEC.md) — forge.toml
- [Adapters](docs/ADAPTERS.md) — harness support
- [Roadmap](docs/ROADMAP.md) — v0.1 -> v1.0

## Status

**v0.1 — 100 packages, 5 harnesses, `forge install` ready — Trending prep**
- Faz 1: `forge add` 5 harness'te çalışıyor
- Faz 2: 100 paket seed (57 skill, 24 mcp, 8 agent, 5 command, 3 hook, 3 plugin)
- Faz 3: `forge install` / `init` / `update` / `lock` / `config` hazır, test 5/5 PASS
- Faz 4: 7s demo + `install.sh` + README polish (bu faz) — HN/Product Hunt öncesi son cilâ

Star this repo to get notified at launch. First 100 packages drop at v0.1.

---

## Contributing

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
npm install
npm run build
npm test
npm run dev -- help  # or: npx tsx cli/src/index.ts --help
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
