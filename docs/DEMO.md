# Demo — 7 Second Wow

Gif: `docs/assets/demo.gif` (800×400, 7s, loop — Faz 4'te placeholder, Faz 5'te gerçek kayıt)

## Akış (7 saniye)

1. `forge doctor` → 5 harness yeşil
2. `forge search plan` → `anthropics/plan@1.2.0 [skill]`
3. `forge add anthropics/plan` → `✓ installed on 5 harness(es)`
4. `forge list` → `anthropics/plan@1.2.0` görünüyor

## Nasıl tekrar üretilir — Windows

```bash
npm i -g terminalizer
terminalizer record demo --config terminalizer.yml
# içeride çalıştır:
forge doctor
forge search plan
forge add anthropics/plan
forge list
# çık: exit
terminalizer render demo --output docs/assets/demo.gif
```

`terminalizer.yml` örneği:
```yaml
cols: 80
rows: 18
fontSize: 14
theme: { background: "#1a1b26", foreground: "#c0caf5" }
```

Not: Windows'ta `ffmpeg` gerekebilir. Yoksa placeholder gif kalır, sorun değil — Faz 5'te gerçek kayıt çekilir.

## Nasıl tekrar üretilir — macOS / Linux

```bash
asciinema rec demo.cast --command "bash demo.sh"
# demo.sh:
# forge doctor; sleep 1; forge search plan; sleep 1; forge add anthropics/plan; sleep 1; forge list
agg demo.cast docs/assets/demo.gif
# veya
svg-term --in demo.cast --out demo.svg
```

## Script (demo.sh)

```bash
#!/bin/bash
set -e
forge doctor
sleep 1
forge search plan
sleep 1
forge add anthropics/plan
sleep 1
forge list
```

## Placeholder Notu

Faz 4'te `docs/assets/demo.gif` 1 kare placeholder'dır (hızlı iterasyon için). Gerçek 7sn kayıt Faz 5 soft launch öncesi `ffmpeg` ile üretilecek ve bu dosya üzerine yazılacak. Viral hedef 100K için gif kritik — Faz 5'te mutlaka gerçek gif olmalı.

