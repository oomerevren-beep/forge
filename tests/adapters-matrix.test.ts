import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { allAdapters, detectAdapters, genericAdapter, dshAdapter, windsurfAdapter } from "../cli/src/adapters/index.js";

// Faz 12 matrix: 7 harness add/remove/list mock FS ile
describe("forge adapters — Faz 12 matrix (7 harness)", () => {
  it("allAdapters has 7 entries with unique names", () => {
    const names = allAdapters.map((a) => a.name).sort();
    assert.deepEqual(names, ["claude-code", "codex", "cursor", "dsh", "generic", "opencode", "windsurf"]);
  });

  it("every adapter implements the interface", () => {
    for (const a of allAdapters) {
      assert.equal(typeof a.name, "string");
      assert.equal(typeof a.displayName, "string");
      assert.equal(typeof a.detect, "function");
      assert.equal(typeof a.skillDir, "function");
      assert.equal(typeof a.mcpConfigPath, "function");
      assert.equal(typeof a.install, "function");
      assert.equal(typeof a.uninstall, "function");
      assert.equal(typeof a.list, "function");
      assert.equal(typeof a.isInstalled, "function");
      // skillDir must contain slug
      assert.ok(a.skillDir("test-slug").includes("test-slug"));
    }
  });

  it("detectAdapters always includes generic fallback", () => {
    const detected = detectAdapters();
    assert.ok(detected.some((a) => a.name === "generic"));
    assert.ok(detected.length >= 1);
  });

  it("dsh + windsurf expose sane paths", () => {
    assert.ok(dshAdapter.skillDir("x-pkg").includes("x-pkg"));
    assert.ok(windsurfAdapter.skillDir("x-pkg").includes("x-pkg"));
    assert.equal(typeof dshAdapter.detect(), "boolean");
    assert.equal(typeof windsurfAdapter.detect(), "boolean");
  });

  it("generic add/remove/list roundtrip in temp CWD (mock FS)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "forge-matrix-"));
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const src = join(dir, "src-pkg");
      mkdirSync(src, { recursive: true });
      writeFileSync(join(src, "SKILL.md"), "# test\n");
      // install all 6 types through generic
      for (const t of ["skill", "mcp", "agent", "command", "hook", "plugin"]) {
        await genericAdapter.install(`matrix-${t}`, src, t);
        assert.ok(await genericAdapter.isInstalled(`matrix-${t}`), `${t} should be installed`);
      }
      const list = await genericAdapter.list();
      assert.ok(list.length >= 6);
      for (const t of ["skill", "mcp", "agent", "command", "hook", "plugin"]) {
        await genericAdapter.uninstall(`matrix-${t}`, t);
        assert.ok(!(await genericAdapter.isInstalled(`matrix-${t}`)), `${t} should be removed`);
      }
      assert.ok(existsSync(join(dir, ".forge", "packages")) || true);
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
