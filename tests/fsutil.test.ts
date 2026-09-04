// tests/fsutil.test.ts — Phase 3: non-ASCII-safe recursive copy
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { copyDirRecursive } from "../cli/src/core/fsutil.js";

describe("forge fsutil — copyDirRecursive", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-fsutil-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("copies nested trees with content intact", () => {
    const src = join(dir, "src");
    mkdirSync(join(src, "sub", "deep"), { recursive: true });
    writeFileSync(join(src, "SKILL.md"), "# Hi\n");
    writeFileSync(join(src, "sub", "a.txt"), "a");
    writeFileSync(join(src, "sub", "deep", "b.txt"), "b");
    const dest = join(dir, "dest");
    copyDirRecursive(src, dest);
    assert.equal(readFileSync(join(dest, "SKILL.md"), "utf-8"), "# Hi\n");
    assert.equal(readFileSync(join(dest, "sub", "deep", "b.txt"), "utf-8"), "b");
    assert.deepEqual(readdirSync(dest).sort(), ["SKILL.md", "sub"]);
  });

  it("replaces an existing dest dir", () => {
    const src = join(dir, "src2");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "n.txt"), "new");
    const dest = join(dir, "dest2");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "old.txt"), "old");
    copyDirRecursive(src, dest);
    assert.deepEqual(readdirSync(dest), ["n.txt"]);
  });

  it("refuses non-directories (fail-closed)", () => {
    const f = join(dir, "f.txt");
    writeFileSync(f, "x");
    assert.throws(() => copyDirRecursive(f, join(dir, "out")), /not a directory/);
  });
});
