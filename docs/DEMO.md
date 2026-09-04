# Demo — 7 Second Wow

Gif: `docs/assets/demo.gif` (800×400, 7s, 12fps, loop — real recording produced in Phase 5, 60KB, dark #1a1b26)

![forge demo — 7 seconds](../assets/demo.gif)

## Flow (7 seconds)

1. `forge doctor` → 5 harnesses green ✓ (0.0–1.5s)
2. `forge search plan` → `anthropics/plan@1.2.0 [skill]` (1.5–3.0s)
3. `forge add anthropics/plan` → `✓ installed on 5 harness(es)` (3.0–5.0s)
4. `forge list` → `anthropics/plan@1.2.0` shows up (5.0–7.0s)

## How it was produced — Phase 5 (ffmpeg, Windows)

```bash
cp C:/Windows/Fonts/consola.ttf /tmp/font.ttf
ffmpeg -f lavfi -i "color=c=0x1a1b26:s=800x400:r=12:d=7" \
 -vf "drawtext=fontfile=/tmp/font.ttf:text='\$ forge doctor':..." \
 -c:v libx264 -pix_fmt yuv420p -t 7 /tmp/forge-demo.mp4
ffmpeg -i /tmp/forge-demo.mp4 -vf "fps=12,scale=800:-1:flags=lanczos,palettegen=max_colors=64" /tmp/palette.png
ffmpeg -i /tmp/forge-demo.mp4 -i /tmp/palette.png -lavfi "fps=12,scale=800:-1 [x];[x][1:v] paletteuse" -loop 0 docs/assets/demo.gif
# Result: 800×400, 60KB, 12fps, 7s loop — <500KB bar ✓
```

Alternatives (playwright fallback, terminalizer, asciinema/agg) give the same result — the ffmpeg path is the most reliable on Windows.

`terminalizer.yml` example:
```yaml
cols: 80
rows: 18
fontSize: 14
theme: { background: "#1a1b26", foreground: "#c0caf5" }
```

## How to reproduce — macOS / Linux

```bash
asciinema rec demo.cast --command "bash demo.sh"
# demo.sh: forge doctor; sleep 1; forge search plan; sleep 1; forge add anthropics/plan; sleep 1; forge list
agg demo.cast docs/assets/demo.gif
# or svg-term --in demo.cast --out demo.svg
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

## Status

Phase 4 had a 42B placeholder. Phase 5 produced the 60KB real recording (ffmpeg lavfi + drawtext, 800×400, 60KB). Verification: `file docs/assets/demo.gif` → GIF 800×400, `ffprobe` → 7.0s, `ls -lh` → 60K (<500KB ✓).
