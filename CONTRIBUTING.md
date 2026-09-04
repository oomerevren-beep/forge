# Contributing to Forge

Thanks for stopping by! Forge is the homebrew for AI agents — one CLI for skills, MCPs, plugins, agents.

## Quick start

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
npm install
npm run build
npm test
npx tsx cli/src/index.ts --help
```

## Adding a package

Packages live in `registry/packages/<slug>.json`. Don't hand-edit `registry/index.json` — it's generated.

```bash
npm run seed          # generate 100 seed packages (idempotent)
npm run registry:build # build index.json + search.json + stats.json
npm run registry:build -- --check # CI check (fails if out of sync)
```

To add a real package, create `registry/packages/my-pkg.json` following `schema/forge.schema.json`, then run `npm run registry:build`.

## Adding a skill package

New skills start from a generated skeleton — never from a blank file:

```bash
npx tsx cli/src/index.ts init my-skill --type skill --yes   # or mcp|plugin|agent|command|hook
# edit SKILL.md + forge.toml, verify the skeleton:
ls my-skill   # forge.toml + SKILL.md (+ type-specific files)
```

Every type ships its required files (`SKILL.md` for skills, `agent.md` for agents, `mcp.json` + `src/index.ts` for MCPs). See `docs/SPEC.md` for the per-type `forge.toml` fields.

## Adding a harness adapter

See `docs/ADAPTERS.md`. In short:

1. Create `cli/src/adapters/<name>.ts` implementing `detect/install/uninstall/list`
2. Register it in `cli/src/adapters/index.ts` (`allAdapters`)
3. Test with `forge doctor` and `forge add <pkg> --dry-run`

## Scripts

- `npm run build` — type-check + emit to `dist/` (used by `npm pack` and `bin`)
- `npm test` — 35 tests (smoke + semver + init + adapters + installer-security)
- `npm run dev -- <args>` — run CLI from source via `tsx`

## Ground rules

- [Code of Conduct](CODE_OF_CONDUCT.md) applies everywhere. Be kind, review kindly.
- Security bugs: do NOT open a public issue — see [SECURITY.md](SECURITY.md).
- Conventional Commits (`feat:`, `fix:`, `docs:`, `registry:`) — one concern per commit.
- New? Start with [`good first issue`](https://github.com/oomerevren-beep/forge/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Pull requests

- Keep PRs small and focused.
- Run `npm run build && npm test && npm run registry:build -- --check` before pushing.
- Docs live in `docs/` — update them with your change.

## Release

- `npm version patch|minor|major` bumps `package.json`
- `git push --follow-tags` triggers the GitHub release workflow (when configured)
