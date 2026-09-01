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

## Neden Simdi? Neden 100k?

1. **Zamanlama mukemmel:** Skills 2025-10'da Anthropic tarafindan standardize edildi, 1 yilda 4 repo 150k+ aldi. Ama henuz `npm`i yok. Ilk yapan kazanir.
2. **DeepSeek kaniti:** 18 gunde 207k = pazar plugin'e ac. Ama fragmentation var. Forge fragmentation'i cozer = DeepSeek'ten bile viral.
3. **TAM:** 5M+ AI coding agent kullanicisi (Claude Code 143k, OpenCode 203k, Cursor milyonlar). Hepsi musteri.
4. **Viral loop:** Paket yazarlari `forge add me` diye bagirir = bedava dagitim.
5. **Precedent:** `brew` (sistem), `oh-my-zsh` 180k, `nvm` 80k — kurulum aciyi cozen her sey 100k gecer.

## Fark

- `anthropics/skills` = sadece repo, package manager degil
- `DSH` = sadece DeepSeek
- `mcp-registry` = sadece MCP
- **Forge = hepsi, her yerde**

## Kuzey Yildizi Metrigi

`forge add` ile kurulan paket sayisi. Hedef: 1. ay 10k install, 6. ay 1M install.

## Uzun Vadeli

Forge registry -> Agent App Store. `forge publish` ile herkes paket yayinlar, `forge search` ile kesfeder, `forge update` ile gunceller. Sonra `forge run` ile agent'i dogrudan calistir (harness soyutlamasi). Nihai vizyon: **Agent OS package manager**.
