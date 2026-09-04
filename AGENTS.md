# AGENTS.md — Forge

You are Forge's autonomous agent. This repo is `forge` — the homebrew of the AI agent ecosystem.

## Project

- **Name:** Forge
- **Repo:** `forge` (GitHub: `oomerevren-beep/forge` / `oomerevren/forge`)
- **Language:** TypeScript (v0.1) -> Rust (v0.2)
- **Workspace:** `C:/Users/ömer/Desktop/forge`

## Commands

```bash
cd C:/Users/ömer/Desktop/forge
npm install
npm run dev          # CLI dev
npm run build        # build
npm test             # test
npm run registry:build  # build registry index
```

## Rules

- Language: English (100% English OSS standard)
- Update `docs/` with every change
- Self-verify every 3 steps (run tests)
- Commit messages: `feat:`, `fix:`, `docs:`, `registry:` prefix

## Architecture

See: `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `docs/REGISTRY.md`

## Harnesses

Adapters live under `cli/src/adapters/`. When adding a new harness, read `docs/ADAPTERS.md`.

## Registry

The `registry/` folder is deployed directly. Never hand-edit `registry/packages/*.json` — generate with `scripts/seed-registry.ts`.
