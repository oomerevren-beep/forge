# Forge Package Specification (PACKAGE_SPEC.md)

**Version:** 1.0.0  
**Status:** Production Standard  
**Maintainer:** Forge Core Team (`oomerevren-beep/forge`)

---

## 1. Overview

Forge is the package manager and container format for AI agent context ("Docker for Context"). A **Forge package** is a self-contained, distributable, deterministic archive of agent capabilities, configurations, instructions, or integrations that can be loaded across any AI development harness (Claude Code, Cursor, Codex, Windsurf, OpenCode, and Generic Forge environments).

Every Forge package:
1. Conforms to the standard directory layout.
2. Contains a root manifest file named `forge.toml`.
3. Declares strict permission boundaries (`[permissions]`) and harness compatibility (`[compatibility]`).
4. Follows Semantic Versioning 2.0.0.
5. Is assigned a verified trust and quality tier (`community`, `verified`, or `trusted`).

---

## 2. Package Types

Forge recognizes 9 canonical package types, each mapped to specific AI runtime responsibilities:

| Type | Name | Purpose | Canonical Entrypoint |
| :--- | :--- | :--- | :--- |
| `skill` | Agent Skill | Self-contained, invokeable tool or procedure that extends an agent's problem-solving repertoire | `SKILL.md` or `src/` |
| `agent` | Subagent Persona | Complete autonomous agent definition with dedicated system prompts, tool permissions, and memory | `agent.md` |
| `command` | Slash Command | Interactive slash command or CLI shortcut invoker (e.g. `/plan`, `/review`) | `command.md` |
| `instruction` | Prompt Instructions | Coding style, architecture guidelines, or organizational rules injected into context | `instruction.md` |
| `mcp` | Model Context Protocol | External MCP server executable or proxy configuration (tools, resources, prompts) | `mcp.json`, `src/index.ts` |
| `workflow` | Multi-Step Workflow | Graph or sequenced multi-agent pipeline orchestrating tasks across roles | `workflow.yaml` |
| `rule` | Hard Constraints | Strict negative constraints, security boundaries, and linting rules | `rules/` or `rule.md` |
| `prompt` | Prompt Template | Parameterized user or system prompt templates with variable interpolation | `prompt.md` |
| `config` | Toolchain Config | Shared tool configurations, linters, formatter settings, or harness settings | `config.json` |

*(Legacy compatibility: `plugin` and `hook` types continue to parse as specialized variants of `skill` and `command` respectively).*

---

## 3. Manifest Specification: `forge.toml`

Every package root must contain a `forge.toml` manifest written in TOML v1.0.0.

### 3.1 Minimal Package Manifest

```toml
[package]
name = "acme/git-review"
version = "1.0.0"
type = "skill"
description = "Automated git diff review with architectural insights and security checks"
license = "MIT"
tier = "community"

[compatibility]
harnesses = ["claude-code", "cursor", "codex", "windsurf", "opencode"]

[permissions]
allowed_paths = ["./src", "./docs"]
denied_paths = [".env*", "id_rsa*", "./secrets"]
allow_network = false
```

### 3.2 Full Schema Definition

#### `[package]` Table (Required)
- `name` *(string, required)*: Package identifier in `scope/name` format (e.g. `anthropics/plan`, `mcp/filesystem`). Regex: `^[a-z0-9-]+\/[a-z0-9-]+$`.
- `version` *(string, required)*: SemVer 2.0.0 version string (`MAJOR.MINOR.PATCH` with optional `-prerelease`).
- `type` *(string, required)*: One of the 9 canonical types: `skill`, `agent`, `command`, `instruction`, `mcp`, `workflow`, `rule`, `prompt`, `config`.
- `description` *(string, required)*: Concise description between 10 and 300 characters.
- `license` *(string, required)*: Valid SPDX license expression (default: `MIT`).
- `author` *(string, optional)*: Author name and optional email (e.g. `Jane Doe <jane@example.com>`).
- `tier` *(string, optional)*: Trust tier: `community` (default), `verified`, or `trusted`.
- `homepage` *(string, optional)*: URL to project homepage or documentation.
- `repository` *(string, optional)*: URL to source repository.
- `keywords` *(array of strings, optional)*: Discoverability tags.
- `source` *(string, optional)*: Monorepo subpath.

