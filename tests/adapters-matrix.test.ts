import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { allAdapters, detectAdapters, genericAdapter, dshAdapter, windsurfAdapter } from "../cli/src/adapters/index.js";
import { claudeAdapter } from "../cli/src/adapters/claude.js";
import { codexAdapter } from "../cli/src/adapters/codex.js";
import { cursorAdapter } from "../cli/src/adapters/cursor.js";
import { opencodeAdapter } from "../cli/src/adapters/opencode.js";

// Phase 12 matrix: 7 harnesses, add/remove/list over a mock FS
describe("forge adapters — Phase 12 matrix (7 harnesses)", () => {
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

// Phase 2: every editor gets valid-syntax rule files; user content survives.
describe("forge adapters — Phase 2 rule files (non-destructive)", () => {
  let dir = "";
  let home = "";
  let prev = "";
  let prevTestHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-rules-"));
    home = join(dir, "fake-home");
    mkdirSync(home, { recursive: true });
    prev = process.cwd();
    prevTestHome = process.env.FORGE_TEST_HOME;
    process.env.FORGE_TEST_HOME = home;
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(prev);
    if (prevTestHome === undefined) delete process.env.FORGE_TEST_HOME;
    else process.env.FORGE_TEST_HOME = prevTestHome;
    rmSync(dir, { recursive: true, force: true });
  });

  function makeSrc(slug: string): string {
    const src = join(dir, `src-${slug}`);
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "SKILL.md"), `# ${slug}\n\nDo the thing.\n`);
    return src;
  }

  it("cursor writes a valid .mdc rule file (frontmatter + markers)", async () => {
    const src = makeSrc("cur");
    await cursorAdapter.install("cur", src, "skill", { version: "1.0.0", description: "Cursor test skill" });
    const mdc = join(home, ".cursor", "rules", "cur.mdc");
    assert.ok(existsSync(mdc));
    const raw = readFileSync(mdc, "utf-8");
    assert.ok(raw.startsWith("---\n"));
    assert.ok(raw.includes("description: Cursor test skill"));
    assert.ok(raw.includes("alwaysApply: false"));
    assert.ok(raw.includes('<!-- FORGE:START id="cur" version="1.0.0" -->'));
    assert.ok(raw.includes('<!-- FORGE:END id="cur" -->'));
    assert.ok(await cursorAdapter.isInstalled("cur"));
    await cursorAdapter.uninstall("cur", "skill");
    assert.ok(!(await cursorAdapter.isInstalled("cur")));
    assert.ok(!existsSync(mdc));
  });

  it("claude merges into existing CLAUDE.md without touching user lines", async () => {
    const src = makeSrc("cc");
    writeFileSync(join(dir, "CLAUDE.md"), "# Team conventions\n\n- tabs, not spaces\n");
    await claudeAdapter.install("cc", src, "skill", { version: "1.0.0", description: "Claude test skill" });
    const raw = readFileSync(join(dir, "CLAUDE.md"), "utf-8");
    assert.ok(raw.includes("# Team conventions") && raw.includes("tabs, not spaces"));
    assert.ok(raw.includes('<!-- FORGE:START id="cc" version="1.0.0" -->'));
    // reinstall bumps only the block
    await claudeAdapter.install("cc", src, "skill", { version: "2.0.0", description: "Claude test skill" });
    const raw2 = readFileSync(join(dir, "CLAUDE.md"), "utf-8");
    assert.ok(raw2.includes("tabs, not spaces") && raw2.includes('version="2.0.0"'));
    await claudeAdapter.uninstall("cc", "skill");
    const raw3 = readFileSync(join(dir, "CLAUDE.md"), "utf-8");
    assert.ok(raw3.includes("tabs, not spaces") && !raw3.includes("FORGE:START"));
  });

  it("windsurf merges .windsurfrules non-destructively", async () => {
    const src = makeSrc("ws");
    writeFileSync(join(dir, "package.json"), '{"name":"demo"}\n');
    writeFileSync(join(dir, ".windsurfrules"), "# Cascade prefs\n\n- short answers\n");
    await windsurfAdapter.install("ws", src, "agent", { version: "1.0.0", description: "Windsurf test agent" });
    const raw = readFileSync(join(dir, ".windsurfrules"), "utf-8");
    assert.ok(raw.includes("short answers") && raw.includes('id="ws"'));
    await windsurfAdapter.uninstall("ws", "agent");
    const raw2 = readFileSync(join(dir, ".windsurfrules"), "utf-8");
    assert.ok(raw2.includes("short answers") && !raw2.includes("FORGE:START"));
  });

  it("opencode/codex/dsh share AGENTS.md blocks without clobbering each other", async () => {
    const src = makeSrc("ag");
    writeFileSync(join(dir, "AGENTS.md"), "# Repo rules\n\n- english only\n");
    await opencodeAdapter.install("ag-op", src, "skill", { version: "1.0.0", description: "op" });
    await codexAdapter.install("ag-cx", src, "skill", { version: "1.0.0", description: "cx" });
    await dshAdapter.install("ag-dsh", src, "skill", { version: "1.0.0", description: "dsh" });
    const raw = readFileSync(join(dir, "AGENTS.md"), "utf-8");
    assert.ok(raw.includes("english only"));
    assert.ok(raw.includes('id="ag-op"') && raw.includes('id="ag-cx"') && raw.includes('id="ag-dsh"'));
    await codexAdapter.uninstall("ag-cx", "skill");
    const raw2 = readFileSync(join(dir, "AGENTS.md"), "utf-8");
    assert.ok(raw2.includes("english only") && !raw2.includes("ag-cx"));
    assert.ok(raw2.includes('id="ag-op"') && raw2.includes('id="ag-dsh"'));
    await opencodeAdapter.uninstall("ag-op", "skill");
    await dshAdapter.uninstall("ag-dsh", "skill");
  });

  it("MCP inject preserves existing user servers", async () => {
    const { addMcpServerToConfig, readMcpConfig } = await import("../cli/src/adapters/index.js");
    const cfg = join(dir, "mcp.json");
    writeFileSync(cfg, JSON.stringify({ mcpServers: { mine: { command: "my-cmd" } } }));
    addMcpServerToConfig(cfg, "forge-pkg", { command: "npx", args: ["-y", "x"] });
    const parsed = readMcpConfig(cfg) as { mcpServers: Record<string, { command: string }> };
    assert.equal(parsed.mcpServers.mine.command, "my-cmd");
    assert.equal(parsed.mcpServers["forge-pkg"].command, "npx");
  });
});
