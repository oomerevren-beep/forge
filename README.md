# Forge — The Universal Package Manager for AI Agent Context, Skills & MCPs

> **Stop manually copying `.cursorrules` and `mcp.json` across 5 different AI editors. One command to rule them all.**

<div align="center">

[![CI](https://github.com/oomerevren-beep/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/oomerevren-beep/forge/actions)
[![npm version](https://img.shields.io/npm/v/tryforge?label=npm&color=CB3837)](https://www.npmjs.com/package/tryforge)
[![npm downloads](https://img.shields.io/npm/dw/tryforge?label=downloads)](https://www.npmjs.com/package/tryforge)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![registry](https://img.shields.io/badge/registry-21%20verified%20packages-green.svg)](registry/index.json)
[![GitHub stars](https://img.shields.io/github/stars/oomerevren-beep/forge?style=social)](https://github.com/oomerevren-beep/forge)

<br>

```bash
npx -y tryforge doctor
forge add agent-security-auditor
```

<br>

<em>3-second wow: `forge add agent-security-auditor` writes rules to Cursor, Claude, Codex, Windsurf — simultaneously.</em>

</div>

---

## Why Forge?

You're using Claude Code + Codex + OpenCode + Cursor. You want the same security rules, MCP servers, and skills everywhere. Today you:

1. `git clone` a repo
2. Copy `SKILL.md` to 4 different folders
3. Manually paste the same rules into `.cursorrules`, `CLAUDE.md`, `.windsurfrules`
4. Repeat for every new skill, every update

**Forge fixes it.** One command → every editor. Deterministic `forge.toml` → your whole team ships the same AI context.

<div align="center">

| | Manual Setup | Forge |
|---|---|---|
| Multi-editor support | ❌ Copy-paste × 4 | ✅ One command |
| Version pinning | ❌ None | ✅ `forge.lock` + SHA-256 |
| Security audit | ❌ Zero | ✅ AST scanner (HIGH = refuse) |
| Team sync | ❌ Out of sync | ✅ `forge sync` |
| Updates | ❌ Manual | ✅ `forge update` |
| Zero-install | ❌ | ✅ `npx -y tryforge` |

</div>

---

## Install

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh

# Windows PowerShell
irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex

# Or with Node 22+
npm i -g tryforge
```

```bash
npx -y tryforge doctor   # zero-install — no global install needed
```

---

## Quick Start (60 seconds)

```bash
# 1. Initialize your project
npx forge init

# 2. Add the packages you want
forge add github:my-org/agent-security
forge add pdf/merge
forge add mcp/filesystem

# 3. Sync every editor
npx forge sync
```

Done. Cursor, Claude Code, Codex, OpenCode, Windsurf, DSH — all share the same context.

---

## Supported Harnesses

| Harness | Status | Rule Format |
|---------|:------:|-------------|
| Claude Code | ✅ | `CLAUDE.md` merged blocks |
| Cursor | ✅ | `.cursor/rules/*.mdc` |
| OpenCode | ✅ | `AGENTS.md` shared blocks |
| Codex | ✅ | `AGENTS.md` shared blocks |
| Windsurf | ✅ | `.windsurfrules` merged |
| DSH | ⚠️ | `AGENTS.md` (community) |
| Generic | ✅ | `.forge/` fallback |

---

## Team Sync — `forge.toml`

```toml
# forge.toml — single source of truth for your project's AI context
[project]
name = "my-app"
version = "1.0.0"

[dependencies]
"agent-pr-reviewer" = "^1.2.0"
"mcp-filesystem" = "^1.0.0"

[skills.team-rules]
source = "github:my-org/team-skills"
ref = "main"

[agents.developer]
model = "claude-3-7-sonnet"
system_prompt = "Senior engineer. TDD. No shortcuts."

[mcp.servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/db"]

[permissions]
denied_paths = [".env*", "id_rsa*", "./secrets"]
allow_network = false
```

```bash
# Everyone on the team runs:
git pull
npx forge sync
# That's it — identical AI context across every editor
```

---

## Security

Forge is **fail-closed** by default:

- **sha256 verification** — every package is hash-pinned; mismatch = exit 1
- **Static scanner** — 19 rules (shell-danger, prompt-inject, perm-violation); HIGH blocks install
- **`forge audit`** — flags mock/unverified installs (exit 1 on high-severity)
- **`forge.toml` [permissions]** — denied paths enforced per-project

```bash
forge audit                    # scan installed packages
forge test ./my-package        # pre-publish validation
forge verify ./my-package      # full schema + security + adapter check
```

---

## Available Packages

**21 verified packages** (sha256-pinned). Registry is git-native and forkable.

| Category | Examples |
|----------|----------|
| Skills | `cmd/plan`, `cmd/review`, `obra/superpowers` |
| MCP Servers | `mcp/filesystem`, `mcp/github`, `mcp/postgres`, `mcp/memory`, `mcp/sequential-thinking` |
| Agents | `agency/frontend`, `agency/backend` |
| PDF Tools | `pdf/merge`, `pdf/split`, `pdf/forms`, `pdf/ocr`, `pdf/extract`, `pdf/compress`, `pdf/convert`, `pdf/tables` |

```bash
forge search pdf
forge search mcp
forge info mcp/github
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `forge add <pkg>` | Install to all harnesses (registry, GitHub, local) |
| `forge remove <pkg>` | Uninstall from all harnesses |
| `forge install` | Install all `[dependencies]` from `forge.toml` |
| `forge install --frozen` | CI mode: exact from `forge.lock` |
| `forge sync` | One-command team sync (skills + rules + MCP + roles) |
| `forge init <name>` | Scaffold a new package |
| `forge test <pkg>` | Validate against adapter matrix (dry-run) |
| `forge pack` | Build verified tarball |
| `forge verify <pkg>` | Schema + security + adapter check |
| `forge audit` | Scan installed packages (fail-closed) |
| `forge doctor` | Health check harnesses + store |
| `forge search <query>` | Fuzzy search (<200ms, offline) |
| `forge list` | List installed packages |
| `forge outdated` | Show packages with newer versions |
| `forge update` | Update all (or one) to latest |
| `forge tui` | Interactive terminal dashboard |

---

## Architecture

```
CLI (TypeScript)
  ├─ registry client (index.json + semver)
  ├─ store (~/.forge/ + links.json + cache)
  ├─ adapters (1 file per harness — symlink or copy)
  ├─ core (merge engine, security scanner, lock, sources)
  └─ commands (add/remove/sync/audit/test/pack/verify/tui)
```

**v0.1 → v0.2 → v1.0:**
- **v0.1** (now): 7 harnesses, 21 verified packages, full CLI
- **v0.2**: `forge publish`, Rust rewrite for `cargo install`
- **v1.0**: Team registry, `brew install forge`, `winget`

See [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Add a Package

```bash
# 1. Create your package
forge init my-skill --type skill --yes
# Edit SKILL.md + forge.toml

# 2. Verify it
forge verify .

# 3. Publish (v0.2: tarball + GitHub Release + registry PR)
```

Until `publish` lands, open a PR adding `registry/packages/<slug>.json` + run `npm run registry:build -- --check`.

---

## Add a Harness

One file: `cli/src/adapters/<name>.ts`. Implement the `Adapter` interface. Register in `adapters/index.ts`. Done.

See [docs/ADAPTERS.md](docs/ADAPTERS.md).

---

## Documentation

- [Install Guide](docs/INSTALL.md)
- [Package Spec](docs/SPEC.md) — `forge.toml` fields per type
- [Architecture](docs/ARCHITECTURE.md) — components, security, perf
- [Adapters](docs/ADAPTERS.md) — add a harness in one file
- [Registry](docs/REGISTRY.md) — index schema, publish, fork
- [Roadmap](docs/ROADMAP.md)
- [Examples](examples/)

---

## Badges

Add `forge` to your project:

```markdown
[![Managed by Forge](https://img.shields.io/badge/Agent%20Context-Forge-6366f1?style=flat-square&logo=anthropic)](https://github.com/oomerevren-beep/forge)
```

---

## FAQ

**Is this just for Claude Code?**
No. 7 harnesses today, one file per new harness. The point is *universal*.

**Does `install.sh` need `forge.sh` domain?**
No. Works from GitHub raw today.

**Are packages verified?**
21 are sha256-pinned and pass the static scanner. The rest is tracked for Phase 13.

**Windows support?**
Full. Junction on dirs, file-by-file copy fallback for non-ASCII paths, PowerShell installer.

**Private registry?**
Yes. Fork this repo, keep `registry/` private, point `~/.forge/config.toml` to your own index.

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

<strong>Star this repo to get notified at v1.0.</strong><br>
<code>forge add</code> → 7 places at once. <code>forge sync</code> → team sync. Homebrew simple.

</div>
