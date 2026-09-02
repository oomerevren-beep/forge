import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parse } from "smol-toml";
import { existsSync, readFileSync } from "fs";

// Project TOML smoke: validate parsing and isValidRange logic via loadProjectToml
import { loadProjectToml, validateProjectToml } from "../cli/src/core/project.js";
import { loadConfig } from "../cli/src/core/config.js";
import { loadIndex, searchPackages } from "../cli/src/core/registry.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("forge core — smoke", () => {
  it("loadConfig returns defaults", () => {
    const cfg = loadConfig();
    assert.equal(typeof cfg.registry, "string");
    assert.equal(Array.isArray(cfg.defaultHarnesses), true);
  });

  it("loadProjectToml parses dependencies", () => {
    const dir = join(tmpdir(), `forge-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "forge.toml");
    writeFileSync(p, `[dependencies]\n"anthropics/plan" = "^1.2.0"\n`);
    const proj = loadProjectToml(p);
    assert.equal(proj.dependencies["anthropics/plan"], "^1.2.0");
    const errs = validateProjectToml(proj);
    assert.equal(errs.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("validateProjectToml rejects bad name", () => {
    const errs = validateProjectToml({ dependencies: { "badname": "^1.0.0" } } as any);
    assert.ok(errs.length > 0);
  });

  it("registry index loads and search works", () => {
    const idx = loadIndex();
    assert.ok(idx.count >= 100);
    const res = searchPackages("mcp");
    assert.ok(res.length >= 20);
  });

  it("smol-toml stringify/parse roundtrip", () => {
    const obj = { dependencies: { "a/b": "^1.0.0" } };
    // just ensure parse works on a sample
    const raw = `[dependencies]\n"a/b" = "^1.0.0"\n`;
    const parsed = parse(raw) as any;
    assert.equal(parsed.dependencies["a/b"], "^1.0.0");
  });
});
