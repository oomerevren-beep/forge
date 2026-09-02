# Forge — 100K Star Savaş Planı: 30 Fazda Homebrew for AI Agents

> `brew` sistem paketleri için ne ise, `forge` AI agent ekosistemi için odur.
> Hedef: 6 ayda 10.000 paket, 12 ayda 100.000 star. Tek cümle, tek komut, her harness.

**Versiyon:** 1.0 — 2026-09-02  
**Durum:** `v0.1 skeleton` sonrası, `v0.1 Brew Moment` öncesi  
**Yazar:** Ömer + Hermes (Forge otonom ajanı)  
**Kaynak:** `docs/VISION.md`, `PRD.md`, `ARCHITECTURE.md`, `SPEC.md`, `REGISTRY.md`, `ADAPTERS.md`, `ROADMAP.md` + canlı repo analizi

---

## 0. Fotoğraf — Neredeyiz? (2026-09-02 Snapshot)

### Mevcut Varlıklar
- Repo: `oomerevren-beep/forge` (main, clean, 2 commit) — public
- Dil: TypeScript v0.1 (Bun → Node/tsx fix yapıldı), v0.2'de Rust rewrite planlı
- CLI skeleton: 80 satır, 5 komut (`add` stub, `search` flexsearch, `list` stub, `doctor`, `info`) — `cli/src/index.ts` 68 satır + `adapters/index.ts` 12 satır
- Registry: `registry/index.json` (3 paket) + `packages/*.json` (anthropics/plan, mcp/filesystem, obra/superpowers) — sha256'lar placeholder
- Docs: 7 belge tam — Vision/PRD/Architecture/Spec/Registry/Adapters/Roadmap — docs-first tamam
- Infra: `forge.toml` self-hosting, `schema/forge.schema.json`, `ci.yml` (validate + registry:build), `CONTRIBUTING.md`, `README.md` (7sn demo vaadi var ama gif yok)
- Dağıtım: `npm i -g forge` hazır, `curl | sh` yok, `brew/cargo/winget` yok

### Gap Analizi — Neden Henüz 0 star potansiyeli var?
| Alan | Durum | 100K için Kritik mi? |
|------|-------|----------------------|
| `forge add` gerçek install | stub (`would install` log) | EVET — demo çalışmazsa kimse star vermez |
| Adapter implementasyonu | sadece interface, 0 harness'te kopya/symlink yok | EVET — 4 harness olmadan evrensel iddiası boş |
| Registry seed | 3 paket, hedef 100 | EVET — `search pdf` boş dönerse terk edilir |
| `publish`/`init`/`update`/`install` | yok | EVET — creator loop kırık |
| Demo gif / video | yok | EVET — README 30sn içinde star kararı verdirir |
| `install.sh` + CDN | yok | EVET — `curl | sh` olmadan HN/Product Hunt ölür |
| Web (`forge.sh`) | yok | Sonra ama v0.3'te şart |
| Rust binary | yok (v0.2) | Moat için şart |

### 100K Formülü (Skill'den)
1. **TAM x Pain x Demo:** 5M+ AI agent kullanıcısı x `git clone + cp SKILL.md` cehennemi x 7sn `forge add` wow'u
2. **Timing:** SKILL.md 2025-10'da standart oldu, 1 yılda 4 repo 150k+ aldı ama hala `npm`'i yok — ilk yapan kazanır
3. **Viral loop:** Paket yazarı `forge add benim-paketim` diye bağırır = bedava dağıtım (npm/brew pattern)
4. **Proof:** `deepseek-harness` 18 günde 207k = "Everything is a Plugin" talebi kanıtlandı
5. **Scope:** Tek tip (sadece skill veya sadece MCP) 50k'ta tıkanır; 6 tip (skill/mcp/plugin/agent/command/hook) evrensel olursa 100k

Bu plan bu formülü 30 faza böler.

---

## Kuzey Yıldızı ve Projeksiyon

**Kuzey yıldızı:** `forge add` ile kurulan paket sayısı. Star vanity, install sanity.

