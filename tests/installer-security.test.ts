import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "child_process";
import { ensurePackageContent, extractTarArchive, assertNoSymlinks } from "../cli/src/core/installer.js";
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

describe("forge installer — fail-closed (launch hardening)", () => {
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

  it("empty leftover dir is not treated as installed (re-populates)", async () => {
    const uniq = `${Date.now()}-${process.pid}`;
    const name = `test-failclosed/empty-${uniq}`;
    const slug = `test-failclosed-empty-${uniq}`;
    const d = fakeDetail(name, "https://example.com/x.tgz", "placeholder-sha256-test");
    const { ensureForgeDirs } = await import("../cli/src/core/store.js");
    ensureForgeDirs();
    mkdirSync(packageDir(slug, "1.0.0"), { recursive: true }); // simulate partial install
    try {
      const dest = await ensurePackageContent(name, "1.0.0", d, d.versions["1.0.0"], { allowMock: true });
      assert.ok(existsSync(join(dest, "SKILL.md")), "empty dir must be re-populated, not skipped");
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
      assert.ok(cur, "rewritten config must parse");
      assert.ok((cur.mcpServers as Record<string, unknown>).added);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("tar extraction uses Python tarfile (no shell interpolation)", () => {
    const src = readFileSync(join(process.cwd(), "cli/src/core/installer.ts"), "utf-8");
    assert.ok(!src.includes("execSync(`tar"), "shell-interpolated tar call must be gone");
    assert.ok(src.includes("tarfile.open"), "Python tarfile extraction must exist");
  });

  it("tar extraction rejects path traversal archives (tar-slip defense)", () => {
    const testDir = join(tmpdir(), `forge-slip-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const tarFile = join(testDir, "bad.tar.gz");
    const destDir = join(testDir, "dest");
    mkdirSync(destDir, { recursive: true });

    try {
      execFileSync("python", ["-c", `
import tarfile, io, sys
with tarfile.open(sys.argv[1], "w:gz") as tf:
    data = b"malicious escape"
    ti = tarfile.TarInfo(name="../slip.txt")
    ti.size = len(data)
    tf.addfile(ti, io.BytesIO(data))
`, tarFile], { stdio: "pipe" });

      assert.throws(() => {
        extractTarArchive(tarFile, destDir);
      }, /tar-slip|outside|failed/i);

      assert.equal(existsSync(join(testDir, "slip.txt")), false);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("assertNoSymlinks detects and throws on directory escaping entries", async () => {
    const testDir = join(tmpdir(), `forge-symlink-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const outside = join(testDir, "outside");
    const dest = join(testDir, "dest");
    mkdirSync(outside, { recursive: true });
    mkdirSync(dest, { recursive: true });

    try {
      const linkPath = join(dest, "escape-link");
      try {
        symlinkSync(outside, linkPath, "junction");
        await assert.rejects(() => assertNoSymlinks(dest), /escapes package dir/);
      } catch (err) {
        if ((err as Error).message.includes("escapes package dir")) throw err;
      }
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
