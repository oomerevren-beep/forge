# FAZ 5 — Launch Hazırlığı: Gerçek Demo + NPM Çözümü + Soft Launch

> Hedef: Launch günü patlamamak. Star etkisi: 1.200 → 2.000 (soft, gerçek viral Faz 6'da).
> Süre: 2 gün. Çıktı: gerçek 7sn gif + npm ismi kararı + 5 yeni test + soft launch 20+5 + LAUNCH.md taslakları + 10 makine yeşil.
> Önkoşul: Faz 4 DONE (README nihai 331 satır, og.png 32KB, build 0, test 5/5, release v0.1.0 canlı, license MIT).

---

## 1. Neden Faz 5 Şimdi? (Faz 4'ten Sonraki Doğal Adım)

Faz 4 README'yi vitrin yaptı ama 3 bomba yerinde duruyor:

1. **Demo gif 42B placeholder.** README'nin kalbi sahte — HN'de gif'i açan biri 1 frame görürse "scam" der. Gerçek 7sn kayıt olmadan Faz 6 (HN) atılamaz. 100K planındaki "demo 7 saniye" vaadi Faz 5'te gerçeğe dönmeli.
2. **npm ismi `forge` dolu.** `npm view forge` → `goatslacker/forge@2.3.0` (proprietary, 1 yılda güncellenmemiş). `npm i -g forge` desek başkasının paketi kurulur. Faz 5'te scoped `@forge/cli`, `forge-cli`, `tryforge`, `forge-ai` arasından biri seçilip `package.json:name` + `install.sh` + README + `bin` güncellenmeli. Bu karar Faz 6'daki `npm i -g X` komutunu belirler — geri dönüşü yok.
3. **Soft launch sıfır.** 20 arkadaş + 5 Discord'a gösterilmeden HN'ye çıkmak = 10 farklı makinede `install.sh | sh && forge add obra/superpowers` patlar, HN yorumlarında "doesn't work on Windows" yazar, trending ölür. Faz 5 = 10 makine testi + geri bildirim + bug fix.

> Faz 5 bitmeden Faz 6 yok. Bu faz 2 gün sürer ama 800 star + launch günü kurtarır.

---

## 2. Hedef Mimari — Faz 5 Sonrası Görünenler

```
README.md (değişir)
  hero gif: docs/assets/demo.gif 42B → ~300KB gerçek kayıt (800x400, 7s, loop, dark)
  install komutları: npm i -g forge → npm i -g <yeni-isim> (örn. tryforge)

package.json (değişir)
  name: "forge" → "tryforge" veya "@forge/cli" (karar Faz 5.2'de)
  bin: { "forge": "dist/..." } → { "tryforge": "dist/...", "forge": "dist/..." } (alias korunur)

docs/assets/demo.gif (değişir)
  1 frame placeholder → terminalizer/asciinema gerçek kayıt (7s akış: doctor→search→add→list)

docs/LAUNCH.md (yeni, 80+ satır)
  HN / PH / Reddit / X 4 taslak (başlık + gövde + yorum cevap şablonları + zamanlama Salı 09:00 EST)

tests/ (genişler)
  smoke.test.ts (5 test) → +5 test: adapter detect, install idempotency, update/outdated, project parse, search filter
  Toplam 10 test, hepsi <500ms

registry/ (kısmi gerçek)
  101 placeholder sha → ilk 5 paket (anthropics/plan, mcp/filesystem, skill/pdf, obra/superpowers, cmd/plan) gerçek tarball + sha256
  Kalan 95 placeholder kalabilir (Faz 13'te 500'e çıkarken gerçeklenir)

soft-launch/ (opsiyonel, gitignore'da)
  10 makine test logu + 20 DM geri bildirim özetleri (Faz 5 kanıtı)
```

**Değişmeyenler:** `cli/src/core/*`, `cli/src/commands/*` (sadece test eklenir, logic dokunulmaz), `registry/index.json` yapısı, `og.png`.

---

## 3. Spesifikasyon — Neler Yapılacak

### 3.1 Gerçek 7sn Demo Gif (En Kritik)

**Hedef sahne (sırayla, toplam 7sn, 12fps, loop, <500KB, dark #1a1b26):**

1. `forge doctor` → 5 harness yeşil (✓ claude-code, codex, opencode, cursor, generic) + `8 packages` (1.5s)
2. `forge search plan` → `anthropics/plan@1.2.0 [skill]` 2 sonuç (1.5s)
3. `forge add anthropics/plan` → `resolving… found 1.2.0 [skill] … ✓ installed on 5 harness(es)` (2s)
4. `forge list` → `anthropics/plan@1.2.0` + 7 diğer (2s)

**Format:** 800×400, 80 cols × 18 rows, font 14, `terminalizer.yml` Catppuccin. Dosya: `docs/assets/demo.gif` üzerine yazılacak.

**Üretim yöntemi (tercih sırası, Windows'ta):**

- **A) terminalizer** (önerilen): `npm i -g terminalizer` → `terminalizer record demo --config terminalizer.yml` → içeride `demo.sh` çalıştır → `terminalizer render demo --output docs/assets/demo.gif` → `gifsicle --optimize=3`
- **B) playwright terminal screenshot** (fallback, Windows'ta daha güvenilir): `node scripts/record-demo.ts` — playwright ile terminal komutlarını çalıştır, her adımı screenshot al, `ffmpeg -framerate 12 -i frame%02d.png demo.gif`
- **C) asciinema + agg** (macOS/Linux'ta ideal, Windows'ta zor): `asciinema rec demo.cast --command "bash demo.sh"` + `agg demo.cast docs/assets/demo.gif`

**Faz 5'te en az:** Gerçek gif **olmalı** — placeholder artık kabul değil. Eğer `ffmpeg` yoksa **B** ile playwright fallback çalışır (zaten `playwright` devDep'te var).

