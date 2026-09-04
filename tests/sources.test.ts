// tests/sources.test.ts — Phase 3: decentralized source resolution
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parseSourceArg, resolveLocalSource } from "../cli/src/core/sources.js";

describe("forge sources — decentralized resolution", () => {
  it("leaves versioned registry args to the registry path", () => {
    assert.equal(parseSourceArg("pdf/merge@^1.0.0").kind, "registry");
  });

  it("marks explicit sources, leaves bare owner/repo for registry-first", () => {
    assert.equal(parseSourceArg("github:o/r").explicit, true);
    assert.equal(parseSourceArg("https://github.com/o/r.git").explicit, true);
    assert.equal(parseSourceArg("./x").explicit, true);
    assert.equal(parseSourceArg("o/r").explicit, false);
  });

  it("classifies github: shorthand with optional ref", () => {
    const g = parseSourceArg("github:my-org/agent-security");
    assert.equal(g.kind, "github");
    assert.equal(g.ref, "my-org/agent-security");
    assert.equal(g.source, "github:my-org/agent-security");
    const gr = parseSourceArg("github:my-org/agent-security#main");
    assert.equal(gr.want, "main");
    assert.equal(gr.source, "github:my-org/agent-security@main");
  });

  it("classifies owner/repo as github (registry fallback handled by caller)", () => {
    const g = parseSourceArg("my-org/agent-security");
    assert.equal(g.kind, "github");
    assert.equal(g.ref, "my-org/agent-security");
  });

  it("classifies direct git URLs with #ref trailer", () => {
    const u = parseSourceArg("https://github.com/o/r.git#v1.0.0");
    assert.equal(u.kind, "github");
    assert.equal(u.ref, "https://github.com/o/r.git");
    assert.equal(u.want, "v1.0.0");
    const ssh = parseSourceArg("git@gitlab.com:o/r.git");
    assert.equal(ssh.kind, "git");
  });

  it("classifies local paths", () => {
    assert.equal(parseSourceArg("./packages/my-skill").kind, "local");
    assert.equal(parseSourceArg("../shared/skill").kind, "local");
    assert.equal(parseSourceArg("/abs/path/skill").kind, "local");
  });

  it("rejects malformed github: repos", () => {
    assert.throws(() => parseSourceArg("github:not-a-repo"), /owner\/repo/);
  });

  describe("local source staging", () => {
    let dir = "";
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "forge-src-"));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("parses forge.toml manifests", () => {
      const src = join(dir, "my-skill");
      mkdirSync(src, { recursive: true });
      writeFileSync(
        join(src, "forge.toml"),
        '[package]\nname = "team/my-skill"\nversion = "2.0.0"\ntype = "skill"\ndescription = "Team skill for testing"\n',
      );
      writeFileSync(join(src, "SKILL.md"), "# Team\n");
      const ext = resolveLocalSource(src);
      try {
        assert.equal(ext.kind, "local");
        assert.equal(ext.name, "team/my-skill");
        assert.equal(ext.version, "2.0.0");
        assert.equal(ext.type, "skill");
      } finally {
        ext.cleanup();
      }
    });

    it("falls back to SKILL.md conventions", () => {
      const src = join(dir, "solo");
      mkdirSync(src, { recursive: true });
      writeFileSync(join(src, "SKILL.md"), "# Solo Helper\n\nDoes things.\n");
      const ext = resolveLocalSource(src);
      try {
        assert.equal(ext.type, "skill");
        assert.ok(ext.description.includes("Solo Helper"));
      } finally {
        ext.cleanup();
      }
    });

    it("refuses dirs without any manifest", () => {
      const src = join(dir, "empty");
      mkdirSync(src, { recursive: true });
      assert.throws(() => resolveLocalSource(src), /no manifest/);
    });

    it("refuses missing dirs (fail-closed)", () => {
      assert.throws(() => resolveLocalSource(join(dir, "nope")), /not found/);
    });
  });
});