#### `[compatibility]` Table (Required for Validation)
- `harnesses` *(array of strings, required)*: List of supported harnesses (`claude-code`, `cursor`, `codex`, `windsurf`, `opencode`, `dsh`, `generic`). May use `["*"]` for all.
- `forge` *(string, optional)*: Forge CLI semver compatibility range (e.g. `>=0.2.0`).
- `os` *(array of strings, optional)*: Supported operating systems (`darwin`, `linux`, `win32`).

#### `[permissions]` Table (Required for Validation)
Explicit sandbox and permission boundaries checked at install and audit time:
- `allowed_paths` *(array of strings, optional)*: Path globs the package is authorized to read or modify.
- `denied_paths` *(array of strings, optional)*: Path globs explicitly blocked from access (e.g. `[".env*", "id_rsa*", "./secrets"]`).
- `allow_network` *(boolean, optional, default false)*: Whether network access is permitted.
- `allow_env` *(boolean, optional, default false)*: Whether reading arbitrary environment variables is permitted.
- `allow_shell` *(boolean, optional, default false)*: Whether executing shell commands is permitted.

#### `[dependencies]` Table (Optional)
Dependencies on other Forge packages resolved via semantic version ranges:
```toml
[dependencies]
"obra/superpowers" = "^2.0.0"
"mcp/filesystem" = ">=1.0.0"
```

#### `[files]` Table (Optional)
Packaging inclusion and exclusion globs:
- `include` *(array of strings)*: Globs to bundle.
- `exclude` *(array of strings)*: Globs to omit.

#### Type-Specific Tables (Conditional)
- **`[mcp]`** (required for `type = "mcp"`):
  - `command` *(string, required)*: Executable command (e.g. `node`, `npx`, `python`).
  - `args` *(array of strings, optional)*: Arguments passed to the command.
  - `env` *(table of strings, optional)*: Environment variables required by the server.
- **`[skill]`** (for `type = "skill"`):
  - `name` *(string, optional)*: Display name.
  - `invocation` *(string, optional)*: Invocation trigger (e.g. `/review`).
  - `allowed-tools` *(array of strings, optional)*: AI tool permissions (e.g. `["Read", "Write", "Bash"]`).
- **`[agent]`** (for `type = "agent"`):
  - `model` *(string, optional)*: Preferred model class.
  - `system_prompt` *(string, optional)*: Inlined prompt or path reference (`agent.md`).
  - `tools` *(array of strings, optional)*: Permitted tool calls.
- **`[rule]`** (for `type = "rule"`):
  - `severity` *(string, optional)*: Rule enforcement level (`error`, `warning`).
  - `targets` *(array of strings, optional)*: File globs to which the rule applies.

---

## 4. Directory Layout

A standard Forge package directory follows this layout:

```text
acme-git-review/
├── forge.toml          # Canonical package manifest (REQUIRED)
├── README.md           # Documentation, usage, and permissions (REQUIRED)
├── LICENSE             # SPDX license file (REQUIRED)
├── CHANGELOG.md        # Release history and SemVer notes (REQUIRED)
├── SKILL.md            # Primary capability or prompt instructions (or type-specific entry)
├── tests/              # Verification test suite (REQUIRED)
│   └── package.test.js # Test assertions
└── src/                # Optional executable source code or scripts
```

### Type-Specific Canonical Payloads:
- `skill`: `SKILL.md` (Markdown instructions with frontmatter or prompt instructions).
- `agent`: `agent.md` (Agent persona, system prompt, and reasoning instructions).
- `command`: `command.md` (Slash command handler instructions).
- `instruction`: `instruction.md` (Universal guidelines for coding/context).
- `mcp`: `mcp.json` and `src/index.ts` (Executable server).
- `workflow`: `workflow.yaml` or `workflows/main.md`.
- `rule`: `rules/` directory or `rule.md`.
- `prompt`: `prompt.md`.
- `config`: `config.json`.