**Doğrulama:** `ls -lh docs/assets/demo.gif` → 100KB–500KB, `file demo.gif` → GIF, `gifsicle --info demo.gif` → 7s, loop.

### 3.2 NPM İsmi Kararı + Rename

**Sorun:** `npm view forge` → `goatslacker/forge@2.3.0` (proprietary, 2013'ten beri). `npm publish` `403` verir. 3 seçenek:

| Seçenek | `package.json:name` | `npm i -g` komutu | `bin` | Artı | Eksi |
|---------|---------------------|-------------------|-------|------|------|
| **A) `tryforge`** (önerilen) | `tryforge` | `npm i -g tryforge` | `tryforge` + `forge` alias | Kısa, aranabilir, `try` viral, `forge` dolu sorununu çözer, `install.sh`'ta `npm i -g tryforge` net | `forge` ismi kaybolur mu? Hayır, repo `forge` kalır, bin alias ile `forge` komutu korunur |
| B) `@forge/cli` (scoped) | `@forge/cli` | `npm i -g @forge/cli` | `forge` | Namespace temiz, `forge` markası korunur | `@` yazmak HN'de sürtünme, `curl | sh` daha çok kullanılır zaten |
| C) `forge-cli` | `forge-cli` | `npm i -g forge-cli` | `forge-cli` + `forge` alias | Açık | Uzun, `-cli` ekini kimse sevmez |

**Öneri: A) `tryforge`** — repo `oomerevren-beep/forge` kalır, npm `tryforge`, bin'de hem `tryforge` hem `forge` (alias). Kullanıcı `npm i -g tryforge` der, sonra `forge add` çalışır (alias). `install.sh` güncellenir: `npm i -g tryforge`. README'deki `npm i -g forge` → `npm i -g tryforge` (ama `forge add` örnekleri aynı kalır çünkü bin alias).

**Alternatif:** Eğer `forge` ismi vazgeçilmez dersen B) `@forge/cli` — ama Faz 5'te karar verilmeli, Faz 6'daki ilk `npm i` komutu değişmez.

**Yapılacaklar (isim kararı sonrası):**

