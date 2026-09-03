# Forge — Roadmap

## v0.1 — The Brew Moment (DONE, launch öncesi son kontrollerde)

- [x] CLI: `add`, `remove`, `list`, `search`, `info`, `doctor` (TypeScript)
- [x] Adapter: claude-code, opencode, cursor, codex, dsh, windsurf, generic (7 harness)
- [x] Paket tipleri: `skill` + `mcp` + `plugin` + `agent` + `command` + `hook` (6 tip)
- [x] Registry: `registry/index.json` + `registry/packages/*.json` (bu repo icinde)
- [x] 250 paket seed (Faz 2: 100 + Faz 13-lite: +150)
- [x] `forge install` (forge.toml'dan toplu kurulum) + `--frozen` + `--mock`
- [x] Fail-closed installer (hash/download hatasi = exit 1), `--mock` opt-in, config `.bak`
- [x] README + 7sn demo gif
- [ ] Product Hunt + HN launch (Faz 6-7, bu dosyanin disi — bkz. docs/private/LAUNCH.md)
- [x] CI: index olusturma + build + test (`registry:build --check`)
- [ ] R2 deploy (v0.3'e ertelendi — registry su an local/bundled)

**Cikis kriteri:** `npm i -g tryforge` ile kurup `forge add anthropics/plan --mock` calisiyor (mock'suz kurulum icin gercek SHA'li paket sart).

## v0.2 — The npm Moment (kismen DONE)

- [ ] `forge publish` (creator workflow — siradaki buyuk is)
- [x] `forge init` (6 tip iskelet)
- [x] Adapter: dsh, windsurf, generic (v0.1'e cekildi)
- [x] Paket tipleri: `plugin`, `agent`, `command`, `hook` (tum 6 tip — v0.1'e cekildi)
- [x] Dependency cozme (semver range)
- [x] `forge update` + `forge audit` (iskelet) + `forge outdated`
- [x] Search: offline scored (<200ms) — Algolia ertelendi
- [x] Private registry destegi (fork + `registry = "<url>"` config)
- [x] `forge.toml` proje seviyesi (team sync)

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

## Milestone'lar (rasyonel — dagitim calismadan star hedefi yok)

| Tarih | Hedef | Metric |
|-------|-------|--------|
| Launch hazirligi (simdi) | 250 paket, 7 harness, fail-closed | 34 test yesil, `npm pack` temiz, HN ilk-yorum hazir |
| Hafta 1 (launch) | npm kurulum calisiyor, HN Show | 100-300 star, 20+ kurulum geri bildirimi |
| Hafta 2-4 | Geri bildirim kapatma | istenen 10+ paket eklendi, gercek SHA sayisi artiyor |
| Ay 2-3 | `forge publish` + 500 paket | creator akisi canli, registry buyuyor |
| Sonrasi | Uzun vade faz plani | faz faz, metriklerle |

## Riskler

- Anthropic resmi registry cikartirsa? -> Biz zaten universal'iz (Anthropic sadece Claude), biz her harness.
- DeepSeek kendi store'unu kapatirsa? -> Adapter sayesinde bagimsiziz.
- Spam paketler? -> `forge audit` + manual curasyon (npm gibi).
