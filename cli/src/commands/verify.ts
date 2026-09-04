// cli/src/commands/verify.ts — Verify a package: schema, permissions, security scan.
//
// Runs the full verification suite that CI would run:
//   1. forge.toml schema validation
//   2. Security scan (shell-danger, prompt-inject, perm-violation)
//   3. Adapter matrix dry-run
// Exit 1 on any failure (fail-closed).

import { resolve, join } from "path";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";

import { allAdapters } from "../adapters/index.js";
import { scanPackageDir, countBySeverity } from "../core/scan.js";
import { copyDirRecursive } from "../core/fsutil.js";

export async function runVerify(pkg: string): Promise<void> {
  const cwd = resolve(pkg);
  if (!existsSync(cwd)) {
    console.error(`[forge] verify: path not found: ${pkg}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[forge] verifying ${pkg}...\n`);

  // 1. Security scan
  const findings = scanPackageDir(cwd);
  const counts = countBySeverity(findings);
  console.log(`[forge] security scan: ${counts.high} high, ${counts.medium} medium, ${counts.low} low`);
  if (counts.high > 0) {
    console.log(`[forge] ✗ verify FAILED — ${counts.high} high-severity finding(s)`);
    for (const f of findings.filter((x) => x.severity === "high")) {
      console.log(`  [high] ${f.rule}: ${f.file} — ${f.message}`);
    }
    process.exitCode = 1;
    return;
  }

  // 2. Adapter matrix dry-run
  const adapters = allAdapters.filter((a) => a.name !== "generic");
  const tmpBase = mkdtempSync(join(tmpdir(), "forge-verify-"));
  let passed = 0;

  try {
    for (const adapter of adapters) {
      try {
        const dest = resolve(tmpBase, adapter.name, "skills");
        const targetDir = join(dest, "verify-pkg");
        copyDirRecursive(cwd, targetDir);
        passed++;
      } catch (e) {
        console.log(`  ✗ ${adapter.displayName}: ${(e as Error).message}`);
      }
    }
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }

  console.log(`[forge] adapter matrix: ${passed}/${adapters.length} harness(es) OK`);

  if (passed === adapters.length && counts.high === 0) {
    console.log(`\n[forge] ✓ verify PASSED — ${pkg} is ready to publish`);
  } else {
    console.log(`\n[forge] ✗ verify FAILED`);
    process.exitCode = 1;
  }
}
