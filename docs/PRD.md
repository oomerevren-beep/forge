# Forge — PRD (Product Requirements Document)

## 1. Hedef Kullanici

- **Primary:** AI coding agent kullanan developer (Claude Code / Codex / OpenCode / Cursor / Windsurf / DeepSeek Harness)
- **Secondary:** Skill/MCP/plugin yazan creator (dagitim kanali ariyor)
- **Tertiary:** Team lead (takimda ayni skill setini standartlastirmak isteyen)

## 2. Kullanici Hikayeleri

### US-1: Kurulum
> Ben bir developer olarak, `anthropics/plan` skill'ini tek komutla tum harness'larima kurmak istiyorum, her birine manuel kopyalamak istemiyorum.

### US-2: Kesif
> Yeni bir proje baslatirken `forge search pdf` yazip PDF isleyen en iyi 10 paketi gormek istiyorum.

### US-3: Guncelleme
> Kullandigim 20 skill'i tek komutla guncellemek istiyorum: `forge update`.

### US-4: Yayinlama
> Yaptigim skill'i `forge publish` ile registry'e atip herkesin `forge add benim-skillim` demesini istiyorum.

### US-5: Takim Senkronu
> `forge.toml` dosyami git'e pushlayip takim arkadasimin `forge install` ile ayni seti kurmasini istiyorum (npm gibi).

### US-6: MCP Kurulumu
> `forge add mcp/filesystem` dedigimde MCP server'in otomatik `mcp.json` / `.cursor/mcp.json` / `claude.json`'a eklenmesini istiyorum.

## 3. Fonksiyonel Gereksinimler

### 3.1 CLI Komutlari (v0.1)

| Komut | Aciklama | Ornek |
|-------|----------|-------|
| `forge add <pkg>[@ver]` | Paket kur | `forge add anthropics/plan@1.2.0` |
| `forge remove <pkg>` | Paket kaldir | `forge remove anthropics/plan` |
| `forge list` | Kurulu paketleri listele | `forge list` |
| `forge search <query>` | Registry'de ara | `forge search pdf` |
| `forge info <pkg>` | Paket detayi | `forge info anthropics/plan` |
| `forge update [pkg]` | Guncelle (hepsi veya tek) | `forge update` |
| `forge install` | forge.toml'dan kur | `forge install` |
| `forge publish` | Registry'e yayinla | `forge publish` |
| `forge init` | Yeni paket olustur | `forge init my-skill --type skill` |
| `forge doctor` | Harness tespiti + saglik | `forge doctor` |

### 3.2 Paket Tipleri

Her paket `forge.toml` icerir, Tip `type` ile belirtilir:

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

### 3.3 Harness Adapter'leri (v0.1 destegi)

- `claude-code` -> `~/.claude/skills/<name>/`, `~/.claude/commands/`, `.claude/settings.json` (mcp)
- `codex` -> `~/.codex/skills/`, `~/.codex/mcp.json`
- `opencode` -> `.opencode/skills/`, `opencode.json` (mcp/plugins)
- `cursor` -> `.cursor/skills/`, `.cursor/mcp.json`
- `dsh` -> `~/.dsh/plugins/`
- `generic` -> `./.forge/packages/<name>/` (bilinmeyen harness icin fallback)

### 3.4 Registry

- Git-native: Her paket bir GitHub repo'su (veya monorepo alt klasoru)
- Index: `registry/index.json` (CDN'de, Cloudflare R2)
- Search: `registry/search.json` (offline search icin)
- Publish: GitHub Release + `forge publish` ile index guncelleme (GitHub Action)

## 4. Non-Fonksiyonel

- **Hiz:** `forge add` < 3s (cache hit), < 10s (cold)
- **Offline:** `forge list` ve kurulu paketler offline calisir
- **Guvenlik:** `forge.toml` checksum, `forge doctor` ile supheli paket uyarisi, `npm audit` benzeri `forge audit`
- **Cross-platform:** Windows, macOS, Linux (bash + PowerShell)
- **Dil:** CLI Rust (tek binary) + registry TypeScript + adapter'lar Node/Python

## 5. Basari Kriterleri (v0.1)

- [ ] 4 harness'te `forge add` calisiyor
- [ ] 100 paket registry'de
- [ ] `forge search` < 500ms
- [ ] `forge publish` ile 1. community paketi yayinlandi
- [ ] README'deki 7 saniyelik demo gif'i var

## 6. Kapsam Disi (v0.2+)

- `forge run` (agent calistirma soyutlamasi)
- `forge cloud` (takim registry'si)
- GUI / VS Code extension
- Billing / private registry
