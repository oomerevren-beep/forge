# Forge — Universal Package Manager for AI Agent Context, Skills & MCPs

> **Stop manually copying `.cursorrules` and `mcp.json` across different AI editors. One command to rule them all.**

<div align="center">

[![CI](https://github.com/oomerevren-beep/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/oomerevren-beep/forge/actions)
[![npm version](https://img.shields.io/npm/v/@oomerevren/tryforge?label=npm&color=CB3837)](https://www.npmjs.com/package/@oomerevren/tryforge)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![registry](https://img.shields.io/badge/registry-21%20verified%20packages-green.svg)](registry/index.json)
[![GitHub](https://img.shields.io/badge/github-oomerevren--beep%2Fforge-181717?logo=github)](https://github.com/oomerevren-beep/forge)

<br>

```bash
npx tryforge doctor
forge add agent/security-auditor
```

<br>

<em>Single command: <code>forge add agent/security-auditor</code> configures rules across Cursor, Claude Code, Codex, and Windsurf simultaneously.</em>

</div>

---

## Why Forge?

When you work across multiple AI tools (Claude Code, Codex, OpenCode, Cursor, Windsurf), you need identical security rules, MCP servers, and skills everywhere. Today developers usually:

1. `git clone` or bookmark a skill repository
2. Manually copy `SKILL.md` into several different editor directories
3. Copy-paste instructions into `.cursor/rules/`, `CLAUDE.md`, `.windsurfrules`, etc.
4. Manually re-edit configuration files on every update or team member machine

**Forge solves this.** One command installs context to every detected harness. A deterministic `forge.toml` ensures your entire team runs identical agent context.

<div align="center">

| Feature | Manual Setup | Forge |
|---|---|---|
| Multi-editor support | ❌ Copy-paste across directories | ✅ One command to all harnesses |
| Version pinning | ❌ Manual and error-prone | ✅ Deterministic `forge.lock` + SHA-256 |
| Security pre-scan | ❌ None | ✅ Static security scanner (fail-closed on HIGH) |
| Team sync | ❌ Context drifts over time | ✅ `forge sync` (`--frozen` for CI) |
| Drift protection | ❌ Silent overwriting | ✅ Colored diff preview & automatic `.drift.bak` |
| Updates | ❌ Manual file hunting | ✅ `forge update` |
| Zero-install | ❌ | ✅ `npx tryforge` |

</div>

---

## Installation

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh

# Windows PowerShell
irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex

# Or with Node 20+ via npm (provides both 'forge' and 'tryforge' commands)
npm i -g @oomerevren/tryforge
```

```bash
# Zero-install check (no global install needed)
npx tryforge doctor
```

---

## Quick Start (60 seconds)

```bash
# 1. Initialize your project
npx tryforge init

# 2. Add packages (from registry, GitHub, or local path)
forge add pdf/merge
forge add mcp/filesystem
forge add github:oomerevren-beep/forge

# 3. Sync across all harnesses in your workspace
forge sync
```

Done. Cursor, Claude Code, Codex, OpenCode, Windsurf, DSH, and Generic fallback now share the exact same context.

---

## Supported Harnesses

| Harness | Status | Configuration Target |
|---|:---:|---|
| **Claude Code** | ✅ | `CLAUDE.md` (AST/comment-delimited managed blocks) |
| **Cursor** | ✅ | `.cursor/rules/*.mdc` (frontmatter rule files) |
| **OpenCode** | ✅ | `AGENTS.md` (shared block management) |
| **Codex** | ✅ | `AGENTS.md` (shared block management) |
| **Windsurf** | ✅ | `.windsurfrules` (managed blocks) |
| **DSH** | ⚠️ | `AGENTS.md` (community harness) |
| **Generic** | ✅ | `.forge/` fallback directory |

---

## Team Sync — `forge.toml`

```toml
# forge.toml — single source of truth for your project's AI context
[project]
name = "my-app"
version = "1.0.0"

[dependencies]
"agent/security-auditor" = "^1.0.0"
"mcp/filesystem" = "^1.0.0"
"pdf/merge" = "^1.0.0"

[skills.team-rules]
source = "github:oomerevren-beep/team-skills"
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
# In CI or onboarding a new teammate:
git pull
forge sync --frozen
```

---

## Security Model

Forge is **fail-closed** by default:

- **Cryptographic verification:** Every registry package is SHA-256 hash-pinned in `forge.lock`; mismatches fail closed with exit code 1.
- **Deterministic static security scanner:** 19+ static regex and heuristic rules inspect packages before install for shell hazards (`rm -rf /`, `curl | sh`, reverse shells, disk wipes), prompt injection delimiters, secret exfiltration, and project permission boundaries.
- **Fail-closed policy:** Any `high`-severity finding refuses installation and sync immediately.
- **Archive & traversal hardening:** Tar extraction enforces path checks against tar-slip (`../`) and escaping symlinks.
- **Audit command:** Run `forge audit` to verify all installed workspace packages.

> For full architectural details, rule catalogs, and honest scanner limitations, see [docs/SECURITY.md](docs/SECURITY.md).

---

## Available Packages

**21 verified packages** are available in the default git-native registry (`registry/index.json`), all SHA-256 pinned:

| Category | Examples |
|---|---|
| **Skills** | `cmd/plan`, `cmd/review`, `obra/superpowers` |
| **MCP Servers** | `mcp/filesystem`, `mcp/github`, `mcp/postgres`, `mcp/memory`, `mcp/sequential-thinking` |
| **Agents** | `agency/frontend`, `agency/backend`, `agent/security-auditor` |
| **PDF Tools** | `pdf/merge`, `pdf/split`, `pdf/forms`, `pdf/ocr`, `pdf/extract`, `pdf/compress`, `pdf/convert`, `pdf/tables` |

```bash
forge search pdf
forge search mcp
forge info mcp/github
```

---

## CLI Commands

| Command | Description |
|---|---|
| `forge add <pkg>` | Install to all harnesses (registry, GitHub, or local path) |
| `forge remove <pkg>` | Safely remove managed package blocks without touching user code |
| `forge install` | Install all `[dependencies]` declared in `forge.toml` |
| `forge install --frozen` | CI mode: strictly verify against `forge.lock` |
| `forge sync` | Synchronize skills, rules, MCP servers, and agent roles |
| `forge sync --dry-run` | Preview sync actions without writing to disk |
| `forge sync --diff` | Display colored unified diff before modifying files |
| `forge sync --frozen` | Strict team sync verifying lockfile integrity |
| `forge init [name]` | Scaffold a new Forge project or package |
| `forge test <pkg>` | Dry-run package installation against the harness matrix |
| `forge pack` | Build a verified tarball from a package directory |
| `forge verify <pkg>` | Verify package manifest, permissions, and security scan |
| `forge audit [--json]` | Scan installed packages and report security findings |
| `forge search <query> [--json]` | Fast search across registry index (<200ms, offline) |
| `forge list [--json]` | List installed packages and active adapters |
| `forge outdated` | Check for available package updates |
| `forge update [pkg]` | Update dependencies to their latest compatible versions |
| `forge doctor [--json]` | Diagnostic health check (Node, OS, config, lockfile, adapters) |
| `forge tui` | Interactive terminal UI dashboard |

---

## Documentation

- [docs/INSTALL.md](docs/INSTALL.md) — Comprehensive installation instructions
- [docs/SECURITY.md](docs/SECURITY.md) — Security model, scanner rules, limitations & disclosure policy
- [docs/SPEC.md](docs/SPEC.md) — `forge.toml` specification and package manifest schema
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture, core engines, and merge strategy
- [docs/ADAPTERS.md](docs/ADAPTERS.md) — Harness adapter development guide
- [docs/REGISTRY.md](docs/REGISTRY.md) — Registry schema, verification, and self-hosting
- [docs/ROADMAP.md](docs/ROADMAP.md) — Roadmap from v0.2 to v1.0

---

## License

MIT — see [LICENSE](LICENSE).