| Epoch | Fazlar | Süre | Kümülatif Star | Paket | Install | Ana Çıktı |
|-------|--------|------|----------------|-------|---------|-----------|
| I — Temel | 1–5 | Hafta 1–2 | 0 → 2k | 3 → 100 | 0 → 1k | v0.1 Brew Moment, HN #1 denemesi |
| II — Ateşleme | 6–10 | Hafta 3–6 | 2k → 12k | 100 → 500 | 1k → 20k | Viral loop kuruldu |
| III — Ekosistem | 11–15 | Ay 2–3 | 12k → 35k | 500 → 2.000 | 20k → 200k | Creator ekonomisi |
| IV — Dağıtım | 16–20 | Ay 3–5 | 35k → 65k | 2k → 5.000 | 200k → 800k | Her yerde `forge` |
| V — Hendek | 21–25 | Ay 5–8 | 65k → 85k | 5k → 8.000 | 800k → 2M | Rust + Web + Güven |
| VI — Yerçekimi | 26–30 | Ay 8–12 | 85k → 100k+ | 8k → 10k+ | 2M → 5M | Agent OS |

> DeepSeek 18 günde 207k yaptı — Forge fragmentation'ı çözdüğü için ondan hızlı olmalı. İlk 5k en zor, sonrası flywheel.

---

## EPOCH I — TEMEL: Brew Moment (Hafta 1–2) — 0 → 2k star

> Amaç: "Çalışıyor mu?" sorusunu 7 saniyede evet yaptırmak. Bu epoch bitmeden HN/Product Hunt yok.

