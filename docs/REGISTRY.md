# Forge — Registry Design

## 1. Principle

Registry = index only. Sources stay on GitHub. Forge pulls tarballs from GitHub Releases. Decentralized, forkable.

Packages also resolve OUTSIDE the registry (Phase 3): `github:owner/repo`,
`owner/repo` (registry-first fallback), `<git-url>`, `./local/path`.
External installs pin `source` in `forge.lock`/links and pass the same
security scan — HIGH findings refuse the install.

## 2. Layout

```
registry/
  index.json              # summary of all packages (on CDN)
  search.json             # flattened list for search
  packages/
    anthropics-plan.json  # package detail (versions)
    mcp-filesystem.json
    obra-superpowers.json
  stats.json              # download counts (optional)
```

### index.json (summary, ~100KB)

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

### packages/<slug>.json (detail)

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

## 3. Publish Flow

```
Author: forge publish
  1. validate forge.toml
  2. build tarball (files.include)
  3. compute sha256
  4. create GitHub Release (gh release create v1.2.0 tarball)
  5. update registry/packages/<slug>.json (local)
  6. open PR: registry/packages/<slug>.json -> forge/registry repo
     or push directly (if maintainer)
  7. CI: rebuild index.json and search.json
  8. deploy to R2 + CDN purge
```

In v0.1 step 6 = PR to this repo (single repo, simple).

## 4. Search

- Offline: `search.json` (in the CLI)
- Online (v0.2): Algolia or Typesense
- `forge search <query>` -> filters `search.json` (description, keywords, name)

## 5. Versioning

- Semver required
- `latest` = highest semver (excluding prereleases)
- `next` tag (optional, for betas)

## 6. Security

- Every version pinned with `sha256`
- Publish restricted to the repo owner (GitHub OIDC verification)
- `registry/packages/*.json` changes are cross-checked against `forge.toml` in CI

## 7. Mirror / Fork

Anyone can fork the registry and point at their own host instead of `registry.forge.sh`:

```toml
# ~/.forge/config.toml
registry = "https://registry.mycompany.com/index.json"
```

Same format for private registries.

## 8. Starter Seed (100 packages for v0.1)

- `anthropics/*` (10+ skills)
- `obra/superpowers`
- `mcp/*` (filesystem, github, memory, fetch, etc. 20+)
- `agency/*` (frontend, backend, etc.)
- picks from `awesome-llm-apps`
- Community: `taste-skill`, `last30days-skill`, etc.

Script: auto-port with `scripts/seed-registry.ts`.
