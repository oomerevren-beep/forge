import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { cursorAdapter } from "../cli/src/adapters/cursor.js";
import { claudeAdapter } from "../cli/src/adapters/claude.js";
import { windsurfAdapter } from "../cli/src/adapters/windsurf.js";
import { readMcpConfig, addMcpServerToConfig } from "../cli/src/adapters/index.js";

describe("forge adapter robustness — missing directories & config preservation (FAZ P1)", () => {
  let dir = "";
  let home = "";
  let prevCwd = "";
  let prevTestHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-robustness-"));
    home = join(dir, "fake-home");
    mkdirSync(home, { recursive: true });
    prevCwd = process.cwd();
    prevTestHome = process.env.FORGE_TEST_HOME;
    process.env.FORGE_TEST_HOME = home;
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevTestHome === undefined) delete process.env.FORGE_TEST_HOME;
    else process.env.FORGE_TEST_HOME = prevTestHome;
    rmSync(dir, { recursive: true, force: true });
  });

  function createDummySource(name: string): string {
    const src = join(dir, `src-${name}`);
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "SKILL.md"), `# ${name}\nSkill instructions\n`);
    return src;
  }

  // --- Cursor ---
  describe("Cursor adapter", () => {
    it("tolerates missing .cursor and rules directories during operations", async () => {
      // Neither home nor project has .cursor
      assert.equal(await cursorAdapter.isInstalled("nonexistent"), false);
      const list = await cursorAdapter.list();
      assert.deepEqual(list, []);

      // Uninstalling from non-existent directories should not throw
      await cursorAdapter.uninstall("nonexistent", "skill");

      // Installing creates necessary parent directories seamlessly
      const src = createDummySource("cursor-pkg");
      await cursorAdapter.install("cursor-pkg", src, "skill", { version: "1.0.0", description: "Cursor test" });

      assert.ok(await cursorAdapter.isInstalled("cursor-pkg"));
      const mdcPath = join(home, ".cursor", "rules", "cursor-pkg.mdc");
      assert.ok(existsSync(mdcPath));

      await cursorAdapter.uninstall("cursor-pkg", "skill");
      assert.ok(!existsSync(mdcPath));
    });

    it("never corrupts unmanaged user rule files and preserves backups", async () => {
      const cursorDir = join(home, ".cursor", "rules");
      mkdirSync(cursorDir, { recursive: true });
      const userRuleFile = join(cursorDir, "my-tool.mdc");
      writeFileSync(userRuleFile, "---\ndescription: User Custom Rule\n---\nDo not overwrite me!\n");

      // Installing a package with same name creates a .bak backup of user file
      const src = createDummySource("my-tool");
      await cursorAdapter.install("my-tool", src, "skill", { version: "1.0.0", description: "Forge package" });

      assert.ok(existsSync(userRuleFile + ".bak"), "Backup .bak must be created for user content");
      const bakContent = readFileSync(userRuleFile + ".bak", "utf-8");
      assert.ok(bakContent.includes("Do not overwrite me!"));
    });
  });

  // --- Claude Code ---
  describe("Claude Code adapter", () => {
    it("tolerates missing .claude directory during operations", async () => {
      assert.equal(await claudeAdapter.isInstalled("nonexistent"), false);
      const list = await claudeAdapter.list();
      assert.deepEqual(list, []);

      // Uninstall on empty environment should not throw
      await claudeAdapter.uninstall("nonexistent", "skill");

      // Install creates target directories
      const src = createDummySource("claude-pkg");
      await claudeAdapter.install("claude-pkg", src, "skill", { version: "1.0.0", description: "Claude test" });

      assert.ok(await claudeAdapter.isInstalled("claude-pkg"));
    });

    it("preserves user conventions in CLAUDE.md byte-for-byte outside forge markers", async () => {
      const claudeMd = join(dir, "CLAUDE.md");
      const userConventions = "# Custom Project Guidelines\n\n- Always write tests\n- Keep functions small\n";
      writeFileSync(claudeMd, userConventions);

      const src = createDummySource("helper");
      await claudeAdapter.install("helper", src, "skill", { version: "1.0.0", description: "Helper skill" });

      let content = readFileSync(claudeMd, "utf-8");
      assert.ok(content.startsWith(userConventions), "User conventions must be preserved at top");
      assert.ok(content.includes('id="helper"'), "Forge block must be present");

      // Bump version
      await claudeAdapter.install("helper", src, "skill", { version: "2.0.0", description: "Helper skill v2" });
      content = readFileSync(claudeMd, "utf-8");
      assert.ok(content.startsWith(userConventions));
      assert.ok(content.includes('version="2.0.0"'));

      // Uninstall removes only the forge block
      await claudeAdapter.uninstall("helper", "skill");
      content = readFileSync(claudeMd, "utf-8");
      assert.equal(content.trim(), userConventions.trim());
    });
  });

  // --- Windsurf ---
  describe("Windsurf adapter", () => {
    it("tolerates missing .windsurf directory during operations", async () => {
      assert.equal(await windsurfAdapter.isInstalled("nonexistent"), false);
      const list = await windsurfAdapter.list();
      assert.deepEqual(list, []);

      await windsurfAdapter.uninstall("nonexistent", "skill");

      const src = createDummySource("ws-pkg");
      await windsurfAdapter.install("ws-pkg", src, "skill", { version: "1.0.0", description: "Windsurf test" });
      assert.ok(await windsurfAdapter.isInstalled("ws-pkg"));
    });

    it("preserves user rules in .windsurfrules non-destructively", async () => {
      writeFileSync(join(dir, "package.json"), '{"name":"test"}\n');
      const rulesFile = join(dir, ".windsurfrules");
      const userRules = "# User Rules\n\n- Be concise\n";
      writeFileSync(rulesFile, userRules);

      const src = createDummySource("ws-skill");
      await windsurfAdapter.install("ws-skill", src, "skill", { version: "1.0.0", description: "WS skill" });

      let content = readFileSync(rulesFile, "utf-8");
      assert.ok(content.startsWith(userRules));
      assert.ok(content.includes('id="ws-skill"'));

      await windsurfAdapter.uninstall("ws-skill", "skill");
      content = readFileSync(rulesFile, "utf-8");
      assert.equal(content.trim(), userRules.trim());
    });
  });

  // --- MCP Safety ---
  describe("MCP Config Safety", () => {
    it("fails closed on corrupted/invalid JSON without corrupting file", () => {
      const badJsonPath = join(dir, "corrupt-mcp.json");
      writeFileSync(badJsonPath, "{ bad json, not valid }");

      assert.throws(() => {
        readMcpConfig(badJsonPath);
      }, /contains invalid JSON/);

      // File content must remain unchanged
      assert.equal(readFileSync(badJsonPath, "utf-8"), "{ bad json, not valid }");
    });

    it("creates .bak before modifying MCP configuration", () => {
      const mcpPath = join(dir, "valid-mcp.json");
      writeFileSync(mcpPath, JSON.stringify({ mcpServers: { existing: { command: "test" } } }, null, 2));

      addMcpServerToConfig(mcpPath, "new-server", { command: "node", args: ["server.js"] });

      assert.ok(existsSync(mcpPath + ".bak"), "Backup .bak must exist");
      const bakParsed = JSON.parse(readFileSync(mcpPath + ".bak", "utf-8"));
      assert.ok(bakParsed.mcpServers.existing);
      assert.ok(!bakParsed.mcpServers["new-server"]);
    });
  });
});
