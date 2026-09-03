# Security Policy

## Supported versions

| Version | Supported |
|---------|:---------:|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability

Do NOT open a public issue for security bugs. Email `omermahmut44@gmail.com` with:

- affected version (`forge --version`) and OS/Node
- reproduction steps or PoC (tarball URL, package slug if registry-related)
- impact assessment if known

We acknowledge within 48h, aim to ship a fix within 7 days, and credit reporters in the release notes (unless anonymity is requested).

## Scope notes

- `forge` fail-closed kurulum yapar: `sha256` doğrulanamayan tarball kurulmaz (bkz. `forge audit`). Güvenlik açığı bildirimlerinde ilgili paketin `registry/packages/<slug>.json` girdisini ve beklenen/gerçek hash'i ekleyin.
- Bağımlılık taraması Dependabot + `npm audit` ile yürütülür; kritik uyarılar 7 gün içinde kapatılır.
