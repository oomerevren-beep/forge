// cli/src/core/errors.ts — Actionable and educational error reporting.
//
// Replaces cryptic stack traces with clear, actionable diagnostics:
//   - What went wrong
//   - Root cause / context
//   - Concrete suggestion to resolve the issue

import pc from "picocolors";

export interface ForgeErrorDetails {
  code: string;
  message: string;
  suggestion?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class ForgeError extends Error {
  readonly code: string;
  readonly suggestion?: string;
  readonly context?: Record<string, unknown>;

  constructor(details: ForgeErrorDetails | string) {
    if (typeof details === "string") {
      super(details);
      this.code = "ERR_FORGE_GENERIC";
    } else {
      super(details.message);
      this.code = details.code;
      this.suggestion = details.suggestion;
      this.context = details.context;
      if (details.cause) this.cause = details.cause;
    }
    this.name = "ForgeError";
  }
}

/**
 * Format any error into a user-friendly, educational diagnostic block.
 */
export function formatActionableError(err: unknown): string {
  if (err instanceof ForgeError) {
    const lines: string[] = [];
    lines.push(`${pc.red(pc.bold("[forge] ✗ Error:"))} ${err.message}`);
    if (err.context && Object.keys(err.context).length > 0) {
      for (const [k, v] of Object.entries(err.context)) {
        lines.push(`  ${pc.gray(`${k}:`)} ${String(v)}`);
      }
    }
    if (err.suggestion) {
      lines.push(`${pc.cyan(pc.bold("  Suggestion:"))} ${err.suggestion}`);
    }
    return lines.join("\n");
  }

  const raw = err instanceof Error ? err.message : String(err);
  return formatKnownPattern(raw);
}

/**
 * Recognizes common system / operational error patterns and returns
 * actionable suggestions even for errors thrown by third-party code.
 */
export function formatKnownPattern(rawMessage: string): string {
  // Hash / SHA256 mismatch
  if (/sha256 mismatch/i.test(rawMessage) || /integrity mismatch/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Integrity Verification Failed"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} The upstream package content has changed or was tampered with.`,
      `              Run '${pc.yellow("forge update <pkg>")}' to re-resolve and update forge.lock,`,
      `              or inspect the package source repository if unexpected.`,
    ].join("\n");
  }

  // Missing forge.toml
  if (/forge\.toml not found/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Project Manifest Missing"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Run '${pc.yellow("forge init")}' to scaffold a new forge.toml for this project,`,
      `              or specify the target directory with '${pc.yellow("--cwd <dir>")}'.`,
    ].join("\n");
  }

  // Missing forge.lock with --frozen
  if (/--frozen requires forge\.lock/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Frozen Install Blocked"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Run '${pc.yellow("forge sync")}' (or '${pc.yellow("forge install")}') without --frozen`,
      `              to generate and pin dependencies in forge.lock first.`,
    ].join("\n");
  }

  // Lock out of sync
  if (/--frozen: lock missing/i.test(rawMessage) || /lock missing package/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Lockfile Out of Sync"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Dependencies in forge.toml were modified.`,
      `              Run '${pc.yellow("forge sync")}' without --frozen to update forge.lock.`,
    ].join("\n");
  }

  // Security scan blocked
  if (/security scan FAILED/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Security Scan Failed"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Inspect the flagged package files or remove the package from forge.toml.`,
      `              For trusted internal packages, review permissions in forge.toml`,
      `              or pass '${pc.yellow("--skip-scan")}' to bypass (not recommended).`,
    ].join("\n");
  }

  // Network permission violation
  if (/network-permission-violation/i.test(rawMessage) || /network permissions/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Network Policy Violation"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} This package requires network access, but allow_network = false is enforced.`,
      `              To grant access, set '${pc.yellow("allow_network = true")}' under [permissions] in forge.toml.`,
    ].join("\n");
  }

  // Package not found in registry
  if (/not found in registry/i.test(rawMessage) || /not in registry/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Package Not Found"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Check the package name spelling, run '${pc.yellow("forge search <query>")}'`,
      `              to discover available packages, or install from GitHub using '${pc.yellow("forge add github:<owner>/<repo>")}'.`,
    ].join("\n");
  }

  // Invalid package name
  if (/invalid package name/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Invalid Package Specifier"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Expected format 'scope/name' (e.g. anthropics/plan)`,
      `              or an external source (e.g. github:owner/repo, ./local-path).`,
    ].join("\n");
  }

  // Community tier without --mock
  if (/community tier \(unverified\)/i.test(rawMessage) || /unverified tarball/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Community Tier Package"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} This package does not have a verified sha256 checksum yet.`,
      `              Re-run with '${pc.yellow("--mock")}' to allow community tier packages,`,
      `              or inspect the source repository for verification status.`,
    ].join("\n");
  }

  // MCP config JSON parse error
  if (/MCP config.*contains invalid JSON/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Malformed MCP Configuration"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Fix the JSON syntax error in the configuration file,`,
      `              or restore from the automatic backup (.bak file in the same directory).`,
    ].join("\n");
  }

  // Filesystem permission denied (EACCES)
  if (/permission denied/i.test(rawMessage) || /EACCES/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Filesystem Permission Denied"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Check filesystem permissions or directory ownership`,
      `              for '~/.forge' and the current project directory.`,
    ].join("\n");
  }

  // Network connection failure or timeout
  if (/ETIMEDOUT|ENOTFOUND|ECONNREFUSED|fetch failed/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Network Request Failed"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Check internet connectivity, proxy, or VPN configuration.`,
      `              For offline use, verify registry path in '~/.forge/config.toml'.`,
    ].join("\n");
  }

  // Rate limit
  if (/rate limit/i.test(rawMessage) || /HTTP 429/i.test(rawMessage)) {
    return [
      `${pc.red(pc.bold("[forge] ✗ Rate Limit Exceeded"))}`,
      `  ${rawMessage}`,
      `  ${pc.cyan(pc.bold("Suggestion:"))} Upstream API rate limit reached. Wait a few moments`,
      `              or configure a GitHub token via 'GITHUB_TOKEN' environment variable.`,
    ].join("\n");
  }

  // Default fallback
  return `${pc.red(pc.bold("[forge] ✗"))} ${rawMessage}`;
}

/** Error factories for clean throwing */
export function createIntegrityError(pkg: string, expected: string, actual: string): ForgeError {
  return new ForgeError({
    code: "ERR_INTEGRITY_MISMATCH",
    message: `Integrity check failed for ${pkg}`,
    context: {
      package: pkg,
      expected: `sha256:${expected}`,
      actual: `sha256:${actual}`,
    },
    suggestion: `The upstream package was updated or tampered with. Run 'forge update ${pkg}' to update forge.lock.`,
  });
}

export function createLockSyncError(pkg: string): ForgeError {
  return new ForgeError({
    code: "ERR_LOCK_OUT_OF_SYNC",
    message: `Package "${pkg}" is not recorded in forge.lock`,
    suggestion: `Run 'forge sync' without --frozen to resolve and update forge.lock.`,
  });
}
