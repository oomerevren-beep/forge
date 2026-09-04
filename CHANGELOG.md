# Changelog

All notable changes are kept in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

## [Unreleased] — Stage 2: core engine, zero-friction DX, dynamic adapters

### Added
- Zero-install runtime: `npx -y tryforge` / `bunx tryforge` via single-file
  esbuild bundle (`npm run bundle` → `dist/index.cjs`, published `bin`).
- Non-destructive merge engine (`cli/src/core/merge.ts`):
  `<!-- FORGE:START/END -->` blocks, byte-preserved user content, idempotent
  reinstalls, block-only uninstall, marker-injection refusal.
- 2026 adapter rule formats: Cursor `.cursor/rules/*.mdc` (frontmatter),
  Claude `<project>/CLAUDE.md` merged blocks, Windsurf `.windsurfrules`
  merged blocks, shared `<project>/AGENTS.md` blocks (OpenCode/Codex/DSH).
- Deterministic `forge.lock` with pinned integrity (`tarball` + `sha256` +
  `source`); `forge install --frozen` refuses yanked versions and hash drift.
- `FORGE_TEST_HOME` test hook — adapter tests never touch the real home dir.

### Changed
- Adapters refactored onto `cli/src/adapters/base.ts` (scope resolution,
  list/isInstalled loops, rule sync); `Adapter.install` takes optional
  `PackageMeta` (version/description) for rule-file sync.
- `docs/SPEC.md`, `ARCHITECTURE.md`, `REGISTRY.md`, `PRD.md` translated to
  English (Stage 1 debt); SPEC gains the forge.lock section (§4).

### Fixed
- `Adapter` interface doc in `docs/ADAPTERS.md` matched the real signature;
  support matrix now lists 2026 rule formats per harness.

## [Unreleased] — Stage 1: repo hygiene & OSS standardization

### Removed
- `docs/run-state/` (agent loop leftovers), `.hermes/`, `.kiro/` (local IDE state) — untracked and deleted.
- All `registry-content/*.tar.gz` prebuilt binaries (15 files) — source dirs kept; `scripts/publish-verified.ts` now stages tarballs under gitignored `.cache/forge-publish/`.

### Changed
- `.gitignore` rebuilt to the OSS standard set (deps/build/archives/IDE/env/OS) plus Forge guards (`docs/private/`, `.npmrc`, `.forge/`).
- 100% English across CLI, scripts, tests, and public docs (comments, test names, console strings).
- `SECURITY.md`: responsible-disclosure steps + PGP policy clarified. `CONTRIBUTING.md`: skill-package flow added.
- Toolchain: dev TypeScript pinned to v6 line (typescript-eslint has no TS 7 support yet, upstream #10940) — build/test output unchanged.
- `npm run build` now uses `tsconfig.build.json` (tests excluded from emit); `npm run typecheck` covers `cli/` + `scripts/` + `tests/` strict.

### Added
- `npm run lint` (ESLint flat config, `--max-warnings 0`) and `npm run typecheck` (`tsc --noEmit`).
- CI: strict `lint` + `typecheck` jobs gating `validate` on every push/PR.

## [0.1.1] — 2026-09-03

### Added
- `tryforge` npm package published (`npm i -g tryforge`).
- 7 harness adapters: Claude Code, Codex, OpenCode, Cursor, DeepSeek (dsh), Windsurf, Generic.
- 21-package verified registry (`registry/index.json` + `search.json` + `stats.json`).
- Team sync via `forge.toml` + `forge.lock` (`forge install`, `--frozen`).
- `forge audit` (mock/unverified marking), `forge doctor` health check.
- Fail-closed installer: content whose `sha256` cannot be verified is not installed without `--mock`.

### Security
- `tar` extraction moved to `execFileSync` arg-array; symlink/escape scanning added.
- `add`/`remove` dependency-name validation (`owner/name`).
- `.bak` backup before MCP config writes.

## [0.1.0] — 2026-09-01

### Added
- First CLI skeleton: `add/search/list/info/doctor/init/install/update/outdated/remove`.
- Semver resolution (`^`, `~`, pin) and offline scored search (<200ms).
- `install.sh` / `install.ps1` installers.
