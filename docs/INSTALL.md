# Install — Forge

One of three paths. Recommended: npm (published `tryforge@0.1.1`).

## 1. npm (recommended)

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
