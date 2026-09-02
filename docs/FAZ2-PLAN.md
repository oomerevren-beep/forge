# FAZ 2 — 100 Paket Seed: Detaylı Plan (3 → 100)

> Hedef: `forge search pdf` boş dönmüyor. 100 paket, `forge search` <500ms, her `forge info` doğru.  
> Süre: 2 gün. Star etkisi: 0→200. Çıktı: Registry gerçek bir keşif aracı.

**Durum:** Faz 1 bitti — `forge add` 5 harness'te çalışıyor (symlink/copy, MCP inject, semver). Registry'de 3 paket var (anthropics/plan, mcp/filesystem, obra/superpowers), sha256'lar placeholder, `index.json` elle yazılmış, `search` şu an `String.includes` (100'de yavaşlar). Faz 2 bunu 100'e çıkarır.

---

## 1. Neden 100? Neden Şimdi?

- **Keşif eşiği:** 3 pakette `search` demo'su ölür. 100 pakette her sorgu 3–10 sonuç döner → kullanıcı "burası market" hisseder.
- **HN öncesi şart:** Faz 1'de HN'e çıksan "3 paket mi?" diye gömülürsün. 100 paket = ciddiyet sinyali.
- **Viral loop ateşleyici:** Paket sayısı 100 olunca, paket yazarlarına DM: "Paketin Forge'da, `forge add senin/paketin` de" — 20 DM = 5 star, 100 DM = 50 star.
- **Teknik eşik:** 100 paket `includes` ile idare eder ama `flexsearch`'e geçişi haklı çıkarır, `registry:build`'i test eder.

---

## 2. Fotoğraf — Şu Anki Registry

```
registry/
  index.json (3 paket, count=3, generatedAt elle)
  packages/
    anthropics-plan.json (2 versiyon, placeholder sha)
    mcp-filesystem.json (1 versiyon, mcp.command)
    obra-superpowers.json (1 versiyon)
```

