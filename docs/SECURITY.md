# Forge Security Model & Policy

Forge is the package manager for AI agent context, skills, MCP servers, and agent roles. Because packages can supply executable instructions, prompts, and MCP server declarations to autonomous agents and developer IDEs, security is built to **fail closed by default**.

---

## 1. Security Architecture & Threat Model

Forge treats third-party agent packages as untrusted input. The threats addressed include:
- **Remote Code Execution (RCE) / Dangerous Commands:** Packages attempting to execute destructive commands (e.g., `rm -rf /`, fork bombs, disk overwrites) or download and execute unverified remote payloads (`curl ... | sh`, `wget ... | bash`, reverse shells).
- **Prompt Injection & Instruction Overrides:** Malicious `SKILL.md` or prompt files attempting to hijack the agent's instructions (e.g., "ignore all previous instructions", prompt delimiter evasion, safety bypass directives).
- **Secret Exfiltration & Taint Flow:** Prompts or scripts attempting to read `.env`, SSH keys, credentials, or piping environment secrets into network requests.
- **Path Traversal & Filesystem Escapes:** Archives or packages using tar-slip (`../../path`) or escaping symlinks/junctions to overwrite arbitrary system or project files.
- **Supply Chain Tampering & Desync:** Modified dependencies, mismatched checksums, or yanked upstream packages altering behavior in CI/CD.

---

## 2. Static Security Scanner

Forge includes a built-in static security scanner (`cli/src/core/scan.ts`) that inspects all package contents before installation or synchronization.

### Scanner Rules
The scanner evaluates 19+ static security patterns across packages:
- **High-Severity Shell Hazards:**
  - Piped shell execution (`curl ... | sh`, `curl ... | bash`, `wget ... | sh`, `wget ... | bash`)
  - Destructive root deletion (`rm -rf /`, `rm -rf /*`)
  - Fork bombs (`:(){ :|:& };:`)
  - Direct disk wiping (`dd of=/dev/sd...`, `mkfs.ext4 /dev/...`)
  - Reverse shell patterns (`bash -i >& /dev/tcp/...`, `nc -e /bin/sh`, Python/Perl socket shells)
- **High-Severity Prompt Injection:**
  - Instruction override triggers (`ignore all previous instructions`, `forget prior guidelines`)
  - Prompt delimiter evasion (`</system>`, `[SYSTEM PROMPT]`, `BEGIN ESCAPED INSTRUCTIONS`)
  - Safety filter bypass directives (`bypass safety filters`, `disable content policy`)
- **Credential & Secret Protections:**
  - Private SSH keys (`BEGIN RSA PRIVATE KEY`, `id_rsa`)
  - Sensitive token exposures (`AWS_SECRET_ACCESS_KEY`, `ghp_...`, `AIza...`)
  - Taint-flow heuristics: Environment variable extraction piped to network endpoints (`curl ... $OPENAI_API_KEY`, `POST ... env`)
- **Project Boundary Protections:**
  - Denied path enforcement based on project `forge.toml` `[permissions].denied_paths`
  - Unauthorized network capabilities when `[permissions].allow_network = false`

### Scanner Limitations (Honest Disclosure)
The scanner operates via **deterministic static regular expressions and heuristic pattern matching**. It is **not** a full language AST parser or dynamic runtime sandbox.
- Dynamic string concatenations, runtime evaluations (`eval()`), and obfuscated payloads (e.g., base64 decoding at runtime) can circumvent static regex pattern matching.
- AST-level semantic analysis and containerized sandboxed evaluation are slated for future phases (v0.3+).
- The scanner is a defense-in-depth pre-filter and must not be considered a substitute for reviewing untrusted code.

---

## 3. Fail-Closed Security Policy

- **Pre-Install Verification:** Every package added via `forge add`, `forge install`, or `forge sync` is automatically scanned before being merged or linked into your workspace.
- **Blocking Severity:** Any finding with `high` severity causes the operation to fail immediately with exit code 1. No files are merged into your workspace.
- **Manual Bypass:** The `--skip-scan` flag exists for deliberate testing in isolated environments, but emits a visible warning and is never recommended in production.
- **Audit Command:** Running `forge audit` scans all installed packages and dependencies in the active workspace and exits with code 1 if any high-severity issue is detected.

---

## 4. Archive & Filesystem Hardening

- **Tar-Slip Prevention:** When extracting package archives, all member file paths are validated. Any entry containing relative path navigation (`..`), absolute root paths (`/` or `C:\`), or attempting to write outside the target destination directory is rejected with an extraction error.
- **Symlink Protection:** Directory symlinks and symlinks pointing outside the designated package store are prohibited and flagged during verification and installation.
- **Atomic Operations:** Workspace files are backed up or updated using deterministic AST-preserving mergers (`remark` for markdown, `jsonc-parser` for JSONC, `smol-toml` for TOML) to eliminate race conditions and corrupted context files.

---

## 5. Lockfile Integrity & Reproducibility

- `forge.lock` provides deterministic cryptographic pinning for your AI context:
  - Every registry dependency is pinned to an exact version and SHA-256 integrity hash.
  - Every external git dependency captures and verifies the exact commit SHA (`git rev-parse HEAD`) and source tree digest.
- **Frozen Installs:** In CI/CD pipelines, running `forge install --frozen` or `forge sync --frozen`:
  - Enforces that `forge.lock` exists and matches `forge.toml` dependencies exactly.
  - Verifies the SHA-256 hash of all downloaded packages against the lockfile.
  - Refuses placeholder hashes or modified packages.
  - Fails closed with exit code 1 on any discrepancy without modifying the lockfile.

---

## 6. Vulnerability Reporting (Responsible Disclosure)

If you discover a security vulnerability in Forge, please do not open a public issue.

Email: **omermahmut44@gmail.com**

Please include:
1. Forge version (`forge --version` or `tryforge --version`) and operating system.
2. Step-by-step reproduction or proof of concept.
3. Impact assessment.

We acknowledge reports within 48 hours and coordinate a patch within 7 days for critical vulnerabilities.
