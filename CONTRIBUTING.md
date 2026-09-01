# Forge — Contributing

## Gelistirme

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
bun install
bun run dev -- help
```

## Yeni Paket Eklemek

1. `forge.toml` olustur (bkz `docs/SPEC.md`)
2. `forge publish` (veya registry'ye PR)
3. `registry/packages/<slug>.json` olusur

## Yeni Harness Eklemek

Bkz `docs/ADAPTERS.md`
