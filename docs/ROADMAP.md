# Forge — Roadmap

## v0.1 — The Brew Moment (1-2 hafta) — HEDEF: GitHub Trending #1

- [ ] CLI: `add`, `remove`, `list`, `search`, `info`, `doctor` (TypeScript + Bun)
- [ ] Adapter: claude-code, opencode, cursor, codex (4 harness)
- [ ] Paket tipleri: `skill` + `mcp` (2 tip, digerleri v0.2)
- [ ] Registry: `registry/index.json` + `registry/packages/*.json` (bu repo icinde)
- [ ] 100 paket seed (anthropics/skills + mcp + superpowers)
- [ ] `forge install` (forge.toml'dan toplu kurulum)
- [ ] README + 7sn demo gif + Product Hunt + HN launch
- [ ] CI: index olusturma + R2 deploy (opsiyonel, once GitHub Pages yeterli)

**Cikis kriteri:** `curl -fsSL https://forge.sh/install.sh | sh` ile kurup `forge add anthropics/plan` calisiyor.

## v0.2 — The npm Moment (1 ay)

- [ ] `forge publish` + `forge init` (creator workflow)
- [ ] Adapter: dsh, windsurf, generic
- [ ] Paket tipleri: `plugin`, `agent`, `command`, `hook` (tum 6 tip)
- [ ] Dependency cozme (semver range)
- [ ] `forge update` + `forge audit` + `forge outdated`
- [ ] Search: flexsearch -> Algolia
- [ ] Private registry destegi
- [ ] `forge.toml` proje seviyesi (team sync)

## v0.3 — The Store Moment (2-3 ay)

- [ ] Web: `forge.sh` — paket sayfasi, search, stats, `forge add` copy button (npmjs.com gibi)
- [ ] `forge run <agent>` — harness soyutlamasi (hangi harness kuruluysa onda calistir)
- [ ] Rust rewrite (tek binary, hiz)
- [ ] `brew`, `winget`, `cargo`, `npm` dagitim
- [ ] GitHub Action: `forge-action` (CI'da `forge install`)
- [ ] VS Code extension: sidebar'da forge paketleri

## v1.0 — The OS Moment (6 ay)

- [ ] `forge cloud` — takim registry'si, private paketler
- [ ] Billing (private publish icin)
- [ ] `forge create` — interactive paket olusturucu
- [ ] Telemetry (opt-in, indirme sayilari)
- [ ] Agent runtime: `forge run` ile herhangi bir agent'i herhangi bir modelle calistir

## Milestone'lar

| Tarih | Hedef | Metric |
|-------|-------|--------|
| Hafta 1 | v0.1 launch | 100 paket, 4 harness |
| Hafta 2 | Trending | GitHub Trending #1, 5k star |
| Ay 1 | v0.2 | 500 paket, 1000 install |
| Ay 3 | v0.3 | 2000 paket, 50k install, 20k star |
| Ay 6 | v1.0 | 10k paket, 100k star |

## Riskler

- Anthropic resmi registry cikartirsa? -> Biz zaten universal'iz (Anthropic sadece Claude), biz her harness.
- DeepSeek kendi store'unu kapatirsa? -> Adapter sayesinde bagimsiziz.
- Spam paketler? -> `forge audit` + manual curasyon (npm gibi).
