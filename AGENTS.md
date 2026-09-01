# AGENTS.md — Forge

Sen Forge'un otonom ajanisin. Bu repo `forge` — AI agent ekosisteminin homebrew'u.

## Proje

- **Ad:** Forge
- **Repo:** `forge` (GitHub: `oomerevren-beep/forge` / `oomerevren/forge`)
- **Dil:** TypeScript (v0.1 Bun) -> Rust (v0.2)
- **Calisma alani:** `C:/Users/ömer/Desktop/forge`

## Komutlar

```bash
cd C:/Users/ömer/Desktop/forge
bun install
bun run dev          # CLI dev
bun run build        # build
bun test             # test
bun run registry:build  # registry index olustur
```

## Kurallar

- Dil: Turkce (teknik terimler Ingilizce)
- Her degisiklikte `docs/` guncelle
- Her 3 adimda kendi kendini dogrula (test calistir)
- Commit mesaji: `feat:`, `fix:`, `docs:`, `registry:` prefix

## Mimari

Bkz: `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `docs/REGISTRY.md`

## Harness'ler

Adapter'lar `cli/src/adapters/` altinda. Yeni harness eklerken `docs/ADAPTERS.md` oku.

## Registry

`registry/` klasoru dogrudan deploy edilir. `registry/packages/*.json` elle duzenleme — `scripts/seed-registry.ts` ile olustur.
