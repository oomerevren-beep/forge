import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runInit } from "../cli/src/commands/init.js";

// Faz 11: init 6 tip gerçek iskelet üretir
describe("forge init — Faz 11 (6 tip)", () => {
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
});