- `package.json`: `name`, `bin`, `repository.url` güncelle (A'da `tryforge`, bin `{ "forge": "dist/...", "tryforge": "dist/..." }`)
- `install.sh` / `install.ps1`: `npm i -g forge` → `npm i -g tryforge` (veya `@forge/cli`)
- `README.md`: Install bölümü + hero code block + Quick Start hepsi yeni isme güncelle (ama `forge add` komutu bin alias sayesinde çalışır)
- `docs/ARCHITECTURE.md` + `CONTRIBUTING.md`: `npm i -g` örnekleri güncelle
- `npm pack --dry-run` + `npm publish --dry-run` ile doğrula (gerçek publish Faz 6 öncesi, Faz 5'te dry-run)

**Test:** `npm pack --dry-run` → `name: tryforge`, `bin: forge, tryforge`, `package size ~114KB`.

### 3.3 Test Genişletmesi: 5 → 10

Mevcut `tests/smoke.test.ts` (5 test): config, project, validate, registry, toml.

**Eklenecek 5 test (`tests/adapter.test.ts` veya `smoke` içine):**

1. `adapter detect` — 5 adapter `detect()` en az 2'si true (mock FS ile)
2. `install idempotency` — `forge install` 2. kez `0 new, 5 cached` (store mock)
3. `update/outdated` — `1.1.0 → 1.2.0` bump tespiti
4. `project parse edge` — `[package]` forge.toml'unu proje sanmıyor, hata veriyor mu?
5. `search filter` — `search --type skill plan` sadece skill dönüyor mu? `search mcp` 24 mü?

Hepsi `node --import tsx --test` ile <500ms, offline, mock FS.

**Başarı:** `npm test` → `tests 10, pass 10`.

### 3.4 Registry İlk 5 Gerçek SHA

101 placeholder'dan ilk 5'i gerçekle:

- `anthropics/plan@1.2.0`, `mcp/filesystem@1.0.2`, `skill/pdf@1.0.0`, `obra/superpowers@3.0.0`, `cmd/plan@1.0.0`

Her biri için: GitHub Release tarball indir → `sha256sum` → `registry/packages/<slug>.json`'da `sha256: placeholder-*` → gerçek `sha256: abc123...` yaz → `npm run registry:build` → `placeholderSha: 101 → 96`.

Kalan 95 placeholder kalabilir (Faz 13'te toplu gerçeklenir). Ama en az 5 gerçek olursa `forge add` prod yolunu test eder ve HN'de "placeholder" eleştirisi önlenir.

### 3.5 Soft Launch: 20 Arkadaş + 5 Grup + 10 Makine

**Hedef:** Launch günü "doesn't work on Windows" yorumunu önlemek.

**20 DM listesi (öneri, sen doldur):**

- 5 yakın arkadaş (Windows/Mac karışık)
- 5 Twitter/X'ten AI agent kullanan dev
- 5 Claude Code / OpenCode Discord üyeleri
- 5 Türk dev topluluğu (Discord/Slack/Telegram)

DM şablonu: `Selam! Forge'u denedin mi? brew for AI agents — one CLI, 5 harness. 2 dakikada kurup ` + "`forge add anthropics/plan`" + ` dener misin? Geri bildirim süper değerli: https://github.com/oomerevren-beep/forge`

**5 Grup:** r/ClaudeAI (soft), OpenCode Discord #showcase, Cursor Discord, Türk Yazılım Discord #projeler, senin Telegram grubun.

**10 Makine testi (checklist, her makinede):**

```bash
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
forge doctor          # 5 harness yeşil mi?
forge search plan     # <500ms mi?
forge add anthropics/plan --dry-run
forge add anthropics/plan
forge list            # 8 paket var mı?
forge install         # (forge.toml olan projede)
```

Log'ları `soft-launch/logs/<makine>.txt`'de topla (gitignore'da, sadece özet commit).

**Geri bildirim formu:** 3 soru — "Kurulum kaç dakika?", "Hangi adım takıldı?", "Hangi paketi aradın bulamadın?".

### 3.6 LAUNCH.md — HN/PH/Reddit/X Taslakları (Kalıcı)

`docs/LAUNCH.md` (80+ satır) — Faz 6'da Salı 09:00 EST atılacak 4 taslak:

- **HN Show:** `Show HN: Forge – The Homebrew for AI Agents (one CLI for skills/MCP/plugins)` — body: problem (fragmentation) → çözüm (6 types, 5 harness) → demo gif → 100 paket → CTA star + `forge add`. Yorum cevap şablonları: "Why not use X?" → "We are universal, X is single-harness".
- **Product Hunt:** Tagline 60 char, gallery (og.png + demo.gif), maker comment, hunter pitch.
- **Reddit:** r/ClaudeAI, r/LocalLLaMA, r/programming — her biri farklı açı (Claude'a skill, dev'e package manager).
- **X Thread:** 8 tweet (Problem → Çözüm → Demo gif → `forge add` → Registry → Adapter → Team sync → CTA).
- **Zamanlama:** HN Salı 09:00 EST (HN algısı için en iyi), PH aynı hafta Çarşamba, Reddit ertesi gün, X thread HN ile eşzamanlı.

`C:/Users/ömer/AppData/Local/Temp/forge-social.md`'deki taslaklar buraya taşınacak ve polish edilecek.

### 3.7 v0.1.1 Patch Release Hazırlığı

Faz 5'teki bug fix'ler `v0.1.1` olarak etiketlenir (soft launch sonrası). `git tag v0.1.1` + `gh release create v0.1.1` — changelog: `fix: demo gif, npm rename, 5 tests, 5 real SHA`.

---

## 4. Teknik Tasarım — Kod Değişiklikleri

### 4.1 Dosya Değişiklik Özeti

```
mod:  docs/assets/demo.gif        42B → ~300KB gerçek kayıt (B yöntemi, playwright fallback)
new:  scripts/record-demo.ts      (opsiyonel, B yöntemi için, 50 satır)
mod:  package.json                name: forge → tryforge, bin: forge+tryforge, version 0.1.1
mod:  package-lock.json           name sync
mod:  install.sh / install.ps1    npm i -g forge → npm i -g tryforge
mod:  README.md                   Install + hero code block + badges (npm tryforge)
mod:  docs/ARCHITECTURE.md        npm i -g örnekleri güncelle
mod:  tests/smoke.test.ts         +5 test → 10 test (adapter, install, update, project edge, search)
new:  tests/adapter.test.ts       (alternatif, 5 test ayrı dosya)
mod:  registry/packages/5x.json   sha256 placeholder → gerçek (ilk 5 paket)
mod:  docs/LAUNCH.md              yeni, 80+ satır, 4 taslak + zamanlama + cevap şablonları
mod:  .gitignore                  soft-launch/logs/ ekle (opsiyonel)
```

**Tahmini LOC:** ~150 (demo gif binary hariç) + 80 (LAUNCH.md) + 50 (tests) + 20 (rename) = ~300.

### 4.2 Yeni Bağımlılık

- Yok (playwright zaten devDep, terminalizer global). `ffmpeg` gerekirse `choco install ffmpeg` / `apt install ffmpeg` notu.

### 4.3 Karanlık Noktalar

- **Demo gif boyutu >500KB:** `gifsicle --optimize=3` + `ffmpeg -vf scale=800:-1` ile küçült, 12fps'i 10fps'e düşür.
- **npm scoped publish yetkisi:** `npm login` → `npm publish --access public` (scoped için şart). `tryforge` unscoped ise public default.
- **Windows playwright headed:** `stdin is not a tty` hatası headless'te çözülüyor, B yöntemi headless kullanır.
- **HN rate limit:** Faz 5'te HN'ye **atılmaz**, sadece taslak hazırlanır. Gerçek atış Faz 6 Salı 09:00 EST.
- **Soft launch DM spam:** Günde 5 DM, 4 güne yay — tek günde 20 DM spam filtresine takılır.

---

## 5. Test Stratejisi

- **Birim (10 test):** `npm test` → 10/10 pass, <1s. Mock FS ile adapter/install/search.
- **Manuel (10 makine):** Her makinede `install.sh | sh && forge doctor && forge add anthropics/plan && forge list` yeşil.
- **Görsel:** `docs/assets/demo.gif` → 800×400, 7s, loop, <500KB, dark terminal.
- **Registry:** `npm run registry:build -- --check` → OK, `placeholderSha: 96` (5 gerçek).
- **NPM:** `npm pack --dry-run` → `name: tryforge`, `package size ~115KB`, `bin: forge, tryforge`.

---

## 6. Gün Gün İş Planı (2 Gün)

### Gün 1 — Sabah (09:00–12:00) — Demo + NPM Kararı

- [ ] `npm view forge` + `npm view tryforge` + `npm view @forge/cli` müsaitlik kontrolü (npm search)
- [ ] Karar: A/B/C — senin onayın (öneri: **tryforge**)
- [ ] `package.json:name` + `bin` + `install.sh` + `README` rename (30 dk)
- [ ] `npm pack --dry-run` doğrula

### Gün 1 — Öğle (13:00–16:00) — Gerçek Gif

- [ ] `terminalizer` kur dene, olmazsa `scripts/record-demo.ts` (playwright B) yaz
- [ ] `docs/assets/demo.gif` gerçek kayıt → optimize → `ls -lh` 100–500KB kontrol
- [ ] `docs/DEMO.md` güncelle: "gerçek kayıt Faz 5'te alındı" notu

### Gün 1 — Akşam (16:00–18:00) — Test + SHA

- [ ] `tests/smoke.test.ts` +5 test → `npm test` 10/10
- [ ] İlk 5 paket için `sha256` gerçekle → `npm run registry:build` → `placeholderSha: 96`
- [ ] Commit: `feat: gerçek demo gif + npm rename + 5 test (Faz 5a)`

### Gün 2 — Sabah (09:00–12:00) — LAUNCH.md + Soft Launch Başlat

- [ ] `docs/LAUNCH.md` yaz (HN/PH/Reddit/X 4 taslak + zamanlama + cevap şablonları)
- [ ] `C:/Users/ömer/AppData/Local/Temp/forge-social.md`'yi LAUNCH.md'ye taşı + polish
- [ ] 10 DM at (ilk 5 arkadaş + 5 Discord), 10 makine testini başlat

### Gün 2 — Öğle (13:00–16:00) — Soft Launch Devam + Bug Fix

- [ ] Kalan 10 DM + 5 grup paylaşımı
- [ ] Gelen geri bildirimleri topla, bug fix (örn. Windows junction, `forge install --frozen` edge)
- [ ] `npm run build && npm test && hermes verify --json` yeşil mi?

### Gün 2 — Akşam (16:00–18:00) — v0.1.1 + Doğrulama

- [ ] `git tag v0.1.1` + `gh release create v0.1.1` (changelog: demo, rename, tests, SHA)
- [ ] `git push origin main --tags`
- [ ] Doğrulama tablosu 12/12 yeşilse Faz 5 DONE

---

## 7. Doğrulama Kriterleri (Faz 5 Bitti Demek İçin)

| Kriter | Komut | Beklenen |
|--------|-------|----------|
| gerçek gif var | `ls -lh docs/assets/demo.gif` | 100KB–500KB, GIF, 7s loop |
| DEMO.md güncel | `cat docs/DEMO.md` | "gerçek kayıt Faz 5" notu |
| npm ismi kararlı | `cat package.json \| grep name` | `tryforge` veya `@forge/cli`, `npm pack --dry-run` OK |
| bin alias | `cat package.json \| grep bin -A2` | `forge` + yeni isim ikisi var |
| install.sh güncel | `grep "npm i -g" install.sh` | yeni isimle |
| README güncel | `grep "npm i -g" README.md` | yeni isimle, hero code block güncel |
| test 10/10 | `npm test` | 10 pass, 0 fail |
| registry 5 gerçek | `cat registry/stats.json` | `placeholderSha: 96` (101→96) |
| LAUNCH.md var | `wc -l docs/LAUNCH.md` | 80+ satır, 4 taslak + zamanlama |
| build | `npm run build` | 0 error |
| registry check | `npm run registry:build -- --check` | OK |
| 10 makine testi | `soft-launch/logs/` veya sözlü onay | en az 5 makine yeşil (Faz 5'te 5, Faz 6 öncesi 10) |

Hepsi yeşilse Faz 5 DONE — Faz 6 HN lansmanına hazır.

---

## 8. Riskler ve Panzehirleri

| Risk | Olasılık | Etki | Panzehir |
|------|----------|------|----------|
| `tryforge` npm'de de dolu | Düşük (kontrol edildi, boş görünüyor) | rename fail | `npm view tryforge` Faz 5.2'de tekrar kontrol, doluysa `forge-ai` veya `forgehq` fallback |
| `ffmpeg` yok, gif üretilemiyor | Orta (Windows) | demo gif yok | Playwright B fallback (zaten var), `gifsicle` ile optimize |
| GIF >500KB | Orta | README yavaş | 800×400, 10fps, optimize, gerekirse 640×320 |
| Soft launch geri bildirim gelmez | Orta | bug'lar HN'de patlar | 20 DM'yi 4 güne yay, her DM kişiselleştir, 5 grupta aktif sor |
| HN'de "placeholder SHA" eleştirisi | Düşük (5 gerçek sonrası) | güven kaybı | En az 5 gerçek SHA + LAUNCH.md'de "101 → 96, Faz 13'te hepsi gerçek" notu |
| `npm publish` scoped için login gerekir | Yüksek | publish fail | `npm login` + `npm publish --access public` (scoped) veya unscoped `tryforge` seç |

---

## 9. Faz 5 Sonrası — Viral Hazırlık

- **Faz 6:** HN Show (Salı 09:00 EST) + Reddit + X thread — LAUNCH.md'deki taslaklar kullanılır. İlk 2 saat yorumlara anında cevap (HN'de yazar aktif değilse ölür).
- **Faz 7:** Product Hunt + Dev.to + Hashnode (HN sonrası hafta).
- **Faz 8:** `forge publish` — creator flywheel (her publish 50–200 star).

---

## 10. Kararlar (Onay Gereken 3 Nokta)

1. **NPM ismi:** **A) `tryforge`** (önerilen, `forge` alias korunur), B) `@forge/cli` (scoped), C) `forge-cli` — hangisi? Onay?
2. **Demo gif yöntemi:** A) terminalizer, B) playwright fallback — ikisi de hazır, A öncelik, B fallback. Onay?
3. **Soft launch DM listesi:** 20 kişi + 5 grup — listeyi sen mi verirsin, ben mi öneri listesiyle başlayayım? Onay?

Onay verirsen Faz 5 kodlamasına geçiyorum — önce **npm ismi + gerçek gif** ile başlıyorum.

