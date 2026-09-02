# FAZ 3 — `forge install` + `forge.toml` Takım Senkronu + `forge init` Detaylı Plan

> Hedef: Takım hikayesi çalışıyor (`US-5`). `forge.toml`'u git'e pushla, arkadaş `forge install` desin — aynı 20 skill herkeste.  
> Süre: 1–2 gün. Star etkisi: 200→600. Çıktı: `install`/`init`/`update`/`outdated` + `~/.forge/config.toml` + proje seviyesi lock.

**Durum:** Faz 1'de `forge add` 5 harness'te çalışıyor, Faz 2'de registry 100 pakete çıktı (57 skill, 24 mcp, 8 agent, 5 command, 3 hook, 3 plugin), `forge search` 25 mcp döndürüyor, `forge doctor/list/info` yeşil. Eksik: `forge install` yok (proje `forge.toml` okuma yok), `forge init` yok (yeni paket iskeleti yok), `~/.forge/config.toml` yok, `forge update/outdated` yok, TOML parser yok, lock stratejisi yok. Bu faz npm'deki `package.json` → `npm install` anını Forge'a getirir.

---

## 1. Neden Faz 3 Şimdi? (Faz 2'den Sonraki Doğal Adım)

- **Faz 2'nin boşa gitmemesi için:** 100 paket var ama her proje elle `forge add anthropics/plan && forge add mcp/github ...` 20 kez yazıyor. Takım lead'i "standart setim var, herkes aynı olsun" diyemiyor.
- **Viral loop'un 2. halkası:** Faz 2'de yazar `forge add benim/paketim` diyor. Faz 3'te takım lead'i `forge.toml`'u paylaşıyor → takımın 5 kişisi Forge kuruyor → 5 install.
- **Creator onboarding:** `forge init` olmadan yeni paket yazmak = `forge.toml`'u elle yaz, hata yap. `forge init my-skill --type skill` 30 saniyede iskelet = publish'e giden yol.
- **Config borcu:** `~/.forge/config.toml` olmadan registry URL'i hardcoded (`registry`). Private registry (Faz 19) için şimdiden abstraction lazım.

> Faz 3 bitmeden HN'e çıkma planı doğru — ama Faz 3 bitince takım demo'su (2 makinede `forge install` aynı sonucu veriyor) video'ya girer.

---

## 2. Hedef Mimari — Faz 3 Sonrası Dosya Haritası

```
# Proje seviyesi (npm gibi)
my-project/
  forge.toml              # ← Faz 3'te tüketici tarafı: [project] + [dependencies]
  forge.lock              # ← opsiyonel Faz 3'te (deterministik), Faz 3'te ilk versiyon "install sonrası snapshot"
  .forge/                 # ← proje local cache (opsiyonel, .gitignore)
  .opencode/skills/       # ← adapter target (zaten var)

# Kullanıcı seviyesi
~/.forge/
  config.toml             # ← Faz 3 yeni: registry, defaultAdapters, autoUpdate
  packages/               # ← zaten var
  links.json              # ← zaten var, Faz 3'te project install'lar da buraya yazılacak + project field
  cache/

# Paket seviyesi (yazar tarafı)
my-skill/
  forge.toml              # ← [package] + [engines] + [files] + [mcp]/[skill] (SPEC'e uygun)
  SKILL.md
  scripts/*
```

**Üç `forge.toml` rolü:**
1. **Paket `forge.toml`** (yazar): `registry/packages/<slug>.json` kaynağı, `SPEC.md`'deki `[package]` zorunlu.
2. **Proje `forge.toml`** (tüketici): `SPEC.md`'deki son örnek gibi `[project]` veya `[dependencies]` içeren, `forge install`'ın okuduğu.
3. **Config `~/.forge/config.toml`** (kullanıcı): registry override, default harness'lar, telemetry opt-in.

Faz 3'te (1) zaten kısmen var (seed'de kullanılıyor), (2) ve (3) yeni.

---

## 3. Spesifikasyon — Dosya Formatları (SPEC'den)

### 3.1 Proje `forge.toml` (tüketici) — `SPEC.md` §3

```toml
# my-project/forge.toml — örnek (Faz 3'te desteklenecek)
[project]
name = "my-app"
version = "0.1.0"
description = "My AI-powered app"

[dependencies]
"anthropics/plan" = "^1.2.0"
"anthropics/brainstorm" = "^1.1.0"
"mcp/filesystem" = "^1.0.2"
"mcp/github" = "^1.0.0"
"obra/superpowers" = "^3.0.0"
"skill/pdf" = "^1.0.0"
# ... toplam 20 paket tipik

# Opsiyonel: hangi harness'lara kur? Boşsa auto-detect
[forge]
harnesses = ["claude-code", "opencode"]

# Opsiyonel: registry override (private registry Faz 19, ama Faz 3'te altyapı kalsın)
[config]
registry = "https://registry.forge.sh/index.json"
```

