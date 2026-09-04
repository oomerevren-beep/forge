# Forge — Architecture

## 1. Overview

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

## 2. Components

### 2.1 CLI (TypeScript v0.1 → Rust v0.2)

Why Rust (target): single binary, fast, cross-platform, `cargo install forge` distribution.

```
crates/ (v0.2 target)
  forge-cli/        # main binary, commands via clap
  forge-core/       # package resolution, download, cache
  forge-registry/   # registry client (search, fetch index)
  forge-adapter/    # harness adapter trait + impls
  forge-spec/       # forge.toml parser + validation
```

Shipped v0.1 in TypeScript for speed (prototype), Rust rewrite in v0.2.
Zero-install: `npx forge add <pkg>` runs the bundled `dist/index.cjs`
(esbuild single file, no global install).

```
dist/
  index.cjs           # esbuild bundle — the published bin (./dist/index.cjs)
  cli/...             # tsc emit (types + CI)
```

### 2.2 Local Store

```
~/.forge/
  config.toml          # user settings (default harnesses, registry url)
  packages/
    anthropics-plan@1.2.0/  # downloaded package content
    mcp-filesystem@2.0.1/
  links/
    claude-code -> ~/.claude/skills/  # symlink or copy record
  cache/
    index.json         # registry index cache
    tarballs/
```

`forge.toml` may also live at project level (like npm):
```
my-project/
  forge.toml           # project dependencies
  .forge/              # project-local (optional)
```

### 2.3 Registry

**Git-native, decentralized:**

- Every package is already a GitHub repo. The registry is only an index.
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

- Source: GitHub Releases + `registry/packages/<name>.json` (added via PR)
- CDN: Cloudflare R2 + `registry.forge.sh/index.json`
- Search: offline `search.json` (CLI); Algolia deferred to v0.2+

**Publish flow:**
1. Author runs `forge publish`
2. CLI validates `forge.toml`, builds the tarball, opens a GitHub Release
3. Opens a PR to the registry repo (`registry/packages/anthropics-plan.json` added)
4. Bot merges -> deploys to R2 -> CDN invalidate

In v0.1 the registry is this repo's `registry/` folder (dogfooding), later a separate repo.

### 2.4 Adapter System (Phase 2)

One file per harness (`cli/src/adapters/<name>.ts`), shared mechanics in
`cli/src/adapters/base.ts` (scope resolution, list/isInstalled loops,
rule-file sync), shared project rules in `agents-md.ts`.

```typescript
interface Adapter {
  name: string; // "claude-code"
  detect(): boolean; // is the harness installed?
  install(pkg: string, srcDir: string, type: string, meta?: PackageMeta): void;
  uninstall(pkg: string, type: string): void;
  list(): Promise<string[]>; // installed packages
  mcpConfigPath(): string | null; // mcp.json location
}
```

Rule files per harness (2026 formats, non-destructive merge via
`core/merge.ts` — `<!-- FORGE:START/END -->` blocks, user content untouched):

| Harness | Skills | Rules | MCP |
|---|---|---|---|
| claude-code | `~/.claude/skills|agents|…/` (type-aware) | `<project>/CLAUDE.md` (merged block) | `~/.claude.json` |
| cursor | `<scope>/skills/` (legacy) | `<scope>/rules/<slug>.mdc` (frontmatter) | `<scope>/mcp.json` |
| windsurf | `<scope>/skills/` | `<project>/.windsurfrules` (merged) | `<project>/.windsurf/mcp_config.json` or `~/.codeium/windsurf/mcp_config.json` |
| opencode | `.opencode/skills/` or `~/.config/opencode/skills/` | `<project>/AGENTS.md` (merged) | `opencode.json` |
| codex | `~/.codex/skills/` | `<project>/AGENTS.md` (merged) | `~/.codex/mcp.json` |
| dsh | `<scope>/skills/` | `<project>/AGENTS.md` (merged) | `<scope>/mcp.json` |
| generic | `./.forge/packages/` | — | `./.forge/mcp.json` |

Each adapter copies/symlinks into the layout its harness expects.

- Skill: `SKILL.md` -> `~/.claude/skills/<name>/SKILL.md`
- MCP: appends an `mcp.json` entry
- Plugin: copies into the harness plugin folder
- Agent: `agents/<name>.md` -> matching folder

### 2.5 Dependency Resolution

Like npm: `forge add A` also installs A's dependencies. Semver `^`, `~`, `*`
supported. Simple DFS, highest version wins on conflict (v0.1).

## 3. Security

- `forge.toml` pinned by sha256 (tarball hash)
- `forge audit` -> flags known-vulnerable packages
- `forge doctor` -> warns on suspicious files (executables, network calls)
- Publishing via GitHub OIDC (only the repo owner can publish)
- `forge install --frozen` -> integrity barrier: yanked versions and hash
  drift refuse the install (see `docs/SPEC.md` §4)

## 4. Performance

- Index cache: 5 min TTL, `forge update --refresh` to force
- Tarball cache: `~/.forge/cache/tarballs/`
- Parallel downloads (p-limit)
- Shallow clone (tag only)
- CLI startup: single-file esbuild bundle (`node dist/index.cjs --version`
  ~0.15s on Windows vs ~3.1s via tsx — 20x; node runtime floor ~0.10s,
  bundle overhead ~0.05s)

## 5. Distribution

- `npx forge ...` / `bunx forge ...` (zero-install, recommended for trying)
- `npm i -g tryforge` (global)
- `cargo install forge` (Rust build, v0.2)
- `brew install forge` (tap)
- `winget install forge`
- GitHub Releases binary (curl | sh)

## 6. Tech Choices

| Component | v0.1 | v0.2 |
|---------|------|------|
| CLI | TypeScript + tsx (fast) | Rust |
| Bundle | esbuild single file | cargo |
| Registry | JSON + R2 | + Algolia search |
| Publish | GitHub Action | + OIDC |
| Test | node:test + tsx | + Rust test |

## 7. Repo Layout

```
forge/
  docs/               # these documents
  registry/           # index.json + packages/*.json
  packages/           # sample packages (dogfooding)
  cli/                # CLI source (TypeScript/Rust)
  adapters/           # (see cli/src/adapters/) harness adapters
  scripts/            # publish, sync scripts
  .github/workflows/  # CI, registry deploy
  forge.toml          # forge's own dependencies (self-hosting)
```
