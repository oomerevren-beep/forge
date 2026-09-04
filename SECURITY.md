# Security Policy

## Supported versions

| Version | Supported |
|---------|:---------:|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability (responsible disclosure)

Do NOT open a public issue for security bugs. Email `omermahmut44@gmail.com` with:

- affected version (`forge --version`) and OS/Node
- reproduction steps or PoC (tarball URL, package slug if registry-related)
- impact assessment if known

What happens next:

1. We acknowledge receipt within 48h.
2. We aim to ship a fix within 7 days for critical issues.
3. We credit reporters in the release notes (unless anonymity is requested).
4. Please do not disclose the issue publicly until a fix is released and a 7-day grace period has passed.

### PGP policy

We do not currently publish a PGP key. If your report is sensitive, state that in the subject line (`[SENSITIVE] ...`) and we will arrange an encrypted channel for follow-up. Reports sent in plain email are still accepted and handled confidentially — they are never forwarded or quoted publicly.

## Scope notes

- `forge` installs fail-closed: a tarball whose `sha256` cannot be verified is not installed (see `forge audit`). For registry-related reports, include the package's `registry/packages/<slug>.json` entry plus the expected/actual hash.
- Dependency scanning runs via Dependabot + `npm audit`; critical alerts are closed within 7 days.
