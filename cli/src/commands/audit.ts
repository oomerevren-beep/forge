// cli/src/commands/audit.ts — trust-tier audit + static security scan (Phase 3).
//
// Two layers:
//   1. Trust tier per installed package (verified vs community vs mock).
//   2. Static scan of on-disk package content (shell-danger, prompt-inject,
//      perm-violation — see core/scan.ts).
// Any HIGH-severity scan finding fails the audit (exit 1, fail-closed).

import { existsSync } from "fs";
import { join } from "path";
import { readLinks, packageDir } from "../core/store.js";
import { loadPackageDetail } from "../core/registry.js";
import { isPlaceholderSha } from "../core/installer.js";
import { scanPackageDir, type ScanFinding } from "../core/scan.js";
import { findProjectToml, loadProjectToml } from "../core/project.js";

export interface AuditFinding {
  pkg: string;
  level: "high" | "warn" | "info";
  message: string;
}

export async function runAudit(opts: { json?: boolean; dirs?: Record<string, string> } = {}): Promise<void> {
  // opts.dirs overrides the links store (tests + `forge audit <path>` flows).
  const entries = opts.dirs
    ? Object.entries(opts.dirs).map(([pkg, dir]) => ({ pkg, dir, version: "scan", slug: pkg }))
    : Object.values(readLinks()).map((rec) => ({ pkg: rec.pkg, dir: packageDir(rec.slug, rec.version), version: rec.version, slug: rec.slug }));

  const findings: AuditFinding[] = [];

  if (entries.length === 0) {
    console.log("[forge] audit: no installed packages — nothing to check");
    return;
  }

  // Project permission boundaries apply to content checks when present.
  let permissions;
  try {
    const tomlPath = findProjectToml(process.cwd());
    if (tomlPath) permissions = loadProjectToml(tomlPath).permissions;
  } catch { /* project parse is best-effort here; tier checks still run */ }

  for (const rec of entries) {
    if (!opts.dirs) {
      try {
        const detail = await loadPackageDetail(rec.pkg);
        const meta = detail.versions[rec.version];
        if (!meta) {
          findings.push({ pkg: rec.pkg, level: "warn", message: `version ${rec.version} not in registry` });
          continue;
        }
        if (meta.sha256 && isPlaceholderSha(meta.sha256)) {
          findings.push({ pkg: rec.pkg, level: "info", message: "community tier (unverified tarball) — install needs --mock" });
        } else if (!meta.verified) {
          findings.push({ pkg: rec.pkg, level: "warn", message: "sha256 not verified against tarball content" });
        }
        if (!meta.tarball || meta.tarball.includes("placeholder")) {
          findings.push({ pkg: rec.pkg, level: "warn", message: `tarball URL placeholder` });
        }
        // On-disk truth: .forge-mock marker means this install is mock content (--mock).
        try {
          if (existsSync(join(packageDir(rec.slug, rec.version), ".forge-mock"))) {
            findings.push({ pkg: rec.pkg, level: "info", message: `installed from MOCK content (--mock was used)` });
          }
        } catch { /* marker check is best-effort; unreadable dir simply means "not mock" */ }
      } catch (e) {
        findings.push({ pkg: rec.pkg, level: "warn", message: `registry read failed: ${(e as Error).message}` });
      }
    }

    // Static scan of on-disk content (always runs when the dir exists).
    if (existsSync(rec.dir)) {
      const scan: ScanFinding[] = scanPackageDir(rec.dir, { permissions });
      for (const f of scan) {
        findings.push({
          pkg: rec.pkg,
          level: f.severity === "high" ? "high" : f.severity === "medium" ? "warn" : "info",
          message: `[${f.rule}] ${f.file}${f.line > 0 ? `:${f.line}` : ""} — ${f.message}`,
        });
      }
    }
  }

  const highs = findings.filter((f) => f.level === "high").length;

  if (opts.json) {
    console.log(JSON.stringify({ packages: entries.length, findings, highs }, null, 2));
    if (highs > 0) process.exitCode = 1;
    return;
  }

  console.log(`[forge] audit — ${entries.length} package(s) checked:\n`);
  if (findings.length === 0) {
    console.log("[forge] ✓ no issues");
  } else {
    for (const f of findings.slice(0, 30)) {
      console.log(`  [${f.level}] ${f.pkg}: ${f.message}`);
    }
    if (findings.length > 30) console.log(`  ... and ${findings.length - 30} more`);
  }
  if (highs > 0) {
    console.log(`\n[forge] ✗ audit FAILED: ${highs} high-severity finding(s) — refusing to pass`);
    process.exitCode = 1;
  } else {
    console.log(`\n[forge] audit done: ${findings.length} finding(s)`);
  }
}
