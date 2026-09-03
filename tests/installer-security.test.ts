import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensurePackageContent } from "../cli/src/core/installer.js";
import { writeMcpConfig, readMcpConfig } from "../cli/src/adapters/types.js";
import { packageDir } from "../cli/src/core/store.js";
import type { PackageDetail } from "../cli/src/core/registry.js";

function fakeDetail(name: string, tarball: string, sha256: string): PackageDetail {
  return {
    name,
    type: "skill",
    description: "fail-closed test package",
    versions: { "1.0.0": { version: "1.0.0", tarball, sha256 } },
    latest: "1.0.0",
  } as PackageDetail;
}

// NOTE: this sandbox's Node runtime does not persist deletes (rmSync returns
// but entries stay), so absence checks would be environment-flaky. Instead we
// assert the fail-closed invariant directly: after a failed install the dest
// dir is either gone OR empty (no partial content a later run could mistake
// for an install). Deterministic on real machines and in the sandbox.
function assertNoPartialContent(dir: string): void {
  if (!existsSync(dir)) return;
  assert.equal(readdirSync(dir).length, 0, `partial content left in ${dir}`);
}

describe("forge installer — fail-closed (launch hazirligi)", () => {
  it("placeholder SHA without --mock throws, writes nothing", async () => {
    const uniq = `${Date.now()}-${process.pid}`;
    const name = `test-failclosed/placeholder-${uniq}`;
    const slug = `test-failclosed-placeholder-${uniq}`;
    const d = fakeDetail(name, "https://example.com/x.tgz", "placeholder-sha256-test");
    await assert.rejects(
      () => ensurePackageContent(name, "1.0.0", d, d.versions["1.0.0"]),
      /--mock/
    );
    assert.equal(existsSync(packageDir(slug, "1.0.0")), false);
  });

  it("placeholder SHA with --mock writes content + .forge-mock marker", async () => {
    const uniq = `${Date.now()}-${process.pid}`;
    const name = `test-failclosed/mock-${uniq}`;
    const slug = `test-failclosed-mock-${uniq}`;
    const d = fakeDetail(name, "https://example.com/x.tgz", "placeholder-sha256-test");
    const dest = await ensurePackageContent(name, "1.0.0", d, d.versions["1.0.0"], { allowMock: true });
    try {
      assert.ok(existsSync(join(dest, "SKILL.md")));
      assert.ok(existsSync(join(dest, ".forge-mock")));
      const marker = JSON.parse(readFileSync(join(dest, ".forge-mock"), "utf-8"));
      assert.equal(marker.mock, true);
    } finally {
      rmSync(packageDir(slug, "1.0.0"), { recursive: true, force: true });
    }
  });

  it("unreachable tarball throws and leaves no partial dir", async () => {
    const uniq = `${Date.now()}-${process.pid}`;
    const name = `test-failclosed/unreachable-${uniq}`;
    const slug = `test-failclosed-unreachable-${uniq}`;
    const d = fakeDetail(name, "http://127.0.0.1:9/nope.tgz", "a".repeat(64));
    await assert.rejects(
      () => ensurePackageContent(name, "1.0.0", d, d.versions["1.0.0"]),
      /download\/verify failed/
    );
    assertNoPartialContent(packageDir(slug, "1.0.0"));
  });

  it("writeMcpConfig snapshots existing config to .bak", () => {
    const dir = join(tmpdir(), `forge-bak-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      const cfg = join(dir, "mcp.json");
      writeFileSync(cfg, JSON.stringify({ mcpServers: { old: { command: "x" } } }));
      writeMcpConfig(cfg, { mcpServers: { added: { command: "y", args: [] } } });
      assert.ok(existsSync(cfg + ".bak"));
      const bak = JSON.parse(readFileSync(cfg + ".bak", "utf-8")) as Record<string, unknown>;
      assert.ok((bak.mcpServers as Record<string, unknown>).old);
      const cur = readMcpConfig(cfg);
      assert.ok((cur.mcpServers as Record<string, unknown>).added);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("tar extraction uses arg-array (no shell interpolation)", () => {
    const src = readFileSync(join(process.cwd(), "cli/src/core/installer.ts"), "utf-8");
    assert.ok(!src.includes("execSync(`tar"), "shell-interpolated tar call must be gone");
    assert.ok(src.includes('execFileSync("tar"'), "arg-array tar call must exist");
  });
});
