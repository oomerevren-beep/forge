# FAZ 4 — 7 Saniyelik Demo + README Cilası + `install.sh` Detaylı Plan

> Hedef: README'ye giren 30 saniyede star basıyor. Demo 7 saniye, kurulum 1 satır, rozetler, temiz help.  
> Süre: 1 gün. Star etkisi: 600 → 1.200. Çıktı: demo gif + `install.sh` + README polish + `DEMO.md` + CI tsx fix.

**Durum:** Faz 3'te takım senkronu bitti (`forge install/init/update/lock/config` çalışıyor, test 5/5 PASS, `doctor` 5 harness temiz). Faz 4 viral eşiğin ilk halkası — kod değil, ilk izlenim. HN/Product Hunt'a Faz 4 bitmeden çıkılmaz.

---

## 1. Neden Faz 4 Şimdi? (Faz 3'ten Sonraki Doğal Adım)

- **Faz 3 boşa gitmemesi için:** `forge install` var ama README'de 30. satırda, gif yok. Takım lead'i README'yi açıp 10 saniyede anlamazsa star vermez.
- **7 saniye kuralı:** `brew` README'sindeki gif, `oh-my-zsh`'deki demo — star kararının %70'i ilk gif'te verilir. `forge doctor → search → add → ls` 7 saniyede wow dedirtmeli.
- **Kurulum sürtünmesi:** `npm i -g forge` var ama `curl -fsSL https://forge.sh/install.sh | sh` yok. HN'de `curl | sh` olmayan repo ciddiye alınmaz.
- **CI borcu:** `.github/workflows/ci.yml` hala `oven-sh/setup-bun@v2` + `bun install/test` kullanıyor. Windows'ta bun yok, Faz 1'deki pitfall tekrar ediyor. Faz 5 launch öncesi CI tsx'e geçmeli, yoksa launch günü CI kırmızı.

> Faz 4 bitmeden Faz 5 (soft launch) ve Faz 6 (HN) yok. Bu faz 1 gün sürer ama 600 star fark eder.

---

## 2. Hedef Mimari — Faz 4 Sonrası Görünenler

```
README.md (en üst)
  badges: [CI passing] [npm v0.1.0] [license MIT] [registry 100]
  7sn demo gif (ortada, 800x400, loop)
  1 satır install: curl -fsSL https://forge.sh/install.sh | sh
  Quick Start 4 satır (doctor → search → add → list)
  Takım senkronu (zaten var, koru)
  How it works (koru)

docs/DEMO.md (yeni)
  gif nasıl üretildi (komutlar, tekrarlanabilir)
  asciinema / terminalizer adımları
  Windows notları

install.sh (yeni, repo kökünde) + install.ps1 (opsiyonel, Windows)
  GitHub Releases'ten tarball çeker → ~/.forge/bin/forge → PATH ekle
  Fallback: npm i -g forge (node varsa)
  Checksum doğrulama (opsiyonel Faz 4'te)

.github/workflows/ci.yml (düzeltme)
  bun → node + npm ci + tsx
  registry:build --check + tsc --noEmit + npm test (5 test)

cli/src/index.ts (polish)
  --help metinleri net (örnekli), --version 0.1.0 tutarlı
```

**Değişmeyenler:** `registry/` (100 paket aynı), `cli/src/core/*`, `cli/src/commands/*` (dokunma, sadece polish).

---

## 3. Spesifikasyon — Neler Yapılacak

### 3.1 Demo Gif — 7 Saniye Akış

**Hedef sahne (sırayla, her adım 1–1.5sn, toplam 7sn):**

1. `forge doctor` → 5 harness yeşil (✓ Claude 2, Codex 2, OpenCode 5, Cursor 2, Generic 3 + store 8)
2. `forge search plan` → 1 sonuç `anthropics/plan@1.2.0 [skill] — Plan mode…`
3. `forge add anthropics/plan` → `resolving… found… installing… ✓ installed on 5 harness(es)`
4. `ls ~/.claude/skills/anthropics-plan` veya `forge list` → `anthropics/plan@1.2.0` görünüyor

**Format:** 800×400, 12fps, loop, <500KB, dark terminal (Catppuccin/Mono). Dosya: `docs/assets/demo.gif` (veya `assets/demo.gif`).

**Üretim yöntemi (tercih sırası):**

- **A) terminalizer** (node, `npm i -g terminalizer`): `terminalizer record demo && terminalizer render demo --output docs/assets/demo.gif` — Windows'ta çalışır, config `terminalizer.yml` ile font 14, cols 80, rows 18.
- **B) asciinema** (`asciinema rec demo.cast --command "bash demo.sh"` + `agg demo.cast demo.gif`) — `agg` Rust, hızlı ama Windows'ta kurulum zor.
- **C) Manuel SVG** (fallback): `svg-term` ile `demo.cast` → `demo.svg` → gyazo ile gif'e çevir. Eğer hiçbiri yoksa placeholder gif koy ve `DEMO.md`'de "gif Faz 4'te placeholder, Faz 5'te gerçek kayıt" notu.

