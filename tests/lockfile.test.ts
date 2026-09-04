// tests/lockfile.test.ts — Phase 2: deterministic lockfile + integrity barrier
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { writeLock, readLock, verifyLockIntegrity, type LockEntry } from "../cli/src/core/lock.js";

const A: LockEntry = {
  name: "pdf/merge",
  version: "1.0.0",
  type: "skill",
  tarball: "https://example.com/pdf-merge-1.0.0.tar.gz",
  sha256: "5e84a081c5c343973af044b4076da2492ee109973a3fb7793a4673dcf094caeb",
  source: "registry",
};

describe("forge lock — deterministic + integrity", () => {
  let dir = "";
  let prev = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-lock-"));
    prev = process.cwd();
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  });

  it("write is deterministic: same entries, any order → byte-identical file", () => {
    const b: LockEntry = { ...A, name: "agent/debugger", version: "2.1.0", type: "agent" };
    writeLock([b, A]);
    const first = readFileSync(join(dir, "forge.lock"), "utf-8");
    writeLock([A, b]);
    assert.equal(readFileSync(join(dir, "forge.lock"), "utf-8"), first);
    // sorted by name: agent/... before pdf/...
    assert.ok(first.indexOf("agent/debugger") < first.indexOf("pdf/merge"));
  });

  it("pins integrity fields and round-trips them", () => {
    writeLock([A]);
    const lock = readLock();
    assert.ok(lock);
    assert.equal(lock.packages[0].sha256, A.sha256);
    assert.equal(lock.packages[0].tarball, A.tarball);
    assert.equal(lock.packages[0].source, "registry");
  });

  it("reads legacy locks without integrity fields (back-compat)", () => {
    writeFileSync(join(dir, "forge.lock"), '[[packages]]\nname = "a/b"\nversion = "1.0.0"\ntype = "skill"\n');
    const lock = readLock();
    assert.ok(lock);
    assert.equal(lock.packages[0].name, "a/b");
    assert.equal(lock.packages[0].sha256, undefined);
  });

  it("flags a yanked version (locked version missing from registry)", async () => {
    const lock = {
      packages: [{ name: "pdf/merge", version: "9.9.9", type: "skill", sha256: "0".repeat(64), source: "registry" }],
    };
    const issues = await verifyLockIntegrity(lock);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "yanked");
  });

  it("flags a hash mismatch against the registry", async () => {
    const lock = {
      packages: [{ name: "pdf/merge", version: "1.0.0", type: "skill", sha256: "0".repeat(64), source: "registry" }],
    };
    const issues = await verifyLockIntegrity(lock);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "hash-mismatch");
  });

  it("accepts a lock whose hashes match the registry", async () => {
    const lock = { packages: [A] };
    const issues = await verifyLockIntegrity(lock);
    assert.equal(issues.length, 0);
  });

  it("refuses placeholder hashes under frozen without --mock", async () => {
    const lock = {
      packages: [{ name: "pdf/merge", version: "1.0.0", type: "skill", sha256: "placeholder-x", source: "registry" }],
    };
    const strict = await verifyLockIntegrity(lock);
    assert.ok(strict.some((i) => i.kind === "unverified"));
    const lax = await verifyLockIntegrity(lock, { allowMock: true });
    assert.ok(!lax.some((i) => i.kind === "unverified"));
  });
});
