# Forge — Vision

> The Homebrew for AI Agents. One CLI to rule every harness.

## Tek cumle
`brew` ne ise sistem paketleri icin, `forge` o'dur AI agent ekosistemi icin.

## Problem
2026'da AI coding agent patlamasi yasaniyor ama ekosistem daginik:

- **Skills:** 280k star `superpowers`, 172k `anthropics/skills` — ama kurulum `git clone + cp .md` tas devri
- **MCP Servers:** 5000+ MCP server var, her biri farkli install yontemi (npx, docker, pip)
- **Plugins:** DeepSeek Harness 18 gunde 207k star aldi ("Everything is a Plugin") ama sadece DeepSeek'te calisiyor
- **Agents/Subagents:** Her harness kendi klasorunde sakliyor
- **Prompts/Commands:** Slash command'lar harness'e ozel

Sonuc: Bir developer Claude Code, Codex, OpenCode, Cursor, DeepSeek Harness arasinda ayni paketi 5 kez manuel kuruyor. Versiyon yok, guncelleme yok, dependency yok.

## Cozum: Forge

Tek paket yoneticisi, tum tipler, tum harness'lar:

```
forge add anthropics/plan          # skill
forge add modelcontextprotocol/filesystem  # mcp
forge add vercel/nextjs-plugin     # plugin
forge add obra/superpowers         # agent koleksiyonu
forge add dotprompt/react-best-practices # prompt
```

Tek komut -> dogru yere kurar, versiyonlar, gunceller.

## Kapsam — Sadece Skill Degil

Forge 6 paket tipini yonetir (hepsi `forge.toml` ile tanimli):

| Tip | Aciklama | Ornek |
|-----|----------|-------|
| `skill` | SKILL.md tabanli yetenek (Anthropic standard) | `anthropics/plan`, `superpowers` |
| `mcp` | Model Context Protocol server | `mcp/filesystem`, `mcp/github` |
| `plugin` | Harness extension (DSH, OpenCode plugin) | `dsh/desktop`, `opencode/lsp` |
| `agent` | Subagent tanimi (orchestrator/worker) | `agency/frontend-wizard` |
| `command` | Slash command | `/plan`, `/review` |
| `hook` | Lifecycle hook | `pre-commit`, `post-tool` |

Hepsi ayni registry'de, ayni CLI ile, ayni semantik versiyonlama ile.

## Rekabet

| Rakip | Star | Ne yapar | Eksikleri |
|-------|------|----------|-----------|
| `npx skills` (Vercel) | 30k | 75+ ajan, repo-agnostik | Doğrulama yok, takım senkronu yok, yerel CLI yok |
| `anthropics/skills` | 173k | Claude skill'leri | Tek harness, versiyonlama yok |
| `DSH` (DeepSeek) | 208k | Plugin modeli | Tek harness, doğrulama yok |
| `mcp-registry` | — | MCP sunucuları | Tek tür, merkezi |

**Forge'un farkı**: fail-closed doğrulama + takım senkronu + offline arama + yerel CLI. Bu kombinasyon yok.

## Kuzey Yildizi Metrigi

`forge add` ile kurulan paket sayisi. Hedef: 1. ay 10k install, 6. ay 1M install.

## Uzun Vadeli

Forge registry -> Agent App Store. `forge publish` ile herkes paket yayinlar, `forge search` ile kesfeder, `forge update` ile gunceller. Sonra `forge run` ile agent'i dogrudan calistir (harness soyutlamasi). Nihai vizyon: **Agent OS package manager**.