**Sorunlar:**
1. `index.json` elle, `search.json` yok, `stats.json` yok.
2. sha256'lar `placeholder-*` → download gerçekte mock fallbacks (Faz 1'de mock generation vardı, o yüzden çalışıyor ama gerçek değil).
3. `scripts/seed-registry.ts` ve `scripts/build-registry.ts` yok (package.json'da script var ama dosya yok).
4. `forge search` = `Object.values(index.packages).filter(includes)` → 100'de O(n) ama yeterli değil, flexsearch lazım.
5. Paket şeması `REGISTRY.md` ile uyumlu ama `latest`/`versions` array/object tutarsızlığı var (index'de array, package'da object).

---

## 3. Hedef Mimari — Faz 2 Sonrası

```
registry/
  index.json          # { generatedAt, count:100, packages: { "a/b": { name, type, description, latest, versions:[], keywords, updatedAt } } }
  search.json         # [ { name, type, description, keywords, latest } ] — flexsearch offline index için düz liste
  stats.json          # { totalPackages:100, byType: {skill:40,mcp:25,...}, updatedAt }
  packages/
    anthropics-*.json (12)
    mcp-*.json (22)
    obra-*.json (1)
    vercel-*.json / community-*.json (65)
```

**Kurallar:**
- Her `packages/<slug>.json` = tek kaynak (detail). `index.json` ve `search.json` buradan üretilir, elle düzenlenmez.
- `scripts/build-registry.ts` = `packages/*.json` → `index.json` + `search.json` + `stats.json` + doğrulama (sha256 placeholder kontrolü, latest var mı, semver valid mi).
- CI: `bun run registry:build --check` → index ile packages uyumlu mu? Uyumsuzsa fail.

---

## 4. 100 Paket Listesi — Kategori Kategori (97 yeni + 3 mevcut)

### Kategori A — anthropics/* (12 paket) — Monorepo `anthropics/skills`
Kaynak: `https://github.com/anthropics/skills` → `skills/<name>/SKILL.md`

| # | Paket | Type | Description | source | Tarball |
|---|-------|------|-------------|--------|---------|
| 1 | anthropics/plan | skill | Plan mode — structured planning | skills/plan | releases/plan-1.2.0 |
| 2 | anthropics/brainstorm | skill | Brainstorm before coding | skills/brainstorming | ... |
| 3 | anthropics/tdd | skill | Test-driven development | skills/tdd | ... |
| 4 | anthropics/code-review | skill | Code review checklist | skills/code-review | ... |
| 5 | anthropics/debug | skill | Systematic debugging | skills/debugging | ... |
| 6 | anthropics/git | skill | Git workflow helper | skills/git | ... |
| 7 | anthropics/frontend | skill | Frontend design | skills/frontend-design | ... |
| 8 | anthropics/api | skill | API design | skills/api-design | ... |
| 9 | anthropics/mcp-builder | skill | MCP server builder | skills/mcp-builder | ... |
|10 | anthropics/skill-creator | skill | Create new skills | skills/skill-creator | ... |
|11 | anthropics/vercel-deploy | skill | Vercel deploy | skills/vercel | ... |
|12 | anthropics/notion | skill | Notion integration | skills/notion | ... |

> Not: Gerçek repo'da 10+ skill var, isimler yaklaşık. Script `GitHub API /contents/skills` ile otomatik keşfedecek, elle listeye bağımlı değil.

### Kategori B — mcp/* (22 paket) — `modelcontextprotocol/servers`
Kaynak: `https://github.com/modelcontextprotocol/servers` → `src/<name>`

| # | Paket | Type | MCP command | Keywords |
|---|-------|------|-------------|----------|
|13| mcp/filesystem | mcp | npx -y @modelcontextprotocol/server-filesystem /tmp | filesystem | ✅ mevcut, güncelle sha gerçek |
|14| mcp/github | mcp | npx -y @modelcontextprotocol/server-github | github |
|15| mcp/memory | mcp | npx -y @modelcontextprotocol/server-memory | memory |
|16| mcp/fetch | mcp | npx -y @modelcontextprotocol/server-fetch | fetch |
|17| mcp/brave-search | mcp | npx -y @modelcontextprotocol/server-brave-search | search |
|18| mcp/postgres | mcp | npx -y @modelcontextprotocol/server-postgres | postgres |
|19| mcp/sqlite | mcp | npx -y @modelcontextprotocol/server-sqlite | sqlite |
|20| mcp/slack | mcp | npx -y @modelcontextprotocol/server-slack | slack |
|21| mcp/puppeteer | mcp | npx -y @modelcontextprotocol/server-puppeteer | browser |
|22| mcp/google-maps | mcp | npx -y @modelcontextprotocol/server-google-maps | maps |
|23| mcp/everart | mcp | npx -y @modelcontextprotocol/server-everart | image |
|24| mcp/sequential-thinking | mcp | npx -y @mcp/server-sequential-thinking | reasoning |
|25| mcp/time | mcp | npx -y @modelcontextprotocol/server-time | time |
|26| mcp/git | mcp | npx -y @modelcontextprotocol/server-git | git |
|27| mcp/notion | mcp | npx -y @modelcontextprotocol/server-notion | notion |
|28| mcp/airtable | mcp | npx -y @modelcontextprotocol/server-airtable | airtable |
|29| mcp/linear | mcp | npx -y @modelcontextprotocol/server-linear | linear |
|30| mcp/sentry | mcp | npx -y @modelcontextprotocol/server-sentry | sentry |
|31| mcp/gdrive | mcp | npx -y @modelcontextprotocol/server-gdrive | gdrive |
|32| mcp/aws-kb | mcp | npx -y @modelcontextprotocol/server-aws-kb | aws |
|33| mcp/kubernetes | mcp | npx -y @modelcontextprotocol/server-kubernetes | k8s |
|34| mcp/redis | mcp | npx -y @modelcontextprotocol/server-redis | redis |

### Kategori C — obra + superpowers + agency (8 paket)

| # | Paket | Type |
|---|-------|------|
|35| obra/superpowers | skill | ✅ mevcut |
|36| obra/superpowers-brainstorm | skill | superpowers alt modül (ayrı paket gibi) |
|37| agency/frontend-wizard | agent | Frontend React/Tailwind |
|38| agency/backend-wizard | agent | Backend Node/TS |
|39| agency/devops-wizard | agent | DevOps/Docker |
|40| agency/data-wizard | agent | Data/ML |
|41| vercel/nextjs-skill | skill | Next.js best practices |
|42| vercel/ai-sdk-skill | skill | Vercel AI SDK |

### Kategori D — Community / Viral (28 paket) — Seed'in kalbi

| # | Paket | Type | Kaynak ilham |
|---|-------|------|--------------|
|43| taste/skill | skill | taste — good taste |
|44| last30days/skill | skill | community |
|45| humans/skill | skill | community |
|46| dotprompt/react-best | skill | prompt library |
|47| dotprompt/python-best | skill | prompt library |
|48| playwright/skill | skill | browser automation |
|49| shadcn/skill | skill | UI components |
|50| tailwind/skill | skill | CSS |
|51| supabase/skill | skill | DB |
|52| stripe/skill | skill | payments |
|53| openai/skill | skill | OpenAI |
|54| anthropic/skill | skill | Anthropic docs |
|55| langchain/skill | skill | LangChain |
|56| vercel/ship | skill | Ship fast |
|57| linear/skill | skill | Issue mgmt |
|58| notion/skill | skill | Notion |
|59| figma/skill | skill | Design |
|60| github/skill | skill | GH CLI |
|61| docker/skill | skill | Containers |
|62| k8s/skill | skill | Kubernetes |
|63| testing/skill | skill | Testing |
|64| refactoring/skill | skill | Refactor |
|65| docs/skill | skill | Documentation |
|66| seo/skill | skill | SEO |
|67| a11y/skill | skill | Accessibility |
|68| i18n/skill | skill | Internationalization |
|69| security/skill | skill | Security audit |
|70| performance/skill | skill | Perf |

### Kategori E — Command / Hook / Plugin (30 paket) — 6 tipi göstermek için

| # | Paket | Type | Invocation |
|---|-------|------|------------|
|71| cmd/plan | command | /plan |
|72| cmd/review | command | /review |
|73| cmd/test | command | /test |
|74| cmd/deploy | command | /deploy |
|75| cmd/brainstorm | command | /brainstorm |
|76| hook/pre-commit | hook | pre-commit |
|77| hook/post-tool | hook | post-tool |
|78| hook/pre-push | hook | pre-push |
|79| plugin/dsh-desktop | plugin | dsh/desktop |
|80| plugin/opencode-lsp | plugin | opencode/lsp |
|81| plugin/cursor-rules | plugin | cursor/rules |
|82| agent/code-reviewer | agent | subagent |
|83| agent/test-writer | agent | subagent |
|84| agent/docs-writer | agent | subagent |
|85| agent/refactor-bot | agent | subagent |
|86| mcp/custom-weather | mcp | custom |
|87| mcp/custom-crypto | mcp | custom |
|88| skill/pdf | skill | PDF işleme |
|89| skill/csv | skill | CSV işleme |
|90| skill/image | skill | Image gen |
|91| skill/video | skill | Video |
|92| skill/audio | skill | Audio |
|93| skill/3d | skill | 3D |
|94| skill/email | skill | Email |
|95| skill/calendar | skill | Calendar |
|96| skill/search | skill | Search |
|97| skill/research | skill | Research |
|98| skill/writing | skill | Writing |
|99| skill/translate | skill | Translate |
|100| skill/summarize | skill | Summarize |

> 100 tam. Faz 3'te 500'e çıkarken bu liste awesome-xxx scrape ile otomatik büyüyecek.

---

## 5. Teknik Tasarım — Script'ler

### 5.1 `scripts/seed-registry.ts` (yeni, ~150 satır)

**Görev:** Yukarıdaki 97 yeni paketi `registry/packages/<slug>.json` olarak üret (idempotent, varsa skip).

**Girdi:** Hardcoded liste (bu plandaki tablo) + GitHub API'den canlı veri birleştirme opsiyonel.

**Mantık:**
```ts
for (const pkg of CATALOG) {
  const slug = pkg.name.replace("/", "-");
  const path = `registry/packages/${slug}.json`;
  if (existsSync(path)) continue; // idempotent
  const detail = {
    name: pkg.name,
    type: pkg.type,
    description: pkg.description,
    homepage: `https://github.com/${pkg.name}`,
    repository: `https://github.com/${pkg.name}`,
    keywords: pkg.keywords,
    ...(pkg.source ? { source: pkg.source } : {}),
    versions: {
      [pkg.version]: {
        version: pkg.version,
        tarball: pkg.tarball, // GitHub Releases URL (gerçek repo varsa gerçek, yoksa forge repo'da mock release)
        sha256: "placeholder-sha256-" + slug, // Faz 2'de placeholder kalabilir, Faz 3'te gerçek sha
        engines: pkg.engines ?? { "*": "*" },
        dependencies: pkg.deps ?? {},
        ...(pkg.mcp ? { mcp: pkg.mcp } : {}),
        publishedAt: new Date().toISOString(),
      }
    },
    latest: pkg.version,
  };
  writeFileSync(path, JSON.stringify(detail, null, 2));
}
```

**Sha stratejisi:** Faz 2'de `placeholder-*` kalması sorun değil — `installer.ts` zaten mock fallback yapıyor. Ama `index.json`'da placeholder olduğu belli olsun diye `scripts/build-registry.ts` uyarı bassın, Faz 3'te gerçek sha'ya geçiş planı olsun.

**Çalıştırma:** `npm run seed` → `tsx scripts/seed-registry.ts`

### 5.2 `scripts/build-registry.ts` (yeni, ~120 satır)

**Görev:** `registry/packages/*.json` → `index.json` + `search.json` + `stats.json`

**Adımlar:**
1. `readdir registry/packages/*.json`, her birini `JSON.parse`, validate (name regex, semver, type enum, description 10–200, latest var mı)
2. `index.json` üret:
```json
{ "generatedAt": "2026-09-02T...", "count": 100, "packages": { "anthropics/plan": { name, type, description, latest, versions: ["1.2.0"], keywords, updatedAt } } }
```
`versions` array sort desc semver, `updatedAt` = en yeni publishedAt.

3. `search.json` üret: düz array `[{ name, type, description, keywords, latest }]` — flexsearch offline için.

4. `stats.json` üret: `{ totalPackages, byType: {skill:58,mcp:24,agent:6,command:5,hook:3,plugin:4}, updatedAt }`

5. Doğrulama (`--check` modu): diskteki `index.json` ile üretilen `index.json` diff, farklıysa exit 1 (CI fail).

6. Placeholder uyarısı: `sha256.startsWith("placeholder")` olanları say, `console.warn` ile listele.

**Çalıştırma:** `npm run registry:build` (build) ve `npm run registry:build -- --check` (CI).

### 5.3 `cli/src/core/search.ts` (yeni, ~60 satır) — flexsearch entegrasyonu

**Şu an:** `searchPackages()` = `includes` filtresi.

**Faz 2'de:** `flexsearch` ile offline index.

```ts
import FlexSearch from "flexsearch";
let index: FlexSearch.Index;
function getIndex() {
  if (index) return index;
  index = new FlexSearch.Index({ tokenize: "forward", encode: "icase" });
  const pkgs = Object.values(loadIndex().packages);
  pkgs.forEach((p, i) => index.add(i, `${p.name} ${p.description} ${p.keywords?.join(" ")}`));
  return index;
}
export function searchPackagesFlex(query: string) {
  const ids = getIndex().search(query);
  // map ids to packages
}
```

Ama 100 pakette `includes` bile <50ms, flexsearch overkill. Faz 2'de **önce ölç, sonra geç**: `search` 500ms altında kalıyorsa `includes` kalabilir, `search.json` + `flexsearch` şimdilik sadece dosya olarak üretilsin, CLI'da aktif kullanılması Faz 3'e kalsın. Bu planda `search.json` üretilir ama CLI hala `includes` kullanır (risk azaltma).

---

## 6. Gün Gün İş Planı (2 Gün)

### Gün 1 — Üretim

**Sabah (09:00–12:00):**
- [ ] `scripts/seed-registry.ts` yaz — katalog hardcoded (bu plandaki 97), idempotent, `toSlug` helper
- [ ] `npm run seed` çalıştır → 97 dosya `registry/packages/*.json` oluştu mu kontrol
- [ ] `git status` → 97 untracked file görünmeli
- [ ] İlk 5 paketi elle `forge add` ile test: `anthropics/brainstorm`, `mcp/github`, `skill/pdf`, `cmd/plan`, `agent/code-reviewer` (mock generation çalışıyor mu?)

**Öğle (13:00–15:00):**
- [ ] `scripts/build-registry.ts` yaz — `index.json` + `search.json` + `stats.json` üret
- [ ] `npm run registry:build` → `index.json` count 100 oldu mu? `search.json` 100 entry?
- [ ] `npx tsx cli/src/index.ts search pdf` → en az 3 sonuç (skill/pdf, vb.)
- [ ] `npx tsx cli/src/index.ts search mcp` → 20+ sonuç
- [ ] `npx tsx cli/src/index.ts search skill` → 50+ sonuç

**Akşam (16:00–18:00):**
- [ ] CI düzelt: `.github/workflows/ci.yml`'de `registry:build --check` çalışıyor mu?
- [ ] `npx tsc --noEmit` → PASS?
- [ ] `forge add` ile 10 rastgele paket daha test (her kategoriden 2)
- [ ] Placeholder sha uyarı listesini çıkar, not et

### Gün 2 — Cilalama + Doğrulama

**Sabah (09:00–12:00):**
- [ ] `cli/src/core/registry.ts`'de `searchPackages` için `flexsearch` hazırlığı (import ekle, fallback `includes`)
- [ ] `forge search --type mcp plan` gibi filtre testi (PRD'deki `--type` filtresi zaten var, doğrula)
- [ ] `forge info <her tipten 1>` → 6 tipin her biri için doğru mu?
- [ ] `forge add` ile dependency testi (eğer bir paket `obra/superpowers`'a bağımlıysa, deps kuruluyor mu?)

**Öğle (13:00–15:00):**
- [ ] `docs/REGISTRY.md` ve `docs/ROADMAP.md` güncelle — "100 paket seed tamamlandı"
- [ ] README'de paket sayısı 3→100 güncelle (badge gibi)
- [ ] `npm run registry:build -- --check` ile CI simülasyonu
- [ ] 100 pakette `forge search` benchmark: `time npx tsx cli/src/index.ts search a` → <500ms?

**Akşam (16:00–18:00):**
- [ ] Soft test: 3 farklı makinede/VM'de `forge search` ve `forge add` (Windows + WSL)
- [ ] `git diff registry/index.json` → count 100, generatedAt güncel
- [ ] Commit: `registry: seed 100 packages (Faz 2)` + push
- [ ] Sonraki faz (Faz 3: forge install + forge.toml) için hazırlık notu yaz

---

## 7. Doğrulama Kriterleri (Faz 2 Bitti Demek İçin)

| Kriter | Komut | Beklenen |
|--------|-------|----------|
| 100 paket dosyası var | `ls registry/packages/*.json \| wc -l` | 100 |
| index.json count 100 | `cat registry/index.json \| grep count` | `"count": 100` |
| search.json 100 entry | `cat registry/search.json \| jq length` | 100 |
| `forge search pdf` boş değil | `npx tsx cli/src/index.ts search pdf` | ≥3 sonuç (skill/pdf vb.) |
| `forge search mcp` | `... search mcp` | ≥20 sonuç |
| `forge search --type skill` | `... search --type skill plan` | filtre çalışıyor |
| `forge info` her tip | `... info mcp/github`, `... info cmd/plan` | doğru detail |
| `forge add` 3 farklı paket | `... add skill/pdf` + `list` + `doctor` | store'da dir var, harness'te link var |
| `registry:build --check` | `npm run registry:build -- --check` | exit 0 |
| `tsc --noEmit` | `npx tsc --noEmit` | 0 error |
| CI yeşil | `gh run list` | validate + registry job pass |

Hepsi yeşilse Faz 2 DONE. Değilse Faz 2 devam.

---

## 8. Riskler ve Panzehirleri

| Risk | Olasılık | Etki | Panzehir |
|------|----------|------|----------|
| GitHub API rate limit (seed sırasında) | Orta | Seed yarım kalır | Hardcoded katalog kullan, API opsiyonel, fallback elle |
| Placeholder sha ile tarball download fail | Yüksek | Mock fallback var, ama kullanıcı "gerçek mi?" der | Faz 2'de mock yeterli, `installer.ts` zaten fallback yapıyor, README'de "mock" belirt |
| Paket ismi çakışması (`anthropics/plan` zaten var) | Düşük | Overwrite | `seed` idempotent, `existsSync` skip |
| `search` 100'de yavaşlar | Düşük | <500ms hedefi aşılır | `includes` 100'de ~10ms, sorun yok, flexsearch Faz 3'e ertele |
| 100 paket elle yazım hatası (description çok kısa, type yanlış) | Orta | Validate fail | `build-registry.ts` validate, hatalı dosyayı atla + warn |
| CI'da `index.json` drift | Orta | PR fail | `build --check` mode, pre-commit hook ekle (opsiyonel) |

---

## 9. Faz 2 Sonrası — Viral Tetikleyici (Faz 2 Bittiğinde Yapılacak)

- DM şablonu (Faz 2 biter bitmez 20 kişiye):  
  > "Merhaba [isim], Forge'da paketin `[pkg]` artık `forge add [pkg]` ile tek komutla 5 harness'te kuruluyor. 100 paket arasındasın. İstersen `forge publish` ile kendin yönetebilirsin — 2 dk. Starlarsan sevinirim: github.com/oomerevren-beep/forge"

- Tweet:  
  > "Forge now has 100 packages. `forge search pdf` → 5 results. `forge add skill/pdf` → Claude + Codex + OpenCode + Cursor in 3s. The npm for AI agents is here."

- HN'e henüz çıkma — Faz 5'e kadar bekle (README demo gif'i yoksa çıkma).

---

## 10. Dosya Değişiklik Özeti (Faz 2 PR'ı Neleri İçerir?)

```
new:  scripts/seed-registry.ts
new:  scripts/build-registry.ts
new:  cli/src/core/search.ts (veya registry.ts içine flexsearch)
mod:  cli/src/core/registry.ts (searchPackages güncelle, search.json desteği)
mod:  package.json (seed script, flexsearch dep)
new:  registry/packages/*.json (97 yeni)
mod:  registry/index.json (3→100)
new:  registry/search.json
new:  registry/stats.json
mod:  docs/REGISTRY.md (100 paket notu)
mod:  docs/ROADMAP.md (Faz 2 check)
mod:  docs/100K-PLAN.md (Faz 1 DONE işareti — opsiyonel)
mod:  README.md (paket sayısı 100)
```

**Tahmini LOC:** ~400 (script'ler) + 97*~20 satır JSON = ~2k satır, ama çoğu generated.

---

## 11. Karar Bekleyenler (Sen Seç)

1. **Sha gerçek mi placeholder mı?** Öneri: Faz 2'de placeholder kalsın (hızlı), Faz 3'te GitHub Releases'ten gerçek sha çekme ekle. Onay?
2. **Paket listesi 100 tam bu mu, yoksa sen 10 paket ekle/çıkar mı istiyorsun?** Özellikle community 30'u sana göre özelleştirebiliriz (Türkçe paketler? Örn. `tr/skill`?).
3. **Flexsearch şimdi mi Faz 3'te mi?** Öneri: Faz 2'de sadece `search.json` üret, CLI hala `includes`, Faz 3'te flexsearch aktif. Onay?

Onay verirsen Faz 2 kodlamasına geçiyorum — ilk `seed-registry.ts`'yi yazıp 100'e çıkarırım.

