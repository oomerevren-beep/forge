import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runDoctor } from "../cli/src/commands/doctor.js";

describe("forge doctor — diagnostic checklist & json (FAZ P1)", () => {
  let dir = "";
  let prevCwd = "";
  let prevTestHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-doctor-test-"));
    prevCwd = process.cwd();
    prevTestHome = process.env.FORGE_TEST_HOME;
    process.env.FORGE_TEST_HOME = dir;
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevTestHome === undefined) delete process.env.FORGE_TEST_HOME;
    else process.env.FORGE_TEST_HOME = prevTestHome;
    rmSync(dir, { recursive: true, force: true });
  });

  it("checks node version, OS, config, filesystem, registry, adapters", async () => {
    const res = await runDoctor({ cwd: dir });

    assert.equal(typeof res.ok, "boolean");
    assert.ok(res.node.valid, "Node.js version should be valid (>=18.0.0)");
    assert.equal(typeof res.node.version, "string");
    assert.equal(typeof res.os.platform, "string");
    assert.equal(typeof res.os.arch, "string");

    const checkNames = res.checks.map((c) => c.name);
    assert.ok(checkNames.includes("Node.js runtime"));
    assert.ok(checkNames.includes("Operating System"));
    assert.ok(checkNames.includes("Global Configuration"));
    assert.ok(checkNames.includes("Project Manifest"));
    assert.ok(checkNames.includes("Writable Directories"));
    assert.ok(checkNames.includes("Registry Accessibility"));
    assert.ok(checkNames.includes("Adapters"));
    assert.ok(checkNames.includes("Package Links"));

    const regCheck = res.checks.find((c) => c.name === "Registry Accessibility");
    assert.equal(regCheck?.status, "pass");
  });

  it("validates project forge.toml when present", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]\nname = "doctor-test"\nversion = "1.0.0"\n\n[dependencies]\n"anthropics/plan" = "^1.0.0"\n`,
    );

    const res = await runDoctor({ cwd: dir });
    const projCheck = res.checks.find((c) => c.name === "Project Manifest");
    assert.equal(projCheck?.status, "pass");
    assert.ok(projCheck?.message.includes("1 dep(s)"));
  });

  it("flags invalid forge.toml as fail", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]\nname = "doctor-test"\nversion = "1.0.0"\n\n[dependencies]\n"invalid name with spaces" = "1.0.0"\n`,
    );

    const res = await runDoctor({ cwd: dir });
    const projCheck = res.checks.find((c) => c.name === "Project Manifest");
    assert.equal(projCheck?.status, "fail");
    assert.equal(res.ok, false);
  });

  it("outputs structured JSON when --json option is enabled", async () => {
    let captured = "";
    const origLog = console.log;
    console.log = (msg: unknown) => {
      captured += String(msg) + "\n";
    };

    try {
      const res = await runDoctor({ cwd: dir, json: true });
      assert.ok(res);
      const parsed = JSON.parse(captured.trim());
      assert.equal(typeof parsed.ok, "boolean");
      assert.ok(Array.isArray(parsed.checks));
      assert.ok(Array.isArray(parsed.adapters));
      assert.equal(typeof parsed.timestamp, "string");
      assert.equal(parsed.node.required, ">=18.0.0");
    } finally {
      console.log = origLog;
    }
  });

  it("detects adapters and inspects MCP configs", async () => {
    // Simulate cursor adapter in project
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(join(dir, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { myServer: { command: "node" } } }));

    const res = await runDoctor({ cwd: dir });
    const cursor = res.adapters.find((a) => a.name === "cursor");
    assert.ok(cursor);
    assert.equal(cursor?.detected, true);
    assert.equal(cursor?.mcpValid, true);
    assert.equal(cursor?.mcpServersCount, 1);
  });

  it("flags adapter with corrupted MCP config as fail in doctor checks", async () => {
    // Malformed JSON in cursor mcp config
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(join(dir, ".cursor", "mcp.json"), "{ invalid json: true ");

    const res = await runDoctor({ cwd: dir });
    const cursor = res.adapters.find((a) => a.name === "cursor");
    assert.ok(cursor);
    assert.equal(cursor?.mcpValid, false);
    assert.ok(cursor?.error);

    const adapterCheck = res.checks.find((c) => c.name === "Adapters");
    assert.equal(adapterCheck?.status, "fail");
    assert.equal(res.ok, false);
  });
});
