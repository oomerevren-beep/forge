# Forge — Registry Design

## 1. Ilke

Registry = sadece index. Kaynak GitHub'da kalir. Forge tarball'i GitHub Release'den ceker. Merkeziyetsiz, fork'lanabilir.

## 2. Yapi

```
registry/
  index.json              # tum paketlerin ozeti (CDN'de)
  search.json             # search icin duzlestirilmis liste
  packages/
    anthropics-plan.json  # paket detay (versiyonlar)
    mcp-filesystem.json
    obra-superpowers.json
  stats.json              # indirme sayilari (opsiyonel)
```

### index.json (ozet, ~100KB)

```json
{
  "generatedAt": "2026-09-01T00:00:00Z",
  "count": 124,
  "packages": {
    "anthropics/plan": {
      "name": "anthropics/plan",
      "type": "skill",
      "description": "Plan mode skill",
      "latest": "1.2.0",
      "versions": ["1.2.0", "1.1.0", "1.0.0"],
      "keywords": ["planning"],
      "updatedAt": "2026-08-30T12:00:00Z"
    }
  }
}
```

### packages/<slug>.json (detay)

```json
{
  "name": "anthropics/plan",
  "type": "skill",
  "description": "Plan mode skill",
  "homepage": "https://github.com/anthropics/skills",
  "repository": "https://github.com/anthropics/skills",
  "author": "Anthropic",
  "keywords": ["planning"],
  "versions": {
    "1.2.0": {
      "version": "1.2.0",
      "tarball": "https://github.com/anthropics/skills/releases/download/plan-1.2.0/plan-1.2.0.tar.gz",
      "sha256": "abc123...",
      "engines": { "claude-code": ">=1.0.0" },
      "dependencies": {},
      "publishedAt": "2026-08-30T12:00:00Z"
    }
  },
  "latest": "1.2.0"
}
```

## 3. Publish Akisi

```
Yazar: forge publish
  1. forge.toml validate
  2. tarball olustur (files.include)
  3. sha256 hesapla
  4. GitHub Release olustur (gh release create v1.2.0 tarball)
  5. registry/packages/<slug>.json guncelle (lokal)
  6. PR ac: registry/packages/<slug>.json -> forge/registry repo
     veya dogrudan push (maintainer ise)
  7. CI: index.json ve search.json'u yeniden olustur
  8. R2'ye deploy + CDN purge
```

v0.1'de adim 6 = bu repo'ya PR (tek repo, basit).

## 4. Search

- Offline: `search.json` + `flexsearch` (CLI'de)
- Online (v0.2): Algolia veya Typesense
- `forge search <query>` -> `search.json`'i filtreler (description, keywords, name)

## 5. Versiyonlama

- Semver zorunlu
- `latest` = en yuksek semver (prerelease haric)
- `next` tag (opsiyonel, beta icin)

## 6. Guvenlik

- Her versiyon `sha256` ile pin'li
- Publish sadece repo owner (GitHub OIDC dogrulama)
- `registry/packages/*.json` degisikligi CI'da `forge.toml` ile cross-check edilir

## 7. Mirror / Fork

Herkes registry'yi fork'layip kendi `registry.forge.sh` yerine `registry.mycompany.com` kullanabilir:

```toml
# ~/.forge/config.toml
registry = "https://registry.mycompany.com/index.json"
```

Private registry icin ayni format.

## 8. Baslangic Seed (v0.1 icin 100 paket)

- `anthropics/*` (10+ skill)
- `obra/superpowers`
- `mcp/*` (filesystem, github, memory, fetch, etc. 20+)
- `agency/*` (frontend, backend, etc.)
- `awesome-llm-apps` icerisinden secmeler
- Community: `taste-skill`, `last30days-skill`, vb.

Script: `scripts/seed-registry.ts` ile otomatik port.
