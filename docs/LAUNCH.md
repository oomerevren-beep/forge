# LAUNCH — Faz 6-7 Lansman Kitabı

> Bu dosya Faz 5'te hazırlanır, Faz 6'da Salı 09:00 EST'de ateşlenir. 100K planının Epoch 1 viral anı.
> Star hedefi: Faz 5 soft 1.2k → 2k, Faz 6 HN 2k → 3k, Faz 7 PH 3k → 4.5k

---

## 1. Zamanlama (kritik — HN algısı saate duyarlı)

| Kanal | Gün | Saat (EST) | Saat (TR) | Not |
|-------|-----|------------|-----------|-----|
| **Hacker News** | **Salı** | **09:00 EST** | 16:00 TR | En iyi trending penceresi. İlk 2 saat yorumlara anında cevap şart — yazar yoksa ölür. |
| **X Thread** | Salı | 09:15 EST | 16:15 TR | HN ile aynı gün, gif'li. HN linkini X'e de at. |
| **Reddit r/ClaudeAI** | Çarşamba | 10:00 EST | 17:00 TR | HN sonrası, farklı kitle |
| **Reddit r/LocalLLaMA + r/programming** | Perşembe | 10:00 EST | 17:00 TR | Geniş dev kitle |
| **Product Hunt** | Çarşamba (ertesi hafta) | 00:01 PST | 10:01 TR | Hunter bul, PH günü ayrı |
| **Dev.to / Hashnode** | Cuma | — | — | Uzun yazı, SEO |

**Kural:** Asla Cuma/Cumartesi HN atma. Salı-Çarşamba sabahı %40 daha fazla trafik.

---

## 2. Hacker News — Show HN

**Başlık (80 char sınırı, önerilen):**
```
Show HN: Forge – The Homebrew for AI Agents (one CLI for skills/MCP/plugins)
```
Alternatif (daha kısa, eğer uzun başlık kırpılırsa):
```
Show HN: Forge – brew for AI agent skills, MCPs and plugins
```

**Gövde (HN'de Show HN'de ilk yorum olarak atılır):**
```
Hi HN — I built forge, the Homebrew for AI agents.

Problem: every harness (Claude Code, Codex, Cursor, OpenCode) has its own install ritual. You git clone a skill, copy SKILL.md, edit mcp.json by hand. Same package installed 4 times, no versioning, no team sync.

Solution: one CLI, 6 package types, 5+ harnesses.

  curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
  # or npm i -g tryforge
  forge doctor              # detects your harnesses
  forge search mcp          # 24 MCPs, <500ms offline
  forge add anthropics/plan # installs to all harnesses at once (symlink/junction, copy fallback)
  forge add mcp/filesystem  # auto-injects into mcp.json
  forge.toml + forge.lock   # team sync, like package.json — forge install --frozen for CI

Stats: 100 packages (57 skills, 24 MCPs, 8 agents, 5 commands, 3 hooks, 3 plugins), typed registry, git-native (forkable, private registry ready).

Stack: TypeScript (v0.1) → Rust (v0.2). Adapter = one file per harness, see docs/ADAPTERS.md.

Roadmap: 6 epochs / 30 phases to 100K stars, public: docs/100K-PLAN.md

Demo: 7s gif in README (800×400, dark)

Repo: https://github.com/oomerevren-beep/forge
Release: https://github.com/oomerevren-beep/forge/releases/tag/v0.1.0

Would love feedback — especially "which package did you search for and not find?"

---

Yorum cevap şablonları (ilk 2 saat içinde):

Q: "Why not just use anthropics/skills or mcp-registry?"
A: "Those are single-type + single-harness. Forge is brew for *all* types on *every* harness, with versioning/lock/search. Like brew beat per-OS managers."

Q: "Does it work on Windows?"
A: "Yes — junction + copy fallback, tested on Windows 11. `forge doctor` checks links.json. See install.ps1 for PowerShell one-liner."

Q: "Security? sha256 pinned?"
A: "Yes — every tarball pinned, 5 packages already real sha (others placeholder → real in Faz 13, 500 pkgs). Private registry via fork + R2."

Q: "Why TypeScript not Rust from day 1?"
A: "Speed to market for Trending. v0.2 is Rust (single binary, cargo install). Adapters stay cheap."

Q: "How to publish my own package?"
A: "Today: PR to registry/packages/<slug>.json → registry:build. v0.2: `forge publish` → GitHub Release → auto-PR. See CONTRIBUTING.md."
```

