# Install — Forge

One of three paths. Recommended: npx (zero-install, always the latest release).

## 0. npx / bunx (zero-install, recommended for trying)

```bash
npx -y tryforge doctor
npx -y tryforge add pdf/extract
```

```bash
bunx tryforge doctor
```

No global install, no setup — the single-file `dist/index.cjs` bundle runs
anywhere with Node 22+. For daily use, prefer the global install below.

## 1. npm (global, recommended for daily use)

```bash
npm i -g tryforge
forge doctor
```

Requirement: Node 22+.

## 2. curl (no npm)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex
```

The installer tries npm first, then falls back to the GitHub release binary. After installing, reopen your terminal and run `forge doctor` (it may need to be added to PATH).

## 3. From source

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
npm install
npm run build
npm test
npx tsx cli/src/index.ts --help
```

## Verification

```bash
forge doctor              # 7 harnesses detected
forge search plan         # registry search (<200ms, offline)
```

If you hit a problem: see [FAQ](../README.md#faq) and open a [bug report](https://github.com/oomerevren-beep/forge/issues/new?template=bug_report.md) with your `forge doctor` output.