### FAZ 1 — Gerçek `forge add` (2–3 gün)
**Hedef:** `forge add anthropics/plan` gerçekten `~/.claude/skills/plan/SKILL.md`'yi oluşturuyor.
**Star etkisi:** 0 → 0 (içeride)
**Yapılacaklar:**
- [ ] `cli/src/adapters/claude.ts`, `codex.ts`, `opencode.ts`, `cursor.ts` — 4 adapter implementasyonu (`ADAPTERS.md` interface'ine sadık)
- [ ] `forge-core`: tarball indir (GitHub Release), sha256 doğrula, `~/.forge/packages/<slug>@<ver>/`'a aç, symlink (tercih) / copy (fallback, Windows) ile harness klasörüne linkle
- [ ] `forge add <pkg>[@ver]` — semver çözme (en yüksek, v0.1'de basit DFS), dependency kurulumu
- [ ] `forge remove`, `forge list` (gerçek `~/.forge/packages` okuma), `forge doctor` (versiyon + paket sayısı + bozuk paket tespiti)
- [ ] `scripts/seed-registry.ts` tamamla — 3 → 20 paket (anthropics 10, mcp 10)
**Viral tetikleyici:** Yok — ama olmadan viral imkansız.
**Başarı kriteri:** Temiz bir Windows + macOS makinede `npx tsx cli/src/index.ts add anthropics/plan` sonrası `~/.claude/skills/plan/SKILL.md` var ve `doctor` yeşil.
**Risk:** Windows symlink yetkisi — copy fallback'i en baştan koy.

### FAZ 2 — 100 Paket Seed (2 gün)
**Hedef:** `forge search pdf` boş dönmüyor.
**Star etkisi:** 0 → 200 (erken test edenler)
**Yapılacaklar:**
- [ ] `anthropics/*` full port (10+ skill monorepo `source` alt yolu ile)
- [ ] `mcp/*` port (filesystem, github, memory, fetch, brave-search, postgres, sqlite, slack, notion — 20 paket)
- [ ] `obra/superpowers`, `agency/*`, `taste-skill`, community seed 30 paket
- [ ] Her paket için `registry/packages/<slug>.json` gerçek tarball + sha256 (placeholder'ı sil)
- [ ] `registry:build` — `index.json` + `search.json` üretimi, CI'da doğrulama
- [ ] `forge search` flexsearch'e geç (şu an `includes` — 100 pakette yavaşlar)
**Viral tetikleyici:** Paket yazarlarına "senin paketin Forge'da, `forge add senin-paketin` de" DM'i.
**Başarı kriteri:** `forge search` < 500ms, 100 paket, `forge info` her pakette doğru.

### FAZ 3 — `forge install` + `forge.toml` Proje Senkronu (1–2 gün)
**Hedef:** Takım hikayesi çalışıyor (`US-5`).
**Star etkisi:** 200 → 600
**Yapılacaklar:**
- [ ] Proje seviyesi `forge.toml` (`[dependencies]` npm gibi) parser + `forge install` (toplu kurulum)
- [ ] `forge init my-skill --type skill` — iskelet oluştur (`templates/forge-toml.toml`'dan)
- [ ] `~/.forge/config.toml` — registry URL, default harness'lar
- [ ] `forge update`, `forge outdated` (basit semver diff)
**Viral tetikleyici:** "Takımına `forge.toml`'u pushla, herkes `forge install` desin" — takım lead'leri starlar.
**Başarı kriteri:** Boş bir projede `forge init && forge add anthropics/plan && forge install` döngüsü sorunsuz.

### FAZ 4 — 7 Saniyelik Demo + README Cilası (1 gün)
**Hedef:** README'ye giren 30 saniyede star basıyor.
**Star etkisi:** 600 → 1.200
**Yapılacaklar:**
- [ ] 7sn demo gif (terminalizer / asciinema): `forge doctor` → `forge search plan` → `forge add anthropics/plan` → `ls ~/.claude/skills`
- [ ] README: gif en üste, install tek satır, 6 tip tablosu, "Why Forge" 3 madde, badges (CI, version, license)
- [ ] `docs/`'a `DEMO.md` — gif nasıl üretildi (tekrarlanabilir)
- [ ] `install.sh` — `curl -fsSL https://forge.sh/install.sh | sh` (GitHub Releases'ten binary/tarball çeken, `~/.forge`'a kuran)
- [ ] `forge --version`, `forge --help` polish (commander help metinleri Türkçe/İngilizce net)
**Viral tetikleyici:** Gif Twitter'da tek başına 10k gösterim getirir.
**Başarı kriteri:** 5 farklı kişiye README'yi göster, 3'ü "anladım, starlarım" diyor.

### FAZ 5 — Launch Hazırlığı: CI + QA + Soft Launch (2 gün)
**Hedef:** Launch günü patlamamak.
**Star etkisi:** 1.200 → 2.000 (soft)
**Yapılacaklar:**
- [ ] `npm run build` (`tsc --noEmit` pass), `npm test` (en az 10 test: add/remove/search/doctor/adapter detect)
- [ ] GitHub Releases: `v0.1.0` tag, tarball, `install.sh` CDN (önce GitHub Pages yeterli, R2 sonra)
- [ ] `CONTRIBUTING.md` güncelle — "yeni paket ekle / yeni harness ekle" 5 adım
- [ ] Soft launch: 20 arkadaş + 5 Discord/Slack grubuna DM — geri bildirim topla, bug fix
- [ ] HN / Product Hunt / Reddit taslakları hazır (Faz 6'da atılacak)
**Başarı kriteri:** 10 farklı makinede (Win/Mac/Linux) `install.sh | sh && forge add obra/superpowers` yeşil.

---

## EPOCH II — ATEŞLEME: Viral Loop Kurulumu (Hafta 3–6) — 2k → 12k

### FAZ 6 — Hacker News + Reddit Launch (1 gün — Salı 09:00 EST)
**Hedef:** GitHub Trending #1 (daily).
**Star etkisi:** 2k → 5k (+3k bir günde)
**Yapılacaklar:**
- [ ] HN Show: "Show HN: Forge – Homebrew for AI Agents (one CLI for skills/MCP/plugins)" — demo gif, VISION'daki 280k/207k kanıtı, 100 paket, 4 harness
- [ ] Reddit: r/ClaudeAI, r/LocalLLaMA, r/Programming, r/MachineLearning — her biri için farklı açı (Claude kullanıcılarına skill, dev'lere package manager)
- [ ] Twitter/X thread (8 tweet): Problem → Çözüm → Demo gif → `forge add` → Registry → Adapter → Call to action (star + `forge add`)
- [ ] İlk 2 saat yorumlara anında cevap (HN'de yazar aktif değilse ölür)
- [ ] `star-history` grafiği ertesi gün paylaş
**Viral tetikleyici:** HN front page = 2k star, Twitter thread = 1k.
**Başarı kriteri:** HN top 5, 500+ upvote, GitHub Trending daily top 3.
**Risk:** Anthropic resmi registry çıkarır mı korkusu — cevabın hazır: "Biz universal'iz, Anthropic sadece Claude."

### FAZ 7 — Product Hunt + Dev.to + Hashnode (Hafta 3)
**Hedef:** HN dışındaki kitle.
**Star etkisi:** 5k → 6.5k
**Yapılacaklar:**
- [ ] Product Hunt launch (Salı/Çarşamba) — hunter bul, video + gif, ilk 10 yorum friend'lerden
- [ ] Dev.to: "I built Homebrew for AI Agents — here's why `git clone + cp` must die" — teknik deep-dive (ARCHITECTURE'dan)
- [ ] Hashnode / Medium cross-post
- [ ] YouTube: 3 dakikalık "Forge in 3 minutes" (screen record, ses Türkçe + altyazı İngilizce)
**Başarı kriteri:** PH top 5, Dev.to 5k okuma.

### FAZ 8 — `forge publish` — Creator Flywheel (Hafta 4)
**Hedef:** Creator'lar Forge'u kendi dağıtım kanalı yapıyor.
**Star etkisi:** 6.5k → 8k
**Yapılacaklar:**
- [ ] `forge publish` gerçek akış: `forge.toml` validate → tarball → sha256 → `gh release create` → registry PR aç (GitHub Action)
- [ ] `forge audit` (basit: executable, network call, şüpheli dosya uyarısı)
- [ ] Registry'ye PR şablonu + bot (PR'da `forge.toml` cross-check, sha256 doğrula)
- [ ] İlk 5 community paketini elle publish ettir (arkadaşların paketleri) — "ilk 5" rozeti
- [ ] Creator docs: `docs/PUBLISH.md` — 5 dakikada publish rehberi
**Viral tetikleyici:** Her publish eden creator kendi kitlesine "artık `forge add benim-paketim` diyebilirsiniz" diye tweet atar — her creator 50–200 star getirir.
**Başarı kriteri:** 10 community publish, 500 paket hedefine giden yol açıldı.

### FAZ 9 — Influencer ve Paket Sahibi Outreach (Hafta 4–5)
**Hedef:** Büyük paket sahiplerini Forge'a taşı.
**Star etkisi:** 8k → 10k
**Yapılacaklar:**
- [ ] Hedef liste 20 kişi: `obra/superpowers` (obra), `anthropics/skills` maintainer'ları, popüler MCP yazarları, `awesome-llm-apps` sahipleri
- [ ] Kişiselleştirilmiş DM/PR: "Paketin Forge'da, tek komutla 5 harness'te kuruluyor, ister misin `forge publish` ile sen yönet?" — PR'da paketlerini ekle
- [ ] 3 YouTuber / Twitter influencer'a erken erişim + demo (Fireship tarzı 100sn video için pitch)
- [ ] `forge`'u kullanan ilk şirket logoları (izin al, README'ye ekle)
**Başarı kriteri:** 3 büyük paket sahibi Forge'u tweetledi.

### FAZ 10 — `forge update` + `forge outdated` + Dependency Çözme (Hafta 6)
**Hedef:** Günlük kullanım kilitlenmesi (stickiness).
**Star etkisi:** 10k → 12k
**Yapılacaklar:**
- [ ] Semver range tam destek (`^`, `~`, `*`, `>=`), DFS dependency resolver (conflict'te en yüksek)
- [ ] `forge update [pkg]`, `forge outdated`, `forge audit` polish
- [ ] Telemetry (opt-in): indirme sayıları `registry/stats.json`'a yaz (sadece count, gizlilik-first)
- [ ] `forge doctor --fix` — bozuk paketleri otomatik düzelt
**Başarı kriteri:** 20 paketli bir projede `forge update` < 10s, 0 hata.

---

## EPOCH III — EKOSİSTEM: Creator Ekonomisi (Ay 2–3) — 12k → 35k

### FAZ 11 — 6 Paket Tipi Tamamı (Ay 2)
**Hedef:** Sadece skill değil, hepsi.
**Star etkisi:** 12k → 16k
**Yapılacaklar:**
- [ ] `plugin`, `agent`, `command`, `hook` tipleri + adapter desteği (`SPEC.md`'deki `[plugin]`, `[agent]` bölümleri)
- [ ] `forge init --type <type>` şablonları (6 tip için starter)
- [ ] Örnek paketler: 1 plugin (DSH), 1 agent (frontend-wizard), 1 command (/plan)
- [ ] `forge.toml` validasyon genişlet (tip-özel alanlar zorunlu)
**Viral tetikleyici:** "Forge sadece skill değil" tweet'i — DSH/Windsurf kitleleri gelir.

### FAZ 12 — Adapter Genişlemesi: DSH + Windsurf + Generic (Ay 2)
**Hedef:** 4 → 7 harness.
**Star etkisi:** 16k → 20k
**Yapılacaklar:**
- [ ] `dsh`, `windsurf`, `generic` adapter'ları (her biri 1 dosya)
- [ ] `generic` = `./.forge/packages/<name>/` fallback — bilinmeyen her harness'te çalışır
- [ ] Adapter test matrix: her harness'te `add`/`remove`/`list` CI'da (mock FS)
- [ ] `docs/ADAPTERS.md` — "Yeni harness ekle: 1 dosya, 30 dakika" rehberi + bounties
**Başarı kriteri:** `forge doctor` 7 harness'i doğru tespit ediyor.

### FAZ 13 — Registry 500 Paket (Ay 2–3)
**Hedef:** Arama gerçekten keşif aracı.
**Star etkisi:** 20k → 25k
**Yapılacaklar:**
- [ ] `scripts/seed-registry.ts` ile otomatik port 500'e çıkar (awesome listeler, MCP registry scrape)
- [ ] Kategoriler: `forge search` filtreleri (`--type mcp`, `--harness claude-code`)
- [ ] `search.json` + flexsearch offline < 200ms, online Algolia hazırlığı
- [ ] Haftalık "New on Forge" bülteni (Twitter + GitHub Discussion)
**Başarı kriteri:** `forge search pdf` 10+ sonuç, `forge search agent` 20+ sonuç.

### FAZ 14 — Topluluk Programı: Champions + Bounties (Ay 3)
**Hedef:** Katkı flywheel'i.
**Star etkisi:** 25k → 30k
**Yapılacaklar:**
- [ ] Forge Champions: en çok paket publish eden / adapter yazan 10 kişiye rozet + README'de isim
- [ ] Bounty: yeni harness $100, 10 paket port $50 (GitHub Sponsors / Open Collective)
- [ ] Discord / GitHub Discussions aç — `#showcase` kanalı
- [ ] Haftalık community call (30dk, Türkçe + İngilizce)
**Başarı kriteri:** Haftada 5+ community PR.

### FAZ 15 — İçerik Fırtınası (Ay 3)
**Hedef:** SEO + YouTube + Twitter'da Forge her yerde.
**Star etkisi:** 30k → 35k
**Yapılacaklar:**
- [ ] 5 blog post: "How to build a skill", "MCP vs Plugin", "Team sync with forge.toml", "From superpowers to Forge", "Adapter in 30 minutes"
- [ ] 3 YouTube video (community): "Forge ile 1 dakikada 10 skill kur", "Kendi skill'ini publish et"
- [ ] Twitter'da haftada 3 demo gif (farklı paketler)
- [ ] `awesome-forge` listesi (awesome-xxx pattern — SEO magnet)
**Başarı kriteri:** Google'da "AI agent skill install" aramasında Forge ilk sayfa.

---

## EPOCH IV — DAĞITIM: Her Yerde Forge (Ay 3–5) — 35k → 65k

### FAZ 16 — Web: `forge.sh` (Ay 3–4)
**Hedef:** npmjs.com gibi paket sayfaları.
**Star etkisi:** 35k → 42k
**Yapılacaklar:**
- [ ] `forge.sh` — Next.js + Tailwind: search, paket sayfası (`forge add` copy button), stats, `forge add` komutu
- [ ] Her paket için: README render, versiyonlar, indirme grafiği, harness uyumu
- [ ] SEO: `forge.sh/packages/<slug>` statik, sitemap
- [ ] `stats.json` → indirme sayıları, trending paketler
**Başarı kriteri:** `forge.sh` günde 1k ziyaretçi.

### FAZ 17 — Dağıtım Kanalları: brew / cargo / npm / winget (Ay 4)
**Hedef:** `install.sh` dışında her yoldan kurulum.
**Star etkisi:** 42k → 48k
**Yapılacaklar:**
- [ ] `brew tap oomerevren/forge` (homebrew)
- [ ] `cargo install forge` (Rust sonrası, v0.2 öncesi `npm i -g forge` yeterli)
- [ ] `winget`, `scoop` (Windows)
- [ ] `curl -fsSL https://forge.sh/install.sh | sh` polish + checksum
- [ ] GitHub Releases binary (Linux/macOS/Windows x64 + arm64)
**Başarı kriteri:** 4 kanaldan da kurulum CI'da test edildi.

### FAZ 18 — GitHub Action: `forge-action` (Ay 4)
**Hedef:** CI'da Forge.
**Star etkisi:** 48k → 53k
**Yapılacaklar:**
- [ ] `forge-action@v1` — `uses: forge/action@v1 with: { packages: "anthropics/plan, mcp/filesystem" }`
- [ ] Örnek workflow'lar: `forge install` ile skill'leri CI'da kur, agent çalıştır
- [ ] Marketplace'e publish, README'de badge
**Viral tetikleyici:** Her kullanan repo Forge'u görünür kılar.

### FAZ 19 — Enterprise Hazırlığı: Private Registry (Ay 4–5)
**Hedef:** Şirketler Forge'u içeride kullanıyor.
**Star etkisi:** 53k → 58k (enterprise star vermez ama tweetler)
**Yapılacaklar:**
- [ ] `~/.forge/config.toml` registry override: `registry = "https://registry.mycompany.com/index.json"`
- [ ] Private registry docs — self-host R2 / GitHub Pages ile
- [ ] `forge publish --registry private` 
- [ ] İlk 3 şirket pilotu (Türk şirketler + global 1)
**Başarı kriteri:** 1 şirket Forge'u internal wiki'sine ekledi.

### FAZ 20 — İkinci Dalga Lansman: "Forge 0.2 — The npm Moment" (Ay 5)
**Hedef:** İkinci HN front page.
**Star etkisi:** 58k → 65k (+7k spike)
**Yapılacaklar:**
- [ ] HN: "Show HN: Forge 0.2 — we now have 2000 packages and private registries"
- [ ] Product Hunt relaunch
- [ ] Twitter'da "Before/After Forge" meme'leri (git clone cehennemi vs `forge add`)
- [ ] Fireship / Theo / benzeri YouTuber'lara pitch (ikinci deneme)
**Başarı kriteri:** İkinci kez Trending #1 daily.

---

## EPOCH V — HENDEK: Hız + Güven + Rust (Ay 5–8) — 65k → 85k

### FAZ 21 — Rust Rewrite Başlangıcı (Ay 5–6)
**Hedef:** Tek binary, < 50ms startup.
**Star etkisi:** 65k → 70k
**Yapılacaklar:**
- [ ] `crates/forge-cli`, `forge-core`, `forge-registry`, `forge-adapter`, `forge-spec` (ARCHITECTURE.md'deki yapı)
- [ ] `clap` ile komutlar, `tokio` paralel indirme, `sha2` doğrulama
- [ ] `forge` tek binary (10MB), `cargo install` + GitHub Releases
- [ ] TypeScript CLI ile paralel test (çıktı aynı mı?)
**Başarı kriteri:** `forge add` Rust'ta < 3s (cache hit), TS'te 5s.

### FAZ 22 — Güvenlik: `forge audit` + OIDC + İmza (Ay 6)
**Hedef:** "Güvenli mi?" sorusuna evet.
**Star etkisi:** 70k → 73k
**Yapılacaklar:**
- [ ] `forge audit` — bilinen zafiyetli paketler, şüpheli dosya taraması
- [ ] Publish için GitHub OIDC — sadece repo owner publish edebilir
- [ ] Tarball sha256 zorunlu, `forge install --verify` 
- [ ] `SECURITY.md` + bug bounty
**Başarı kriteri:** `forge audit` 1 zafiyetli paketi yakaladı (demo).

### FAZ 23 — Performans + Offline (Ay 6–7)
**Hedef:** `forge` hissedilmiyor, uçuyor.
**Star etkisi:** 73k → 76k
**Yapılacaklar:**
- [ ] Index cache 5dk TTL, `forge update --refresh` force
- [ ] Tarball cache `~/.forge/cache/tarballs/`, paralel indirme (p-limit / tokio)
- [ ] Offline: `forge list` ve kurulu paketler internetsiz çalışıyor
- [ ] Benchmark: `forge search` < 100ms (Rust + flexsearch)
**Başarı kriteri:** `forge add` cold < 10s, hot < 2s.

### FAZ 24 — VS Code Extension (Ay 7)
**Hedef:** Editörün içinde Forge.
**Star etkisi:** 76k → 80k
**Yapılacaklar:**
- [ ] VS Code sidebar: Forge paketleri, search, `add` butonu
- [ ] `forge.toml` için IntelliSense (schema'dan)
- [ ] Marketplace'e publish, 1k install hedefi
**Başarı kriteri:** 500 VS Code install.

### FAZ 25 — Ekosistem Ortaklıkları (Ay 7–8)
**Hedef:** Harness'lar Forge'u öneriyor.
**Star etkisi:** 80k → 85k
**Yapılacaklar:**
- [ ] Claude Code / OpenCode / Codex docs'larına Forge linki PR'ı (resmi öneri olmasa bile community docs)
- [ ] MCP registry ile cross-link (biz onlardan büyük olana kadar dost)
- [ ] Konferans konuşması: 1 talk (örn. AI Engineer Summit, local meetup)
- [ ] Sponsorluk: 1 hackathon'da "Best Forge Package" ödülü
**Başarı kriteri:** 1 harness maintainer Forge'u tweetledi / docs'a ekledi.

---

## EPOCH VI — YERÇEKİMİ: Agent OS (Ay 8–12) — 85k → 100k+

### FAZ 26 — `forge run` — Harness Soyutlaması (Ay 8–9)
**Hedef:** Agent'ı herhangi bir harness'te çalıştır.
**Star etkisi:** 85k → 88k
**Yapılacaklar:**
- [ ] `forge run <agent> --prompt "..."` — hangi harness kuruluysa onda çalıştır (adapter run metodu)
- [ ] Model soyutlaması hazırlığı (Muse / GPT / local)
- [ ] `forge create` — interactive paket oluşturucu (wizard)
**Viral tetikleyici:** "Artık `forge run` ile her agent her yerde" — HN'de üçüncü dalga potansiyeli.

### FAZ 27 — `forge cloud` — Takım Registry'si (Ay 9–10)
**Hedef:** Takımlar için private + billing.
**Star etkisi:** 88k → 91k
**Yapılacaklar:**
- [ ] `forge cloud login`, `forge cloud publish` (private)
- [ ] Takım dashboard (web'de private paketler)
- [ ] Billing (Stripe) — private publish için $9/ay
- [ ] SSO hazırlığı
**Başarı kriteri:** 10 takım private registry kullanıyor.

### FAZ 28 — İçerik ve SEO Domination (Ay 10–11)
**Hedef:** "AI agent package manager" = Forge.
**Star etkisi:** 91k → 94k
**Yapılacaklar:**
- [ ] `forge.sh`'de her paket için SEO sayfası, blog haftada 1
- [ ] YouTube'da 10 video (community + sen), TikTok/Reels kısa demolar
- [ ] "Awesome Forge" 2k star (kendi başına)
- [ ] Google'da "skill install", "mcp server install", "agent plugin" — Forge top 3
**Başarı kriteri:** Organik trafik 10k/ay.

### FAZ 29 — 10.000 Paket ve Yıldönümü Kampanyası (Ay 11–12)
**Hedef:** Sayılarla gösteriş.
**Star etkisi:** 94k → 98k
**Yapılacaklar:**
- [ ] 10k paket kutlaması — Twitter thread + HN + blog: "How we got to 10k packages"
- [ ] `forge stats` — `10,000 packages, 5M installs, 100k stars` infografik
- [ ] Basın: TechCrunch / The Verge'e pitch ("The npm for AI agents hits 100k stars")
- [ ] Star history grafiği + contributor grafiği paylaş
**Başarı kriteri:** Basında 1 haber.

### FAZ 30 — 100K Kutlaması ve Sonrası (Ay 12)
**Hedef:** 100k ve kalıcı olmak.
**Star etkisi:** 98k → 100k+ (ve ötesi)
**Yapılacaklar:**
- [ ] 100k tweet + GitHub Discussion + blog — teşekkür, roadmap v1.0 → v2.0
- [ ] `forge` v1.0 release — semver 1.0.0, stability garantisi
- [ ] Sonraki hedef: 1M install/ay, Agent OS vizyonu (VISION.md'deki uzun vadeli)
- [ ] Kitap / manifesto: "The Forge Way — how we built homebrew for agents"
- [ ] Ekip kurma / sponsorluk / foundation düşün (Open Collective)
**Başarı kriteri:** 100.000 star, 10.000 paket, 1M install. GitHub Trending all-time.

---

## Ekler

### A. Haftalık Ritüel (Her Pazartesi)
- Star sayısı + install sayısı + paket sayısı + top 5 paket — Twitter'da paylaş
- `forge doctor` ile kendi kurulumunu test et
- 3 DM: 1 paket yazarı, 1 influencer, 1 kullanıcı geri bildirimi

### B. Ölçüm Tablosu (Her faz sonu doldur)
| Faz | Tarih | Star | Paket | Install | HN rank | PH rank | Not |
|-----|-------|------|-------|---------|---------|---------|-----|
| 0 | 2026-09-02 | ~0 | 3 | 0 | - | - | skeleton |
| 5 | | | 100 | | | | v0.1 ready |
| 6 | | | | | | | HN launch |
| 10 | | 12k | 500 | 20k | | | npm moment prep |
| ... | | | | | | | |

### C. Riskler ve Panzehirleri
| Risk | Panzehir |
|------|----------|
| Anthropic resmi registry çıkarır | Biz universal'iz (6 tip, 7 harness) — onlar sadece Claude. Hemen "Forge supports Anthropic registry too" adapter'ı ekle. |
| DeepSeek store kapanır | Adapter sayesinde bağımsızız, zaten generic fallback var. |
| Spam paketler | `forge audit` + manual curation + `verified` rozeti (GitHub OIDC owner). |
| Windows'ta symlink fail | Copy fallback + `forge doctor --fix` en baştan. |
| Star platosu (30k'da takılma) | Epoch IV dağıtım + Epoch VI `forge run` ikinci dalga HN. İçerik fırtınası asla durmaz. |
| Maintainer burnout | Faz 14'te Champions + bounties ile yük dağıt, her 3 adımda verifier (AGENTS.md kuralı). |

### D. 100K Sonrası — Agent OS Vizyonu
Forge registry → Agent App Store → `forge run` ile agent'ı herhangi bir modelle çalıştır → Agent OS package manager. `VISION.md`'deki "Uzun Vadeli" bölümü 100k sonrası başlar.

### E. Dosya Haritası (Bu plan nereye dokunur?)
- `cli/src/adapters/*.ts` — Faz 1, 12, 21
- `registry/packages/*.json` + `index.json` + `search.json` — Faz 2, 13, 29
- `cli/src/index.ts` + `forge-core` — Faz 1, 3, 8, 10, 21, 26
- `docs/*` + `README.md` + `forge.sh` (yeni) — Faz 4, 16, 28
- `scripts/seed-registry.ts`, `build-registry.ts` — Faz 2, 13
- `.github/workflows/ci.yml` + `forge-action` (yeni) — Faz 5, 18
- `install.sh` (yeni) + `crates/*` (yeni) — Faz 4, 17, 21

---

## Son Söz — Neden Kazanacağız?

- **İlk olmak yetmez, evrensel olmak gerekir.** Tek tip registry'ler 50k'ta ölür, Forge 6 tipi tek CLI'da birleştiriyor.
- **Viral loop bizde.** Her paket yazarı kendi kitlesine Forge'u pazarlıyor — biz reklam vermiyoruz, onlar veriyor.
- **Demo 7 saniye.** `forge add anthropics/plan` — bu cümle HN başlığı, tweet, README gif'i. Anlatmaya gerek yok, göster.
- **Docs-first zaten bitti.** 7 belge hazır — çoğu repo kod yazıp docs'u sonra ekler, biz tersini yaptık, şimdi hız bizde.

> 30 faz, 6 epoch, 12 ay. Her faz bir PR, her epoch bir lansman, her star bir `forge add`.
> Başla Faz 1'den. `forge add` çalışsın, gerisi gelir.

**Sonraki adım:** `todo`'da Faz 1 — `forge add` gerçek implementasyonu. Onay verirsen başlıyorum.