---

## 5. Semantic Versioning

Forge strictly adheres to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):

1. **`PATCH` (0.0.x)**:
   - Bug fixes, typo corrections, minor prompt refinements that do not alter the behavioral contract or tool assumptions.
2. **`MINOR` (0.x.0)**:
   - Backward-compatible capability additions, new optional tools, or non-breaking instruction enhancements.
3. **`MAJOR` (x.0.0)**:
   - Breaking changes in prompt structure, removal or renaming of tools, escalated permission requirements (e.g. requiring network access when previously disabled), or harness incompatibilities.

Version resolution supports standard ranges:
- Caret (`^1.2.3`): Allows non-breaking updates within the same major version.
- Tilde (`~1.2.3`): Allows patch updates within the same minor version.
- Comparison (`>=1.0.0 <2.0.0`): Explicit bounded ranges.
- Wildcard (`*`): Highest available version.

---

## 6. Trust & Quality Tiers

Every package in Forge belongs to one of three hierarchical trust tiers:

```
               ┌────────────────────────┐
               │     trusted ★★★       │  Cryptographically signed, audited, zero warnings
               └───────────┬────────────┘
                           │
               ┌───────────┴────────────┐
               │     verified ★★        │  Identity-verified publisher, pinned hash, tested
               └───────────┬────────────┘
                           │
               ┌───────────┴────────────┐
               │     community ★        │  Open-source, static security scanned
               └────────────────────────┘
```

### 6.1 `community` Tier (Baseline)
- **Eligibility:** Any open-source package published by community developers.
- **Verification:**
  - Automated manifest validation (`forge validate`).
  - Static security scan pass (`forge scan`: 0 high severity findings).
  - Secret scanning pass (no embedded private keys or tokens).
- **Badge:** `[community]`

### 6.2 `verified` Tier (Standard)
- **Eligibility:** Packages published by recognized organizations, maintainers with verified GitHub identities, or core contributors.
- **Verification:**
  - All `community` checks passed.
  - Publisher identity verified (cryptographic key or verified GitHub organization).
  - Cross-harness compatibility verified on adapter test matrix (passes Claude Code, Cursor, Codex, etc.).
  - SHA-256 integrity hash pinned in the official registry.
  - Maintained repository with valid issue tracker and CI status.
- **Badge:** `[verified ✓]`

### 6.3 `trusted` Tier (Premium / Enterprise)
- **Eligibility:** First-party Forge packages, audited enterprise skills, or mission-critical MCP servers.
- **Verification:**
  - All `verified` checks passed.
  - Cryptographically signed with RSA/Ed25519 publisher keypair (`forge sign`).
  - Formal security audit pass with 0 high and 0 medium findings.
  - Strict sandbox compliance (minimal declared permissions, no unconstrained paths).
  - Explicit SLA and active maintenance policy.
- **Badge:** `[trusted ★]`

---

## 7. CLI Lifecycle Commands

Forge provides five canonical commands managing the package lifecycle:

1. **`forge create <name> [--type <type>]`**:
   Scaffolds a production-ready package with manifest, README, LICENSE, CHANGELOG, entrypoint, and test template.
2. **`forge validate [path]`**:
   Executes pre-publish validation ensuring complete manifest, semver, license, documentation, secret scan, and security rules.
3. **`forge pack [path]`**:
   Deterministically archives package contents into a `.tgz` tarball and computes the SHA-256 digest.
4. **`forge publish [path]`**:
   Orchestrates validate -> scan -> pack -> publish to registry endpoint with token authentication.
5. **`forge info <package>`**:
   Inspects package metadata, trust signals, publisher identity, quality tier, permissions, and dependencies.
