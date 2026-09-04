// tests/sync.test.ts — Phase 3: one-command team sync
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { runSync } from "../cli/src/commands/sync.js";

describe("forge sync — team context distribution", () => {
  let dir = "";
  let home = "";
  let prev = "";
  let prevTestHome: string | undefined;
  let linksBak: string | null = null;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-sync-"));
    home = join(dir, "fake-home");
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    prev = process.cwd();
    prevTestHome = process.env.FORGE_TEST_HOME;
    process.env.FORGE_TEST_HOME = home;
    process.chdir(dir);
    // links.json lives in the REAL home — back it up, restore after.
    try {
      const p = join(homedir(), ".forge", "links.json");
      if (existsSync(p)) linksBak = readFileSync(p, "utf-8");
      else linksBak = "";
    } catch {
      linksBak = null;
    }
  });
  afterEach(() => {
    process.chdir(prev);
    if (prevTestHome === undefined) delete process.env.FORGE_TEST_HOME;
    else process.env.FORGE_TEST_HOME = prevTestHome;
    try {
      const p = join(homedir(), ".forge", "links.json");
      if (linksBak !== null && linksBak !== "") writeFileSync(p, linksBak);
      else if (linksBak === "" && existsSync(p)) {
        const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
        delete raw["pdf/merge"];
        writeFileSync(p, JSON.stringify(raw, null, 2));
      }
    } catch { /* best-effort restore */ }
    rmSync(dir, { recursive: true, force: true });
  });

  it("distributes skills + rules + MCP + roles in one run", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]\nname = "demo"\nversion = "1.0.0"\n\n` +
        `[dependencies]\n"pdf/merge" = "1.0.0"\n\n` +
        `[agents.developer]\nmodel = "test-model"\nsystem_prompt = "Be careful."\n\n` +
        `[mcp.servers.demo]\ncommand = "node"\nargs = ["x"]\n`,
    );
    await runSync({ cwd: dir, mock: true });

    // Cursor MDC rule (project scope — cwd has .cursor/)
    const mdc = join(dir, ".cursor", "rules", "pdf-merge.mdc");
    assert.ok(existsSync(mdc), "cursor .mdc rule written");
    assert.ok(readFileSync(mdc, "utf-8").includes("alwaysApply: false"));

    // Claude Code rule block (forge.toml marks the dir as a project)
    const claudeMd = readFileSync(join(dir, "CLAUDE.md"), "utf-8");
    assert.ok(claudeMd.includes('id="pdf-merge"'));

    // MCP server injected (generic adapter config in project .forge/)
    const mcp = JSON.parse(readFileSync(join(dir, ".forge", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, { command: string }>;
    };
    assert.equal(mcp.mcpServers.demo.command, "node");

    // Agent roles team block
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf-8");
    assert.ok(agents.includes("forge/team-roles") && agents.includes("test-model"));

    // Deterministic lock with integrity
    const lock = readFileSync(join(dir, "forge.lock"), "utf-8");
    assert.ok(lock.includes('name = "pdf/merge"') && lock.includes("sha256 = "));
  });

  it("refuses without forge.toml (exit 1)", async () => {
    const empty = join(dir, "empty");
    mkdirSync(empty, { recursive: true });
    const { spawnSync } = await import("child_process");
    void spawnSync;
    // runSync calls process.exit on missing manifest — assert it throws exits via code path
    let exited = false;
    const origExit = process.exit;
    process.exit = ((code?: number) => {
      exited = true;
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit;
    try {
      await runSync({ cwd: empty, mock: true });
    } catch (e) {
      assert.ok((e as Error).message.startsWith("exit:"));
    } finally {
      process.exit = origExit;
    }
    assert.ok(exited);
  });
});
