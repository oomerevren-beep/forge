// tests/merge.test.ts — Phase 2: non-destructive 3-way merge engine
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  upsertForgeBlock,
  removeForgeBlock,
  hasForgeBlock,
  readForgeBlock,
  forgeStartMarker,
  forgeEndMarker,
} from "../cli/src/core/merge.js";

describe("forge merge — non-destructive blocks", () => {
  let dir = "";
  let file = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-merge-"));
    file = join(dir, "CLAUDE.md");
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a marked block in a missing file", () => {
    const st = upsertForgeBlock(file, "agent/pr-reviewer", "1.0.0", "Review PRs.\n");
    assert.equal(st, "created");
    const raw = readFileSync(file, "utf-8");
    assert.ok(raw.includes(forgeStartMarker("agent/pr-reviewer", "1.0.0")));
    assert.ok(raw.includes(forgeEndMarker("agent/pr-reviewer")));
    assert.ok(raw.includes("Review PRs."));
  });

  it("preserves user content byte-for-byte, only appends the block", () => {
    const user = "# My rules\n\n- always use pnpm\n";
    writeFileSync(file, user);
    upsertForgeBlock(file, "agent/pr-reviewer", "1.0.0", "Review PRs.\n");
    const raw = readFileSync(file, "utf-8");
    assert.ok(raw.startsWith(user));
    assert.ok(hasForgeBlock(file, "agent/pr-reviewer"));
  });

  it("re-install is idempotent (second run = unchanged, no rewrite)", () => {
    writeFileSync(file, "# Mine\n");
    assert.equal(upsertForgeBlock(file, "a/b", "1.0.0", "Body.\n"), "updated");
    const before = readFileSync(file, "utf-8");
    assert.equal(upsertForgeBlock(file, "a/b", "1.0.0", "Body.\n"), "unchanged");
    assert.equal(readFileSync(file, "utf-8"), before);
  });

  it("version bump replaces only the marked block, keeps user lines", () => {
    writeFileSync(file, "USER-LINE-1\nUSER-LINE-2\n");
    upsertForgeBlock(file, "a/b", "1.0.0", "Old body.\n");
    upsertForgeBlock(file, "a/b", "2.0.0", "New body.\n");
    const raw = readFileSync(file, "utf-8");
    assert.ok(raw.includes("USER-LINE-1") && raw.includes("USER-LINE-2"));
    assert.ok(raw.includes("New body.") && !raw.includes("Old body."));
    assert.ok(raw.includes('version="2.0.0"'));
    assert.equal(readForgeBlock(file, "a/b")?.trim(), "New body.");
  });

  it("multiple packages coexist, uninstall removes only its own block", () => {
    writeFileSync(file, "# Team rules\n");
    upsertForgeBlock(file, "a/one", "1.0.0", "One.\n");
    upsertForgeBlock(file, "a/two", "1.0.0", "Two.\n");
    assert.equal(removeForgeBlock(file, "a/one"), true);
    const raw = readFileSync(file, "utf-8");
    assert.ok(raw.includes("# Team rules"));
    assert.ok(!raw.includes("One.\n") || raw.includes("Two."));
    assert.ok(hasForgeBlock(file, "a/two"));
    assert.ok(!hasForgeBlock(file, "a/one"));
    assert.ok(existsSync(file));
  });

  it("removes a forge-created file when only whitespace remains", () => {
    upsertForgeBlock(file, "a/solo", "1.0.0", "Solo.\n");
    assert.equal(removeForgeBlock(file, "a/solo"), true);
    assert.ok(!existsSync(file));
  });

  it("remove on missing file or unknown id returns false", () => {
    assert.equal(removeForgeBlock(file, "a/ghost"), false);
    writeFileSync(file, "# plain\n");
    assert.equal(removeForgeBlock(file, "a/ghost"), false);
    assert.equal(readForgeBlock(file, "a/ghost"), null);
  });

  it("refuses marker injection in block ids", () => {
    assert.throws(() => upsertForgeBlock(file, 'x"-->\nevil', "1.0.0", "b"), /marker injection/);
    assert.throws(() => forgeStartMarker("a\nb", "1.0.0"), /marker injection/);
  });

  it("creates parent dirs for nested rule files", () => {
    const nested = join(dir, ".cursor", "rules", "x.mdc");
    upsertForgeBlock(nested, "a/b", "1.0.0", "Body.\n");
    assert.ok(existsSync(nested));
  });
});
