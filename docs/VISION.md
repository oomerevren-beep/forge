# Forge — Vision

> The Homebrew for AI Agents. One CLI to rule every harness.

## One sentence

What `brew` is for system packages, `forge` is for the AI agent ecosystem.

## Problem

In 2026 the AI coding-agent boom is here but the ecosystem is fragmented:

- **Skills:** 280k-star `superpowers`, 172k `anthropics/skills` — but installing means `git clone + cp .md`, stone age
- **MCP Servers:** 5000+ MCP servers exist, each with a different install method (npx, docker, pip)
- **Plugins:** DeepSeek Harness hit 207k stars in 18 days ("Everything is a Plugin") but only runs on DeepSeek
- **Agents/Subagents:** every harness stores them in its own folder
- **Prompts/Commands:** slash commands are harness-specific

Result: one developer installs the same package 5 times by hand across Claude Code, Codex, OpenCode, Cursor, DeepSeek Harness. No versions, no updates, no dependencies.

## Solution: Forge

One package manager, all types, all harnesses:

```
forge add anthropics/plan          # skill
forge add modelcontextprotocol/filesystem  # mcp
forge add vercel/nextjs-plugin     # plugin
forge add obra/superpowers         # agent collection
forge add dotprompt/react-best-practices # prompt
```

One command -> installs to the right place, versions, updates.

## Scope — Not Just Skills

Forge manages 6 package types (all declared via `forge.toml`):

| Type | Description | Example |
|-----|----------|-------|
| `skill` | SKILL.md-based capability (Anthropic standard) | `anthropics/plan`, `superpowers` |
| `mcp` | Model Context Protocol server | `mcp/filesystem`, `mcp/github` |
| `plugin` | Harness extension (DSH, OpenCode plugin) | `dsh/desktop`, `opencode/lsp` |
| `agent` | Subagent definition (orchestrator/worker) | `agency/frontend-wizard` |
| `command` | Slash command | `/plan`, `/review` |
| `hook` | Lifecycle hook | `pre-commit`, `post-tool` |

All in the same registry, same CLI, same semantic versioning.

## Competition

| Rival | Stars | What it does | Gaps |
|-------|------|----------|-----------|
| `npx skills` (Vercel) | 30k | 75+ agents, repo-agnostic | No verification, no team sync, no local CLI |
| `anthropics/skills` | 173k | Claude skills | Single harness, no versioning |
| `DSH` (DeepSeek) | 208k | Plugin model | Single harness, no verification |
| `mcp-registry` | — | MCP servers | Single type, centralized |

**Forge's edge**: fail-closed verification + team sync + offline search + local CLI. That combination exists nowhere else.

## North-Star Metric

Packages installed via `forge add`. Goal: 10k installs in month 1, 1M by month 6.

## Long Term

Forge registry -> Agent App Store. Anyone publishes with `forge publish`, discovers with `forge search`, updates with `forge update`. Then run the agent directly with `forge run` (harness abstraction). Endgame: **the Agent OS package manager**.