**HN checklist (atmadan önce):**
- [ ] README'de gerçek demo.gif (60KB) görünüyor mu?
- [ ] `npm i -g tryforge` + `forge doctor` 5 harness yeşil mi? (10 makine testi Faz 5'te)
- [ ] `placeholderSha: 95` — 5 gerçek SHA var, kalan placeholder notunu HN yorumuna ekle
- [ ] Release v0.1.0 public mi?
- [ ] İlk yorum hazır, 2 saat boyunca bildirimler açık

---

## 3. Product Hunt

**Tagline (60 char):**
```
The Homebrew for AI Agents — one CLI for every harness
```

**Açıklama (260 char):**
```
brew is for system packages, forge is for AI agent packages. One CLI installs skills, MCPs, plugins, agents on Claude Code, Codex, Cursor, OpenCode — with versioning, team sync (forge.toml), and 100 packages on day one.
```

**Gallery:** og.png (1280×640) + demo.gif (800×400) + CLI screenshot (forge --help) + architecture diagram

**Maker comment (PH'de ilk yorum):**
```
Hey hunters! I'm Ömer — built forge because installing the same skill 4 times by hand felt insane.

Forge is `npm i -g tryforge && forge add anthropics/plan` → 5 harnesses at once.

Try: curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
Feedback: which package did you look for and not find? I'll add it priority.

Thanks for hunting! 🚀
```

**Hunter pitch (eğer hunter'la çalışırsan):** "Homebrew moment for AI agents — 100 packages, 5 harnesses, team sync. Trending potential, 100K roadmap public."

---

## 4. Reddit

### r/ClaudeAI (Çarşamba)

**Title:** `I built the Homebrew for AI Agents — one CLI for Claude Code, Codex, Cursor, OpenCode`

**Body:**
```
Hey — I shipped forge v0.1.0, a package manager for AI agent skills/MCPs/plugins/agents.

Problem: every harness has its own install story. Pasting SKILL.md, editing mcp.json by hand, no versioning, no team sync.

Solution:
- forge add anthropics/plan — installs to all 5 harnesses (symlink/junction + copy fallback, Windows too)
- forge search mcp — 100 packages, typed registry (57 skills, 24 MCPs...)
- forge.toml + forge.lock — team sync like package.json, forge install --frozen
- One-liner: curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
  or npm i -g tryforge

Stack: TypeScript + smol-toml, file-based registry, adapter pattern (one file per harness).

Roadmap: 6 epochs / 30 phases to 100K stars — docs/100K-PLAN.md

Would love feedback + stars: https://github.com/oomerevren-beep/forge
Release: https://github.com/oomerevren-beep/forge/releases/tag/v0.1.0

Demo gif in README — 7 seconds: doctor → search → add → list
```

### r/LocalLLaMA & r/programming (Perşembe)

Aynı gövde ama başlığı tweak:
- r/LocalLLaMA: `Show: forge — package manager for agent skills/MCPs (works with any harness, 100 packages)`
- r/programming: `Forge — brew for AI agents: one CLI, 5 harnesses, 6 package types, team sync via forge.toml`

---

## 5. X / Twitter — 8 Tweet Thread

**Tweet 1:** `The Homebrew for AI Agents is here. 🍺

brew = system packages
forge = skills, MCPs, plugins, agents

One CLI. 5 harnesses. 100 packages.

npm i -g tryforge

https://github.com/oomerevren-beep/forge`

**Tweet 2:** `Problem: every harness has its own install ritual.

Claude Code → copy SKILL.md
Codex → edit mcp.json
Cursor → manual plugin drop

Same package, 4 times by hand. No versioning. No team sync.`

**Tweet 3:** `Solution: forge

forge add anthropics/plan → 5 harnesses at once
forge search mcp → 24 results, <500ms offline
forge doctor → health check
forge.toml + forge.lock → team sync`

**Tweet 4:** `Demo — 7 seconds (gif)`

[demo.gif]

**Tweet 5:** `100 packages on day one:

57 skills, 24 MCPs, 8 agents, 5 commands, 3 hooks, 3 plugins

Typed registry, git-native, forkable. Private registry = fork + R2.`

**Tweet 6:** `How it works:

forge add anthropics/plan
→ fetch index.json (R2 CDN)
→ resolve ^1.2.0 → tarball + sha256
→ extract to ~/.forge/packages/
→ adapter: symlink/junction to 5 harnesses
→ if MCP: inject mcp.json`

**Tweet 7:** `Team sync like npm:

forge.toml with [dependencies]
forge install → writes forge.lock
forge install --frozen → CI exact
forge outdated / forge update

Commit your forge.lock.`

**Tweet 8:** `Open source, TypeScript → Rust (v0.2), 100K-star roadmap public.

Star to get notified at v1.0: https://github.com/oomerevren-beep/forge

Which package did you search for and not find? Reply — I'll add priority. 👇

#buildinpublic #opensource #claudecode #mcp #aiagents`

**Hashtags:** #buildinpublic #opensource #claudecode #mcp #aiagents (son tweet'te)

---

## 6. LinkedIn & Dev.to

**LinkedIn:** Aynı X thread'in 1-3 tweet'ini tek post yap, og.png ile. CTA: "If you use Claude Code or Cursor, a star + feedback would mean a lot."

**Dev.to title:** `The Homebrew for AI Agents — Why I Built forge`

Outline: Problem (fragmented harness installs) → Solution (adapter + registry + 6 types) → Demo (gif) → Team sync → Architecture (one file per harness) → Roadmap 30 phases → CTA star

---

## 7. Soft Launch Planı (Faz 5'te — HN öncesi)

**Hedef:** HN günü "doesn't work on Windows" yorumunu önlemek.

- 20 DM (günde 5, 4 güne yay — spam filtresine takılmamak için):
  - 5 yakın arkadaş (Windows/Mac karışık)
  - 5 X'ten AI agent kullanan dev
  - 5 Claude Code / OpenCode Discord üyeleri
  - 5 Türk dev topluluğu

DM şablonu:
```
Selam! Forge'u denedin mi? brew for AI agents — one CLI, 5 harness. 2 dakikada kurup "forge add anthropics/plan" dener misin? Geri bildirim süper değerli: https://github.com/oomerevren-beep/forge
```

- 5 grup: r/ClaudeAI (soft), OpenCode Discord #showcase, Cursor Discord, Türk Yazılım Discord, Telegram grubun
- 10 makine testi (her makinede): `curl | sh → forge doctor → search → add --dry-run → add → list → install`

Loglar: `soft-launch/logs/<makine>.txt` (gitignore'da, sadece özet commit)

Geri bildirim 3 soru: "Kurulum kaç dakika? Hangi adım takıldı? Hangi paketi aradın bulamadın?"

---

## 8. Launch Checklist (HN atmadan önce — hepsi yeşil olmalı)

- [ ] `docs/assets/demo.gif` gerçek (60KB, 800×400, 7s, <500KB) ✓ (Faz 5)
- [ ] `package.json:name` = `tryforge`, `bin` = forge + tryforge, `npm pack --dry-run` → tryforge-0.1.0.tgz ✓
- [ ] `install.sh` / `install.ps1` → `npm i -g tryforge` ✓
- [ ] `README` hero + Install → `npm i -g tryforge` ✓
- [ ] `npm test` 10/10, `npm run build` 0, `registry:build --check` OK, `placeholderSha: 95` ✓
- [ ] `v0.1.1` tag + release public, release notes hazır
- [ ] Soft launch 20+5, en az 5 makine yeşil, bug fix'ler push'landı
- [ ] HN başlık/gövde/yorum şablonları hazır (bu dosya)
- [ ] Salı 09:00 EST alarm kurulu, bildirimler açık, 2 saat boş

---

## 9. Risk — HN'de ilk 2 saat

- Yazar 2 saat aktif değilse post ölür (HN algoritması yorum aktivitesine bakar) → Faz 6 günü takvimini boş tut.
- İlk 3 yorum negatifse ("another package manager?") → şablon cevaplarla anında yanıtla, savunma değil değer anlat.
- GIF yüklenmiyor → og.png fallback, ama gif CDN'de olmalı (GitHub raw yeterli).