**Kurallar:**
- `[dependencies]` key = `scope/name`, value = semver range (`^`, `~`, `*`, `>=`, exact). Faz 1'deki `registry.ts`'deki `satisfiesRange` zaten destekliyor.
- `forge install` bu dosyayı okur, her dependency için `resolveVersion(dep, range)` → en yüksek satisfying → `ensurePackageContent` → `adapter.install`.
- `forge.lock` (Faz 3'te basit): install sonrası `forge.lock` yaz (`[packages] "anthropics/plan" = "1.2.0"` gibi), sonraki `forge install` lock varsa lock'taki exact versiyonu kur (deterministik). `--frozen` yoksa lock'u güncelle.

### 3.2 `~/.forge/config.toml` (kullanıcı)

```toml
# ~/.forge/config.toml — Faz 3'te oluşturulacak, yoksa default
registry = "https://registry.forge.sh/index.json"  # default: local registry/ (dev) veya CDN
defaultHarnesses = []  # boş = auto-detect (detectAdapters()), doluysa sadece onlar
autoUpdate = false
telemetry = false
```

**Davranış:**
- `forge` her çalışmada önce `~/.forge/config.toml` oku, yoksa default.
- `config.registry` eğer `registry/` yerel dosyaysa `registry/index.json`'dan oku, yoksa URL'den fetch (Faz 3'te yerel yeterli, fetch Faz 4).
- `forge config get registry` / `forge config set registry <url>` komutu Faz 3'te yok, Faz 5'te eklenecek — Faz 3'te elle TOML düzenle.

### 3.3 `forge.lock` (proje, Faz 3'te basit)

```toml
# my-project/forge.lock — auto-generated, git'e commit önerilir
[[packages]]
name = "anthropics/plan"
version = "1.2.0"
type = "skill"

[[packages]]
name = "mcp/filesystem"
version = "1.0.2"
type = "mcp"
```

Faz 3'te lock sadece snapshot, `forge install` lock varsa onu kullanır, yoksa `forge.toml`'dan resolve eder. `forge update` lock'u yeniler.

---

## 4. CLI Tasarımı — Komutlar (PRD §3.1'den)

### `forge init [name] --type <type> [--yes]`

```
forge init my-skill
forge init my-skill --type skill --yes
forge init my-mcp --type mcp
forge init my-agent --type agent
```

**Davranış:**
- `my-skill/` klasörü yoksa oluştur, varsa hata ( `--force` ile overwrite).
- Seçili type'a göre `forge.toml` şablonu yaz + starter dosya:
  - `skill` → `SKILL.md` (başlık + description + usage iskeleti)
  - `mcp` → `forge.toml`'da `[mcp] command/args`, `src/index.ts` iskeleti
  - `agent` → `agent.md` iskeleti
  - `command`/`hook`/`plugin` → ilgili iskelet (Faz 3'te en az skill+mcp+agent destekle, diğerleri placeholder)
- `--yes` bayrağı soru sormadan default'larla oluşturur.
- Sonunda: `✓ created my-skill/forge.toml — run 'forge publish' to share (Faz 8)`

### `forge install`

```
forge install          # ./forge.toml'dan kurar
forge install --frozen # lock varsa lock'tan kurar, uyumsuzsa hata
```

**Davranış:**
- `process.cwd()`'de `forge.toml` ara, yoksa `forge.toml` yok hatası ( `forge init` öner).
- TOML parse (`smol-toml` ile), `[dependencies]` boşsa `0 installed`.
- Her dep için `resolveVersion(name, range)` → `ensurePackageContent` → `detectAdapters()` (veya `config.defaultHarnesses` varsa onlar) → `adapter.install`.
- `links.json`'a yaz (`project: cwd` field opsiyonel, Faz 3'te sadece global links).
- `forge.lock` yaz.
- Çıktı: `✓ installed 20 packages on 5 harnesses in 3.2s`

**Edge:**
- Zaten kuruluysa `isPackageInstalled` check → skip, `already installed`.
- Version conflict (aynı paket iki farklı range ile transitiv bağımlılıkta) → Faz 1'deki DFS gibi en yüksek satisfying seç, Faz 3'te uyarı bas.

### `forge update [pkg]`

```
forge update           # hepsini latest satisfying'e güncelle
forge update mcp/github # sadece o paketi
```

**Davranış:**
- `forge.toml`'daki range'i değil, `registry`'deki `latest`'i baz alır ama range'e uyar (`^1.0.0` içinde en yeni). `latest` range dışındaysa range'i aşma (npm gibi).
- Güncellenen paketleri yeniden `ensurePackageContent` + `adapter.install`.
- `forge.lock` ve `links.json` güncelle.

### `forge outdated`

```
forge outdated
```

**Çıktı:**
```
anthropics/plan  1.1.0 → 1.2.0 (latest)
mcp/github       1.0.0 → 1.0.1 (latest)
```

**Mantık:** `links.json`'daki kurulu versiyon vs `registry`'deki `latest` (range içinde) karşılaştır.

---

## 5. Teknik Tasarım — Kod

### 5.1 Yeni Bağımlılık: TOML Parser

`package.json`'a ekle:
```json
"smol-toml": "^1.3.0"  # veya @iarna/toml, smol-toml daha hafif ve ESM
```

Alternatif: `toml` paketi de olur, ama `smol-toml` 0 dep, 5KB.

### 5.2 Yeni Dosyalar

```
cli/src/core/config.ts      # ~/.forge/config.toml oku/yaz, default, registry URL çözümleme
cli/src/core/project.ts     # ./forge.toml (proje) parse, validate, dependencies al
cli/src/core/lock.ts        # ./forge.lock oku/yaz (opsiyonel Faz 3'te)
cli/src/commands/init.ts    # forge init logic (şablonlar)
cli/src/commands/install.ts # forge install logic
cli/src/commands/update.ts  # forge update + outdated logic
```

Mevcut `cli/src/index.ts` sadece commander wiring yapacak, logic bu dosyalara taşınacak (Faz 1'de hepsi index.ts içindeydi, Faz 3'te ayrıştır).

### 5.3 `cli/src/core/config.ts` (60 satır)

```ts
export interface ForgeConfig { registry: string; defaultHarnesses: string[]; autoUpdate: boolean; telemetry: boolean; }
export function loadConfig(): ForgeConfig { /* ~/.forge/config.toml oku, yoksa default */ }
export function saveConfig(cfg: ForgeConfig): void { /* yaz */ }
export function configPath(): string { return join(homedir(), ".forge", "config.toml"); }
```

Default `registry = "registry/index.json"` (dev), prod'da `https://registry.forge.sh/index.json` olacak ama Faz 3'te yerel yeterli.

### 5.4 `cli/src/core/project.ts` (80 satır)

```ts
export interface ProjectToml { project?: { name: string; version: string }; dependencies: Record<string,string>; forge?: { harnesses?: string[] }; }
export function findProjectToml(cwd: string): string | null { /* cwd/forge.toml ara, yukarı doğru ara (opsiyonel) */ }
export function loadProjectToml(path: string): ProjectToml { /* smol-toml parse + validate */ }
export function validateProjectToml(p: ProjectToml): string[] { /* hata listesi */ }
```

Validate: dependencies key regex `^[a-z0-9-]+\/[a-z0-9-]+$`, value semver range regex, boş değil.

### 5.5 `cli/src/commands/init.ts` (80 satır)

Şablonlar:
```ts
const TEMPLATES: Record<string, { toml: string; files: Record<string,string> }> = {
  skill: { toml: `[package]\nname = "{{name}}"\ntype = "skill"\n...`, files: { "SKILL.md": "# {{name}}\n..." } },
  mcp: { ... },
  agent: { ... },
}
```

`forge init` çalışma:
1. `name` arg yoksa `path.basename(cwd)` kullan.
2. `type` yoksa prompt (inquirer olmadan, readline ile basit seçim, `--yes` ise skill default).
3. `forge.toml` zaten varsa hata.
4. Dosyaları yaz.
5. `✓ created` mesajı.

### 5.6 `cli/src/commands/install.ts` (120 satır)

```
export async function installProject(opts: { frozen?: boolean }): Promise<void>
```
Adımlar:
1. `findProjectToml(cwd)` → yoksa hata.
2. `loadProjectToml` → dependencies al.
3. Eğer `forge.lock` var ve `--frozen` → lock'taki exact versiyonları kur.
4. Yoksa her dep için `resolveVersion(name, range)` → `ensurePackageContent` → `adapters` (config.defaultHarnesses veya detect) → `adapter.install`.
5. Dependencies'in dependencies'ini de kur (Faz 1'deki gibi 1 seviye DFS, Faz 3'te recursive).
6. `writeLinks` + `writeLock`.
7. Süre ölç, özet bas.

**Önemli:** `links.json`'a `project` field ekleme Faz 3'te opsiyonel, global links yeterli. Faz 4'te proje izolasyonu gerekirse ekle.

### 5.7 `cli/src/index.ts` Değişiklikleri

- `import { parse } from "smol-toml"` ekleme yok, sadece wiring.
- `program.command("install")`, `program.command("init")`, `program.command("update")`, `program.command("outdated")` ekle, her biri ilgili `commands/*.ts`'yi çağırsın.
- Mevcut `add/remove/list/doctor/search/info` 그대로 kalacak.

---

## 6. Test Stratejisi — Faz 3'te Manuel + Birim

- **Birim (opsiyonel, hızlı):** `cli/src/core/project.test.ts` — TOML parse valid/invalid, semver range, findProjectToml.
- **Manuel (zorunlu):**
  1. Boş klasörde `forge init my-skill --type skill --yes` → `my-skill/forge.toml` ve `SKILL.md` var mı?
  2. `my-app/forge.toml` oluştur (5 dep), `forge install` → `~/.forge/packages/*` oluştu mu, 5 harness'te link var mı, `forge list` 5 gösteriyor mu?
  3. `forge.toml`'da `mcp/github = "^1.0.0"` varken registry'de 1.0.1 çıkınca `forge outdated` → `1.0.0 → 1.0.1` gösteriyor mu, `forge update` → 1.0.1 kuruluyor mu?
  4. `forge install` ikinci kez çalıştır → `already installed` ve hızlı mı (<1s cache)?
  5. `forge.toml` yokken `forge install` → hata mesajı `forge init` öneriyor mu?

---

## 7. Gün Gün İş Planı (1–2 Gün)

### Gün 1 — Core + Init

**Sabah (09:00–12:00):**
- [ ] `npm i smol-toml` + `package.json` güncelle
- [ ] `cli/src/core/config.ts` yaz — load/save/default + test
- [ ] `cli/src/core/project.ts` yaz — find/load/validate
- [ ] `cli/src/commands/init.ts` yaz — 3 şablon (skill, mcp, agent), `--yes` destek

**Öğle (13:00–15:00):**
- [ ] `cli/src/index.ts`'e `forge init` wire + `npx tsx cli/src/index.ts init --help` test
- [ ] Boş `/tmp/test-init`'te `forge init my-skill --type skill --yes` → dosya var mı, `cat forge.toml` doğru mu?
- [ ] `mcp` ve `agent` type için de test

**Akşam (16:00–18:00):**
- [ ] `cli/src/core/lock.ts` yaz (basit)
- [ ] `cli/src/commands/install.ts` ilk taslak — tek dep kurulumu `forge add` ile aynı kodu reuse et
- [ ] `npx tsc --noEmit` → 0 error?

### Gün 2 — Install + Update + Cilalama

**Sabah (09:00–12:00):**
- [ ] `install.ts` tamamla — loop dependencies, adapters, links, lock, süre
- [ ] `cli/src/index.ts`'e `forge install` wire
- [ ] `my-app/forge.toml` oluştur (5 dep: anthropics/plan, mcp/filesystem, obra/superpowers, skill/pdf, agent/code-reviewer), `forge install` → 5 paket kuruldu mu, `forge list`?
- [ ] `forge install` tekrar → cache hit hızlı mı?

**Öğle (13:00–15:00):**
- [ ] `cli/src/commands/update.ts` yaz — `outdated` + `update [pkg]`
- [ ] `cli/src/index.ts`'e wire, `forge outdated` ve `forge update` test (mock: registry'de yeni versiyon ekle, outdated görmeli)
- [ ] `forge.toml` olmadan `forge install` → hata mesajı testi

**Akşam (16:00–18:00):**
- [ ] `docs/SPEC.md` ve `docs/PRD.md` ile uyum kontrol (proje `forge.toml` örneği doğru mu?)
- [ ] `README.md`'ye `forge install` quick start ekle (team sync bölümü)
- [ ] `npx tsc --noEmit`, `npm run registry:build --check`, `forge doctor` hepsi yeşil?
- [ ] Commit: `feat: forge install/init/update (Faz 3)` + `git push`

---

## 8. Doğrulama Kriterleri (Faz 3 Bitti Demek İçin)

| Kriter | Komut | Beklenen |
|--------|-------|----------|
| `forge init` skill | `mkdir /tmp/x && cd /tmp/x && forge init my-skill --type skill --yes && cat my-skill/forge.toml` | `name = "my-skill"`, `type = "skill"` var |
| `forge init` mcp | `forge init my-mcp --type mcp --yes && cat my-mcp/forge.toml` | `[mcp] command` var |
| `forge install` 5 dep | `cat forge.toml` (5 dep) → `forge install` → `forge list` | 5 package installed, her harness'te link var |
| `forge install` idempotent | `forge install` tekrar | `already installed` veya <1s, 0 hata |
| `forge outdated` | `forge outdated` | `1.0.0 → 1.2.0` gibi satır (eğer outdated varsa) |
| `forge update` | `forge update` | `updated X packages` |
| `forge.toml` yok hatası | `mkdir /tmp/empty && forge install` | `forge.toml not found, run forge init` |
| `config.toml` default | `cat ~/.forge/config.toml` | `registry = ...` var |
| `tsc --noEmit` | `npx tsc --noEmit` | 0 error |
| `registry:build --check` | `npm run registry:build -- --check` | exit 0 |

Hepsi yeşilse Faz 3 DONE.

---

## 9. Riskler ve Panzehirleri

| Risk | Olasılık | Etki | Panzehir |
|------|----------|------|----------|
| `smol-toml` ESM import sorunu (NodeNext) | Orta | Build fail | `import * as TOML from "smol-toml"` dene, olmazsa `@iarna/toml`'a geç, tsconfig `esModuleInterop` zaten true |
| Proje `forge.toml`'u paket `forge.toml` ile karışması | Yüksek | `forge install` yanlış dosyayı okur | `findProjectToml` önce `cwd/forge.toml`'da `[project]` veya `[dependencies]` var mı diye bak, `[package]` varsa "bu paket forge.toml'u, proje değil" uyarısı ver |
| `forge.lock` git conflict | Düşük | Merge zor | Lock'u optional yap, yoksa `forge.toml`'dan resolve et, presence zorunlu değil |
| Windows'ta `~/.forge/config.toml` yazma yetkisi | Düşük | Config oluşturulamaz | `ensureForgeDirs()` zaten var, `mkdir -p` ile oluştur |
| Adapter'da proje seviyesi `.opencode/skills` vs global `~/.config/opencode/skills` karışması | Orta | Install yanlış yere gider | `config.defaultHarnesses` boşsa `detectAdapters()` kullan, doluysa sadece onlar — Faz 1'deki mantığı reuse et |
| Kullanıcı `forge.toml`'u elle bozması (syntax error) | Yüksek | Parse fail | `loadProjectToml` try/catch + güzel hata mesajı `forge.toml:3: invalid TOML — ...` |

---

## 10. Faz 3 Sonrası — Takım Demo'su (Faz 3 Biter Bitmez)

- **Demo video (30 sn):** İki terminal yan yana, ikisinde `git clone my-app && cd my-app && forge install && forge list` aynı 20 paketi 3.2s'de kuruyor.
- **README update:** Quick Start'e "Team sync" bölümü:
  ```toml
  # forge.toml
  [dependencies]
  "anthropics/plan" = "^1.2.0"
  "mcp/github" = "^1.0.0"
  ```
  ```bash
  forge install # team sync
  ```
- **DM takımı:** Faz 3 biter bitmez 5 takım lead'ine "Forge'da takım senkronu geldi, `forge.toml`'u paylaşın" mesajı.

---

## 11. Dosya Değişiklik Özeti (Faz 3 PR'ı)

```
mod:  package.json (smol-toml dep)
new:  cli/src/core/config.ts
new:  cli/src/core/project.ts
new:  cli/src/core/lock.ts
new:  cli/src/commands/init.ts
new:  cli/src/commands/install.ts
new:  cli/src/commands/update.ts
mod:  cli/src/index.ts (4 yeni komut wiring + import)
new:  ~/.forge/config.toml (runtime'da oluşur, repo'da değil)
new:  my-project/forge.toml (örnek, repo'da docs/örnek olarak)
mod:  docs/SPEC.md (proje forge.toml örneği zaten var, teyit)
mod:  docs/ROADMAP.md (Faz 3 check)
mod:  README.md (team sync quick start)
```

**Tahmini LOC:** ~400 (core+commands) + wiring.

---

## 12. Kararlar (Onay Gereken 2 Nokta)

1. **Lock dosyası olsun mu?** Öneri: Evet, basit `forge.lock` (Faz 3'te), `forge install` lock varsa onu kullanır, yoksa `forge.toml`'dan resolve eder. Deterministik takım için şart. Onay?
2. **TOML parser hangisi?** Öneri: `smol-toml` (hafif, ESM, 0 dep). `@iarna/toml` daha yaygın ama CJS. `smol-toml` ile başla, sorun çıkarsa değiştir. Onay?

Onay verirsen Faz 3 kodlamasına geçiyorum — önce `config.ts` ve `project.ts`'yi yazıp `forge init`'i ayağa kaldırırım.