**Faz 4'te en az:** placeholder `docs/assets/demo.gif` (1 frame, `forge add` çıktısı) + `DEMO.md`'de gerçek kayıt komutları. Gerçek kayıt Windows'ta ffmpeg olmadan zor, placeholder kabul — ama DEMO.md tekrarlanabilir olmalı.

### 3.2 README Cilası

**En üste eklenecek (badge'ler + gif + 1 satır install):**

```md
# Forge — The Homebrew for AI Agents

[![CI](https://github.com/oomerevren-beep/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/oomerevren-beep/forge/actions)
[![npm version](https://img.shields.io/npm/v/forge?label=npm)](https://www.npmjs.com/package/forge)
[![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![registry 100](https://img.shields.io/badge/registry-100%20packages-green.svg)](registry/index.json)

> One CLI to install skills, MCPs, plugins, agents on any harness.

![demo](docs/assets/demo.gif)

```bash
curl -fsSL https://forge.sh/install.sh | sh
# or
npm i -g forge
```
```

**Mevcut "Why Forge" tablosu korunacak** (6 tip tablosu zaten var), sadece gif'ten sonra gelecek şekilde sırala:

1. badges
2. gif
3. 1 satır install
4. Quick Start (4 satır)
5. Takım senkronu (Faz 3'te eklenen, koru)
6. How it works
7. Why Forge + Type tablosu
8. Registry + Docs + Status

**Polish:** "Status: v0.1 in progress" → "v0.1 — 100 packages, 5 harnesses, `forge install` ready — Trending prep".

### 3.3 `docs/DEMO.md` (Yeni)

Şablon:

```md
# Demo — 7 Second Wow

Gif: `docs/assets/demo.gif` (800x400, 7s, loop)

## How to reproduce (Windows)

```bash
terminalizer record demo --config terminalizer.yml
# run: forge doctor; forge search plan; forge add anthropics/plan; forge list
terminalizer render demo --output docs/assets/demo.gif
```

## How to reproduce (macOS/Linux)

```bash
asciinema rec demo.cast
# same commands
agg demo.cast docs/assets/demo.gif
```

## Script (demo.sh)

`forge doctor; sleep 1; forge search plan; sleep 1; forge add anthropics/plan; sleep 1; forge list`
```

En az 20 satır, tekrarlanabilir olmalı.

### 3.4 `install.sh` (Yeni, Kökte)

**Hedef:** `curl -fsSL https://forge.sh/install.sh | sh` tek satırı çalışsın.

**v0.1 için minimal akış (TS, Rust binary yok — npm fallback):**

```bash
#!/bin/sh
set -e
REPO="oomerevren-beep/forge"
VERSION="${FORGE_VERSION:-latest}" # veya 0.1.0

# 1. node varsa npm ile kur (en hızlı, v0.1'de yeterli)
if command -v npm >/dev/null 2>&1; then
  echo "[forge] installing via npm..."
  npm i -g forge
  echo "[forge] ✓ installed — run 'forge doctor'"
  exit 0
fi

# 2. node yoksa GitHub Releases'ten tarball çek (Faz 4'te placeholder, Faz 5'te gerçek release)
# URL: https://github.com/oomerevren-beep/forge/releases/download/v0.1.0/forge-v0.1.0-linux-x64.tar.gz
# Fallback: git clone + npm (node yoksa zaten zor — hata ver)
echo "[forge] npm not found — please install Node.js 18+ then rerun"
exit 1
```

**Dosyalar:**

- `install.sh` (executable, `chmod +x`, 30 satır, `set -e`)
- `install.ps1` (opsiyonel, Windows PowerShell — `irm https://forge.sh/install.ps1 | iex` — aynı npm mantığı, 20 satır) — Faz 4'te placeholder olabilir, DEMO.md'de "Windows: `npm i -g forge`" notu yeter.

**Test:** `bash install.sh` (dry) → `npm i -g forge` çağrısını görmeli (gerçek kurma testte mock).

### 3.5 `forge --help` / `--version` Polish

Mevcut `commander` help'i zaten var (`add`, `remove`, `list`, `doctor`, `search`, `info`, `init`, `install`, `outdated`, `update`).

**Polish yapılacaklar (cli/src/index.ts):**

- `.description()` metinlerine örnek ekle:
  - `add` → `"Install a package (e.g. forge add anthropics/plan@1.2.0)"`
  - `init` → `"Scaffold a new package (e.g. forge init my-skill --type skill)"`
  - `install` → `"Install all dependencies from forge.toml (team sync)"`
- `.version("0.1.0")` zaten var, `package.json:version` ile senkron tut (tek kaynak: `readFileSync("package.json").version` ile çekmek ideal, ama Faz 4'te hardcoded 0.1.0 kalabilir, Faz 5'te düzelt).
- Help çıktısı `npx tsx cli/src/index.ts --help`'te 11 komut net görünmeli.

### 3.6 CI Fix — `.github/workflows/ci.yml`

**Mevcut (bun):**

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install
- run: bun run registry:build --check
- run: bun test
```

**Faz 4'te (node + tsx):**

```yaml
- uses: actions/setup-node@v4
  with: { node-version: '20' }
- run: npm ci
- run: npm run registry:build -- --check
- run: npm run build
- run: npm test
```

Ayrıca `registry` job'u da aynı şekilde düzelt.

**Neden:** Windows'ta bun yok, skill pitfall #2. CI yeşil olmazsa HN'de badge kırmızı görünür — star kaybettirir.

---

## 4. Teknik Tasarım — Kod Değişiklikleri

### 4.1 Dosya Değişiklik Özeti

```
new:  docs/assets/demo.gif        (placeholder 1 frame, <100KB)
new:  docs/DEMO.md                (20+ satır, tekrarlanabilir kayıt adımları)
new:  install.sh                  (30 satır, sh, npm fallback)
new:  install.ps1                 (20 satır, ps1, opsiyonel placeholder)
mod:  README.md                   (badges + gif + 1 satır install en üste, Status güncelle)
mod:  .github/workflows/ci.yml    (bun → node, 6 satır)
mod:  cli/src/index.ts            (help description polish, 3 satır)
```

**Tahmini LOC:** ~80 (README) + 30 (install.sh) + 20 (DEMO.md) + 6 (CI) + 3 (help) = ~140.

### 4.2 Yeni Bağımlılık Yok

`terminalizer` global kurulur, `package.json`'a eklenmez. `asciinema`/`agg` opsiyonel. Faz 4'te yeni npm dep yok.

### 4.3 Karanlık Noktalar — Dikkat

- **Gif boyutu:** >500KB olursa README yavaşlar, GitHub 10MB limit. 800×400, 12fps, 7s → ~300KB ideal.
- **Badge URL'leri:** `oomerevren-beep/forge` doğru repo, `main` branch. CI badge `actions/workflows/ci.yml`'e bakmalı, `main`'de çalışınca yeşil olmalı.
- **install.sh PATH:** `npm i -g forge` sonrası `forge` PATH'te değilse (Windows npm global bin) — `install.sh` sonunda `echo "Add $(npm bin -g) to PATH"` uyarısı ekle.
- **Windows gif kaydı:** `terminalizer` Windows'ta çalışır ama `ffmpeg` gerekebilir. Yoksa placeholder gif koy, DEMO.md'de "Faz 5'te gerçek kayıt" notu yeterli.

---

## 5. Test Stratejisi — Faz 4'te Manuel + CI

- **Birim:** Yok (Faz 4 kod değil, doku). Mevcut 5 test korunmalı (`npm test` 5/5 PASS).
- **Manuel (zorunlu):**
  1. `bash install.sh` (dry-run, `set -x` ile) → `npm i -g forge` çağrısı görünüyor mu?
  2. `npx tsx cli/src/index.ts --help` → 11 komut + örnekli description'lar var mı?
  3. `npx tsx cli/src/index.ts --version` → `0.1.0`?
  4. `npm run registry:build -- --check` → `OK — in sync`?
  5. `npx tsx cli/src/index.ts doctor` → 5 harness yeşil mi (gif'in 1. sahnesi)?
  6. README'yi 5 kişiye göster (Faz 4 başarı kriteri) — 3'ü anladı mı? (Faz 4'te simüle: kendin 30sn oku, gif + install + quick start anlaşılıyor mu?)

---

## 6. Gün Gün İş Planı (1 Gün)

### Sabah (09:00–12:00) — Demo + README

- [ ] `docs/assets/` klasörü oluştur
- [ ] `terminalizer` kur dene (`npm i -g terminalizer`), olmazsa placeholder gif oluştur (1 frame SVG → gif, veya mevcut terminal çıktısını gif yap)
- [ ] `docs/assets/demo.gif` yerleştir (placeholder kabul)
- [ ] `docs/DEMO.md` yaz (20 satır, tekrarlanabilir adımlar, Windows notu)
- [ ] `README.md` polisaj: badges + gif + 1 satır install en üste, Status güncelle, takım senkronu koru

### Öğle (13:00–15:00) — Install + Help Polish

- [ ] `install.sh` yaz (30 satır, npm fallback, `set -e`, `chmod +x`)
- [ ] `install.ps1` yaz (20 satır, opsiyonel placeholder)
- [ ] `cli/src/index.ts` help description polish (3 satır)
- [ ] `npx tsx cli/src/index.ts --help` ve `--version` test

### Akşam (16:00–18:00) — CI + Doğrulama

- [ ] `.github/workflows/ci.yml` bun → node düzelt (6 satır)
- [ ] `npx tsc --noEmit` → 0 error?
- [ ] `npm test` → 5/5 PASS?
- [ ] `npm run registry:build -- --check` → OK?
- [ ] `bash install.sh` dry test + `forge doctor` gif sahnesi test
- [ ] Commit: `docs: 7s demo + README polish + install.sh (Faz 4)` + `git push`

---

## 7. Doğrulama Kriterleri (Faz 4 Bitti Demek İçin)

| Kriter | Komut | Beklenen |
|--------|-------|----------|
| demo gif var | `ls docs/assets/demo.gif` | dosya var, <500KB |
| DEMO.md var | `cat docs/DEMO.md` | 20+ satır, kayıt adımları var |
| install.sh var | `ls -la install.sh` | executable, 30 satır, `npm i -g forge` içeriyor |
| install.sh dry | `bash -x install.sh` (veya cat) | `npm i -g forge` çağrısı görülüyor |
| README badges | `head -20 README.md` | CI, npm, license, registry badge'leri var |
| README gif | `grep demo.gif README.md` | `![demo](docs/assets/demo.gif)` var |
| help polish | `npx tsx cli/src/index.ts --help` | 11 komut, örnekli description'lar |
| version | `npx tsx cli/src/index.ts --version` | `0.1.0` |
| CI tsx | `cat .github/workflows/ci.yml` | `setup-node`, `npm ci`, `npm test` var, `setup-bun` yok |
| tsc | `npx tsc --noEmit` | 0 error |
| test | `npm test` | 5/5 PASS |
| registry | `npm run registry:build -- --check` | OK |

Hepsi yeşilse Faz 4 DONE — Faz 5 soft launch'a hazır.

---

## 8. Riskler ve Panzehirleri

| Risk | Olasılık | Etki | Panzehir |
|------|----------|------|----------|
| terminalizer Windows'ta ffmpeg istiyor, gif üretilemiyor | Yüksek | Demo gif yok | Placeholder gif koy (1 frame), DEMO.md'de gerçek kayıt adımları yaz, Faz 5'te gerçek gif çek |
| Badge URL'i yanlış repo'ya bakıyor, CI badge kırmızı | Orta | README güven kaybı | `oomerevren-beep/forge` ve `ci.yml` branch `main` doğru mu kontrol et, push sonrası badge yeşil mi bak |
| install.sh `npm` yoksa fail, kullanıcı Node kurmamış | Yüksek | Kurulum fail | `install.sh`'te `npm not found` güzel hata mesajı + `https://nodejs.org` linki ver |
| GIF >1MB, README yavaş | Düşük | Star kaybı | 800×400, 12fps, 7s → optimize et, `gifsicle --optimize=3` veya `ffmpeg -vf scale=800:-1` |
| Help polish `package.json` version ile senkron değil | Düşük | Version mismatch | Faz 4'te hardcoded 0.1.0 kalabilir, Faz 5'te `readFileSync(package.json).version` ile otomatik çek |

---

## 9. Faz 4 Sonrası — Viral Hazırlık

- **README'yi 5 kişiye göster testi:** Kendin 30sn oku — gif + 1 satır install + quick start anlaşılıyor mu? 3/5 anladıysa Faz 4 DONE.
- **Twitter ön izleme:** Gif'i tek başına tweetle, 10k gösterim hedefi Faz 6'da, ama Faz 4'te gif hazır olmalı.
- **Faz 5'e geçiş:** `v0.1.0` tag + `install.sh` CDN (GitHub Pages) + 20 arkadaşa DM — Faz 4 bitince Faz 5 soft launch başlar.

---

## 10. Kararlar (Onay Gereken 2 Nokta)

1. **Demo gif gerçek mi placeholder mı?** Öneri: Faz 4'te placeholder gif (1 frame, `forge add` çıktısı) + DEMO.md gerçek kayıt adımları. Gerçek kaydı Faz 5'te ffmpeg ile çek. Onay?
2. **install.ps1 olsun mu?** Öneri: Evet placeholder (20 satır, `npm i -g forge` mantığı), Windows kullanıcıları `irm ... | iex` ile kurar. Yoksa sadece `install.sh` + README'de "Windows: `npm i -g forge`" notu. Onay?

Onay verirsen Faz 4 kodlamasına geçiyorum — önce `docs/assets/demo.gif` placeholder + `DEMO.md`'yi yazıp README'yi cilalıyorum.

