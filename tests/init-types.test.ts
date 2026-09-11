import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runInit } from "../cli/src/commands/init.js";

// Phase 11: init produces real skeletons for all 6 types
describe("forge init — Phase 11 (6 types)", () => {
  const cases: { type: string; files: string[] }[] = [
    { type: "skill", files: ["forge.toml", "SKILL.md"] },
    { type: "mcp", files: ["forge.toml", "mcp.json", "src/index.ts"] },
    { type: "agent", files: ["forge.toml", "agent.md"] },
    { type: "command", files: ["forge.toml", "command.md"] },
    { type: "hook", files: ["forge.toml", "hook.json"] },
    { type: "plugin", files: ["forge.toml", "plugin.json", "index.js"] },
  ];
  for (const c of cases) {
    it(`init --type ${c.type} creates ${c.files.join(", ")}`, async () => {
      const dir = mkdtempSync(join(tmpdir(), `forge-init-${c.type}-`));
      try {
        await runInit({ name: `test/${c.type}-pkg`, type: c.type, cwd: dir });
        const target = join(dir, `test/${c.type}-pkg`);
        // name with slash creates subdir; simple names use cwd — handle both
        const base = existsSync(join(target, "forge.toml")) ? target : dir;
        for (const f of c.files) {
          assert.ok(existsSync(join(base, f)), `${c.type}: ${f} should exist`);
        }
        const toml = readFileSync(join(base, "forge.toml"), "utf-8");
        assert.ok(toml.includes(`type = "${c.type}"`));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("init --from-existing imports configs and honors --force flag", async () => {
    const dir = mkdtempSync(join(tmpdir(), "forge-init-existing-"));
    try {
      const { writeFileSync } = await import("fs");
      writeFileSync(join(dir, ".cursorrules"), "# My Custom Skill\nDo something useful.\n");

      // First run: creates forge.toml
      await runInit({ fromExisting: true, cwd: dir });
      assert.ok(existsSync(join(dir, "forge.toml")));

      // Second run without force: process.exit(1)
      let exited = false;
      const origExit = process.exit;
      process.exit = ((code?: number) => {
        exited = true;
        throw new Error(`exit:${code ?? 0}`);
      }) as typeof process.exit;

      try {
        await runInit({ fromExisting: true, cwd: dir, force: false });
      } catch (e) {
        assert.ok((e as Error).message.startsWith("exit:"));
      } finally {
        process.exit = origExit;
      }
      assert.ok(exited, "should refuse to overwrite without force");

      // Third run with force: succeeds without throwing
      await runInit({ fromExisting: true, cwd: dir, force: true });
      assert.ok(existsSync(join(dir, "forge.toml")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
