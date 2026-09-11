import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runDoctor } from "../cli/src/commands/doctor.js";
import { runAudit } from "../cli/src/commands/audit.js";

describe("forge machine-readable outputs — --json support (FAZ P1)", () => {
  let dir = "";
  let prevCwd = "";
  let prevTestHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-json-test-"));
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

  it("forge doctor --json outputs valid parseable JSON", async () => {
    let captured = "";
    const origLog = console.log;
    console.log = (msg: unknown) => {
      captured += String(msg) + "\n";
    };

    try {
      await runDoctor({ cwd: dir, json: true });
      const parsed = JSON.parse(captured.trim());
      assert.equal(typeof parsed.ok, "boolean");
      assert.ok(Array.isArray(parsed.checks));
      assert.ok(Array.isArray(parsed.adapters));
      assert.equal(typeof parsed.node, "object");
      assert.equal(typeof parsed.os, "object");
    } finally {
      console.log = origLog;
    }
  });

  it("forge audit --json outputs valid parseable JSON", async () => {
    let captured = "";
    const origLog = console.log;
    console.log = (msg: unknown) => {
      captured += String(msg) + "\n";
    };

    try {
      await runAudit({ json: true });
      const parsed = JSON.parse(captured.trim());
      assert.equal(typeof parsed.packages, "number");
      assert.ok(Array.isArray(parsed.findings));
      assert.equal(typeof parsed.highs, "number");
      assert.equal(typeof parsed.timestamp, "string");
    } finally {
      console.log = origLog;
    }
  });

  it("forge list --json outputs valid parseable JSON array", () => {
    const cliPath = join(prevCwd, "dist", "index.cjs");
    const res = spawnSync(process.execPath, [cliPath, "list", "--json"], {
      encoding: "utf-8",
      cwd: prevCwd,
      env: { ...process.env, FORGE_TEST_HOME: dir },
    });
    assert.equal(res.status, 0, `Process failed: ${res.stderr}`);
    const parsed = JSON.parse(res.stdout.trim());
    assert.ok(Array.isArray(parsed));
  });

  it("forge search <query> --json outputs valid parseable JSON array", () => {
    const cliPath = join(prevCwd, "dist", "index.cjs");
    const res = spawnSync(process.execPath, [cliPath, "search", "plan", "--json"], {
      encoding: "utf-8",
      cwd: prevCwd,
      env: { ...process.env, FORGE_TEST_HOME: dir },
    });
    assert.equal(res.status, 0, `Process failed: ${res.stderr}`);
    const parsed = JSON.parse(res.stdout.trim());
    assert.ok(Array.isArray(parsed));
    assert.ok(parsed.length > 0);
    assert.equal(typeof parsed[0].name, "string");
    assert.equal(typeof parsed[0].type, "string");
    assert.equal(typeof parsed[0].latest, "string");
  });
});
