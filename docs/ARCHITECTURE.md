# Forge — Architecture

## 1. Genel Mimari

```
+----------------+      +----------------+      +----------------+
|   CLI (Rust)   | ---> |   Registry     | ---> |  GitHub Repos  |
|  forge add     |      |  index.json    |      |  (source)      |
|  forge search  |      |  (R2/CDN)      |      |                |
+-------+--------+      +----------------+      +----------------+
        |
        v
+----------------+      +----------------+
|   Adapters     | ---> |  Harness FS    |
| claude,codex,  |      | ~/.claude/     |
| opencode,cursor|      | ~/.codex/      |
| dsh,generic    |      | .opencode/     |
+----------------+      +----------------+
        |
        v
+----------------+
|  Local Store   |
| ~/.forge/      |
|  packages/     |
|  cache/        |
|  config.toml   |
+----------------+
```

## 2. Bilesenler

### 2.1 CLI (Rust)

Neden Rust: Tek binary, hizli, cross-platform, `cargo install forge` ile dagitim.

```
crates/
  forge-cli/        # ana binary, clap ile komutlar
  forge-core/       # paket cozme, indirme, cache
  forge-registry/   # registry client (search, fetch index)
  forge-adapter/    # harness adapter trait + impl'lar
  forge-spec/       # forge.toml parser + validasyon
```

Alternatif v0.1: Node/TypeScript ile basla (hizli prototip), v0.2'de Rust'a gec. Karar: **v0.1 TypeScript (Bun)**, v0.2 Rust rewrite. Hizli cikmak icin.

### 2.2 Local Store

```
~/.forge/
  config.toml          # kullanici ayari (default harness'lar, registry url)
  packages/
    anthropics-plan@1.2.0/  # indirilen paket icerigi
    mcp-filesystem@2.0.1/
  links/
    claude-code -> ~/.claude/skills/  # symlink veya copy kaydi
  cache/
    index.json         # registry index cache
    tarballs/
```

`forge.toml` proje seviyesinde de olabilir (npm gibi):
```
my-project/
  forge.toml           # proje bagimliliklari
  .forge/              # proje local (opsiyonel)
```

### 2.3 Registry

**Git-native, merkeziyetsiz:**

- Her paket zaten bir GitHub repo'su. Registry sadece index.
- `registry/index.json`:
```json
{
  "packages": {
    "anthropics/plan": {
      "name": "anthropics/plan",
      "type": "skill",
      "description": "...",
      "versions": {
        "1.2.0": { "tarball": "https://github.com/anthropics/skills/releases/download/plan-1.2.0/plan.tar.gz", "sha256": "...", "engines": {...} },
        "1.1.0": { ... }
      },
      "latest": "1.2.0"
    }
  }
}
```

- Kaynak: GitHub Releases + `registry/packages/<name>.json` (PR ile eklenir)
- CDN: Cloudflare R2 + `registry.forge.sh/index.json`
- Search: Algolia veya basit `search.json` + flexsearch (offline)

**Publish akisi:**
1. Yazar `forge publish` der
2. CLI `forge.toml` validate eder, tarball olusturur, GitHub Release acar
3. Registry repo'suna PR acar (`registry/packages/anthropics-plan.json` eklenir)
4. Bot merge eder -> R2'ye deploy -> CDN invalid

v0.1'de registry = bu repo'nun `registry/` klasoru (dogfooding), sonradan ayri repo.

### 2.4 Adapter Sistemi

```typescript
interface Adapter {
  name: string; // "claude-code"
  detect(): boolean; // harness kurulu mu?
  install(pkg: Package, files: string[]): void;
  uninstall(pkg: string): void;
  list(): string[]; // kurulu paketler
  mcpConfigPath(): string; // mcp.json yeri
}
```

Her adapter harness'in bekledigi dosya duzenine kopyalar/symlink atar.

- Skill: `SKILL.md` -> `~/.claude/skills/<name>/SKILL.md`
- MCP: `mcp.json` entry ekler
- Plugin: harness plugin klasorune kopyalar
- Agent: `agents/<name>.md` -> ilgili klasor

### 2.5 Dependency Cozme

npm benzeri: `forge add A` -> A'nin dependencies'ini de kur. Semver `^`, `~`, `*` destekle. Basit DFS, conflict'te en yuksek versiyonu sec (v0.1).

## 3. Guvenlik

- `forge.toml` sha256 ile imzali (tarball hash)
- `forge audit` -> bilinen zafiyetli paketleri isaretle
- `forge doctor` -> supheli dosya (executable, network call) uyar
- Publish icin GitHub OIDC (sadece repo owner publish edebilir)

## 4. Performans

- Index cache: 5 dk TTL, `forge update --refresh` ile force
- Tarball cache: `~/.forge/cache/tarballs/`
- Paralel indirme (p-limit)
- Shallow clone (sadece tag)

## 5. Dagitim

- `npm i -g forge` (Bun build)
- `cargo install forge` (Rust build)
- `brew install forge` (tap)
- `winget install forge`
- GitHub Releases binary (curl | sh)

## 6. Teknoloji Secimleri

| Bilesen | v0.1 | v0.2 |
|---------|------|------|
| CLI | TypeScript + Bun (hizli) | Rust |
| Registry | JSON + R2 | + Algolia search |
| Publish | GitHub Action | + OIDC |
| Test | Vitest | + Rust test |

## 7. Klasor Yapisi (repo)

```
forge/
  docs/               # bu belgeler
  registry/           # index.json + packages/*.json
  packages/           # ornek paketler (dogfooding)
  cli/                # CLI kaynagi (TypeScript/Rust)
  adapters/           # harness adapter'lari
  scripts/            # publish, sync scriptleri
  .github/workflows/  # CI, registry deploy
  forge.toml          # forge'un kendi bagimliliklari (self-hosting)
```
