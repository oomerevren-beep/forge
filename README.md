# Forge — The Homebrew for AI Agents

> One CLI to install skills, MCPs, plugins, agents on any harness.

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
curl -fsSL https://forge.sh/install.sh | sh

# via npm/bun
npm i -g forge
# or
bun add -g forge

# via cargo (v0.2)
cargo install forge
```

## Quick Start

```bash
forge doctor              # detect your harnesses
forge search plan         # find packages
forge add anthropics/plan # install
forge list                # see installed
forge update              # update all
```

Project-level (team sync):

```toml
# forge.toml in your project
[dependencies]
"anthropics/plan" = "^1.2.0"
"mcp/filesystem" = "^2.0.0"
```

```bash
forge install  # installs all from forge.toml
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

**v0.1 in progress** — CLI + 4 adapters + 100 packages seed. Follow progress in [ROADMAP](docs/ROADMAP.md).

Star this repo to get notified at launch. First 100 packages drop at v0.1.

---

## Contributing

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
bun install
bun run dev -- help
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
