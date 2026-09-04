# Install — Forge

Üç yoldan biri. Önerilen: npm (yayınlanan `tryforge@0.1.1`).

## 1. npm (önerilen)

```bash
npm i -g tryforge
forge doctor
```

Gereksinim: Node 22+.

## 2. curl (npm'siz)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex
```

Yükleyici önce npm'i dener, yoksa GitHub release binary'sine düşer. Kurulumdan sonra terminali yeniden açıp `forge doctor` çalıştırın (PATH'e eklenmesi gerekebilir).

## 3. Kaynaktan

```bash
git clone https://github.com/oomerevren-beep/forge
cd forge
npm install
npm run build
npm test
npx tsx cli/src/index.ts --help
```

## Doğrulama

```bash
forge doctor              # 7 harness algılanır
forge search plan         # registry araması (<200ms, offline)
```

Sorun yaşarsanız: [FAQ](../README.md#faq) ve `forge doctor` çıktısıyla bir [bug report](https://github.com/oomerevren-beep/forge/issues/new?template=bug_report.md) açın.
