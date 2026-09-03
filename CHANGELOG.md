# Changelog

Tüm önemli değişiklikler bu dosyada tutulur. Format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) esaslıdır, sürümler [SemVer](https://semver.org/) izler.

## [0.1.1] — 2026-09-03

### Added
- `tryforge` npm paketi yayınlandı (`npm i -g tryforge`).
- 7 harness adapter'ı: Claude Code, Codex, OpenCode, Cursor, DeepSeek (dsh), Windsurf, Generic.
- 250 paketlik tohum registry (`registry/index.json` + `search.json` + `stats.json`).
- `forge.toml` + `forge.lock` ile takım senkronu (`forge install`, `--frozen`).
- `forge audit` (mock/unverified işaretleme), `forge doctor` sağlık kontrolü.
- Fail-closed installer: `sha256` doğrulanamayan içerik `--mock` olmadan kurulmaz.

### Security
- `tar` extract `execFileSync` arg-array'e taşındı; symlink/escape taraması eklendi.
- `add`/`remove` bağımlılık adı validasyonu (`owner/name`).
- MCP config yazımı öncesi `.bak` yedeği.

## [0.1.0] — 2026-09-01

### Added
- İlk CLI iskeleti: `add/search/list/info/doctor/init/install/update/outdated/remove`.
- Semver çözümleme (`^`, `~`, pin) ve offline scored search (<200ms).
- `install.sh` / `install.ps1` yükleyiciler.
