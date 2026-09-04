# Forge — PRD (Product Requirements Document)

## 1. Target Users

- **Primary:** developer using AI coding agents (Claude Code / Codex / OpenCode / Cursor / Windsurf / DeepSeek Harness)
- **Secondary:** creator writing skills/MCPs/plugins (looking for a distribution channel)
- **Tertiary:** team lead (wants to standardize the same skill set across the team)

## 2. User Stories

### US-1: Install
> As a developer, I want to install the `anthropics/plan` skill on all my harnesses with one command instead of manually copying it into each one.

### US-2: Discovery
> Starting a new project, I want to type `forge search pdf` and see the 10 best packages that handle PDFs.

### US-3: Update
> I want to update my 20 skills with one command: `forge update`.

### US-4: Publish
> I want to push my skill to the registry with `forge publish` so anyone can say `forge add my-skill`.

### US-5: Team Sync
> I want to push my `forge.toml` to git so my teammate gets the same set via `forge install` (like npm).

### US-6: MCP Install
> When I say `forge add mcp/filesystem`, I want the MCP server auto-added to `mcp.json` / `.cursor/mcp.json` / `claude.json`.

## 3. Functional Requirements

### 3.1 CLI Commands (v0.1)

| Command | Description | Example |
|-------|----------|-------|
| `forge add <pkg>[@ver]` | Install package | `forge add anthropics/plan@1.2.0` |
| `forge remove <pkg>` | Remove package | `forge remove anthropics/plan` |
| `forge list` | List installed packages | `forge list` |
| `forge search <query>` | Search registry | `forge search pdf` |
| `forge info <pkg>` | Package detail | `forge info anthropics/plan` |
| `forge update [pkg]` | Update (all or one) | `forge update` |
| `forge install` | Install from forge.toml | `forge install` |
| `forge publish` | Publish to registry | `forge publish` |
| `forge init` | Create new package | `forge init my-skill --type skill` |
| `forge doctor` | Harness detection + health | `forge doctor` |

### 3.2 Package Types

Every package contains `forge.toml`, type declared via `type`:

```toml
[package]
name = "anthropics/plan"
version = "1.2.0"
type = "skill" # skill | mcp | plugin | agent | command | hook
description = "Plan mode skill for Claude Code"
license = "MIT"
homepage = "https://github.com/anthropics/skills"

[engines]
claude-code = ">=1.0.0"
opencode = ">=0.5.0"
codex = "*"
cursor = "*"
dsh = "*"

[dependencies]
"obra/superpowers" = "^2.0.0"

[files]
include = ["SKILL.md", "scripts/*", "references/*"]
```

### 3.3 Harness Adapters (v0.1 support)

- `claude-code` -> `~/.claude/skills/<name>/`, `~/.claude/commands/`, `~/.claude.json` (mcp) + `<project>/CLAUDE.md` rules
- `codex` -> `~/.codex/skills/`, `~/.codex/mcp.json` + `<project>/AGENTS.md` rules
- `opencode` -> `.opencode/skills/`, `opencode.json` (mcp/plugins) + `<project>/AGENTS.md` rules
- `cursor` -> `<scope>/skills/`, `<scope>/rules/<name>.mdc`, `<scope>/mcp.json`
- `windsurf` -> `<scope>/skills/`, `<project>/.windsurfrules`, `<scope>/mcp_config.json`
- `dsh` -> `~/.dsh/plugins/` + `<project>/AGENTS.md` rules
- `generic` -> `./.forge/packages/<name>/` (fallback for unknown harnesses)

### 3.4 Registry

- Git-native: every package is a GitHub repo (or monorepo subfolder)
- Index: `registry/index.json` (on CDN, Cloudflare R2)
- Search: `registry/search.json` (for offline search)
- Publish: GitHub Release + `forge publish` index update (GitHub Action)

## 4. Non-Functional

- **Speed:** `forge add` < 3s (cache hit), < 10s (cold)
- **Offline:** `forge list` and installed packages work offline
- **Security:** `forge.toml` checksum, suspicious-package warnings via `forge doctor`, `forge audit` like `npm audit`
- **Cross-platform:** Windows, macOS, Linux (bash + PowerShell)

## 5. Success Criteria (v0.1)

- [ ] `forge add` works on 4 harnesses
- [ ] 100 packages in the registry
- [ ] `forge search` < 500ms
- [ ] 1st community package published via `forge publish`
- [ ] 7-second demo gif in the README

## 6. Out of Scope (v0.2+)

- `forge run` (agent-execution abstraction)
- `forge cloud` (team registry)
- GUI / VS Code extension
- Billing / private registry
