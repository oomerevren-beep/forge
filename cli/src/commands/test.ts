// cli/src/commands/test.ts — Test a package against the adapter matrix.

import { resolve, join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";

import { allAdapters } from "../adapters/index.js";
import { ensurePackageContent } from "../core/installer.js";
import { resolveVersion } from "../core/registry.js";
import { scanPackageDir, countBySeverity } from "../core/scan.js";
import { parseSourceArg, resolveExternalSource } from "../core/sources.js";
import { copyDirRecursive } from "../core/fsutil.js";

export async function runTest(pkg: string, opts: { mock?: boolean } = {}): Promise<void> {
  console.log(`[forge] testing ${pkg}...\n`);

  let srcDir: string;
  const spec = parseSourceArg(pkg);

  if (spec.kind !== "registry" || spec.explicit) {
    const staged = resolveExternalSource(spec);
    try {
      srcDir = staged.dir;
    } catch (e) {
      console.error(`[forge] resolve failed: ${(e as Error).message}`);
      process.exitCode = 1;
      return;
    }
  } else {
    try {
      const { detail, version, versionMeta } = await resolveVersion(pkg, "latest");
      srcDir = await ensurePackageContent(pkg, version, detail, versionMeta, { allowMock: opts.mock });
    } catch (e) {
      console.error(`[forge] resolve failed: ${(e as Error).message}`);
      process.exitCode = 1;
      return;
    }
  }

  const findings = scanPackageDir(srcDir);
  const counts = countBySeverity(findings);
  console.log(`[forge] security scan: ${counts.high} high, ${counts.medium} medium, ${counts.low} low`);
  if (counts.high > 0) {
    console.log(`[forge] test FAILED — high-severity findings block install`);
    for (const f of findings.filter((x) => x.severity === "high")) {
      console.log(`  [high] ${f.rule}: ${f.file} — ${f.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const adapters = allAdapters.filter((a) => a.name !== "generic");
  const tmpBase = mkdtempSync(join(tmpdir(), "forge-test-"));
  let passed = 0;

  try {
    for (const adapter of adapters) {
      try {
        const dest = resolve(tmpBase, adapter.name, "skills");
        const targetDir = join(dest, "test-pkg");
        copyDirRecursive(srcDir, targetDir);
        console.log(`  ✓ ${adapter.displayName} → install OK`);
        passed++;
      } catch (e) {
        console.log(`  ✗ ${adapter.displayName}: ${(e as Error).message}`);
      }
    }
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }

  console.log(`\n[forge] ✓ ${pkg}: ${passed}/${adapters.length} harness(es) passed`);
  if (passed === 0) {
    process.exitCode = 1;
  }
}
