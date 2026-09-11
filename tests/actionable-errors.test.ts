import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatActionableError,
  formatKnownPattern,
  ForgeError,
  createIntegrityError,
  createLockSyncError,
} from "../cli/src/core/errors.js";

describe("forge errors — actionable and educational diagnostics (FAZ P1)", () => {
  it("suggests 'forge update' on integrity/hash mismatch", () => {
    const raw = "SHA256 mismatch: expected 1234567890abcdef, got 9876543210fedcba";
    const formatted = formatKnownPattern(raw);

    assert.ok(formatted.includes("Integrity Verification Failed"));
    assert.ok(formatted.includes("forge update <pkg>"));
  });

  it("suggests 'forge init' on missing forge.toml", () => {
    const raw = "forge.toml not found in /some/path";
    const formatted = formatKnownPattern(raw);

    assert.ok(formatted.includes("Project Manifest Missing"));
    assert.ok(formatted.includes("forge init"));
    assert.ok(formatted.includes("--cwd"));
  });

  it("suggests removing --frozen when forge.lock is missing", () => {
    const raw = "--frozen requires forge.lock, but none found in /dir";
    const formatted = formatKnownPattern(raw);

    assert.ok(formatted.includes("Frozen Install Blocked"));
    assert.ok(formatted.includes("forge sync"));
    assert.ok(formatted.includes("without --frozen"));
  });

  it("suggests allow_network = true on network policy violation", () => {
    const raw = "network-permission-violation in index.js";
    const formatted = formatKnownPattern(raw);

    assert.ok(formatted.includes("Network Policy Violation"));
    assert.ok(formatted.includes("allow_network = true"));
  });

  it("suggests backup restoration or fixing on malformed MCP config", () => {
    const raw = "MCP config at ~/.cursor/mcp.json contains invalid JSON: Unexpected token";
    const formatted = formatKnownPattern(raw);

    assert.ok(formatted.includes("Malformed MCP Configuration"));
    assert.ok(formatted.includes(".bak"));
  });

  it("formats structured ForgeError cleanly", () => {
    const err = new ForgeError({
      code: "ERR_CUSTOM_TEST",
      message: "Something testable broke",
      suggestion: "Try running this specific command to fix it",
      context: { file: "test.ts", code: 42 },
    });

    const formatted = formatActionableError(err);
    assert.ok(formatted.includes("Something testable broke"));
    assert.ok(formatted.includes("Suggestion:"));
    assert.ok(formatted.includes("Try running this specific command to fix it"));
    assert.ok(formatted.includes("test.ts"));
  });

  it("createIntegrityError and createLockSyncError produce valid ForgeError", () => {
    const intErr = createIntegrityError("my-pkg", "aaa", "bbb");
    assert.equal(intErr.code, "ERR_INTEGRITY_MISMATCH");
    assert.ok(intErr.suggestion?.includes("forge update my-pkg"));

    const lockErr = createLockSyncError("dep-pkg");
    assert.equal(lockErr.code, "ERR_LOCK_OUT_OF_SYNC");
    assert.ok(lockErr.suggestion?.includes("forge sync"));
  });
});
