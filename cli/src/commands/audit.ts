// cli/src/commands/audit.ts — Standardized JSON output for CI/CD (FVP).

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

export interface AuditOpts {
  json?: boolean;
  dirs?: Record<string, string>;
}

export async function runAudit(opts: AuditOpts = {}): Promise<void> {
  const entries = opts.dirs
    ? Object.entries(opts.dirs).map(([pkg, dir]) => ({ pkg, dir, version: "scan", slug: pkg }))
    : Object.values(readLinks()).map((rec) => ({ pkg: rec.pkg, dir: packageDir(rec.slug, rec.version), version: rec.version, slug: rec.slug }));

  const findings: AuditFinding[] = [];

  if (entries.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ packages: 0, findings: [], highs: 0, timestamp: new Date().toISOString() }, null, 2));
    } else {
      console.log("[forge] audit: no installed packages — nothing to check");
    }
    return;
  }

  let permissions;
  try {
    const tomlPath = findProjectToml(process.cwd());
    if (tomlPath) permissions = loadProjectToml(tomlPath).permissions;
  } catch { /* best-effort */ }

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
          findings.push({ pkg: rec.pkg, level: "warn", message: "tarball URL placeholder" });
        }
        try {
          if (existsSync(join(packageDir(rec.slug, rec.version), ".forge-mock"))) {
            findings.push({ pkg: rec.pkg, level: "info", message: "installed from MOCK content (--mock was used)" });
          }
        } catch { /* best-effort */ }
      } catch (e) {
        findings.push({ pkg: rec.pkg, level: "warn", message: `registry read failed: ${(e as Error).message}` });
      }
    }

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
    const output = {
      packages: entries.length,
      findings,
      highs,
      timestamp: new Date().toISOString(),
      status: highs > 0 ? "FAILED" : "PASSED",
    };
    console.log(JSON.stringify(output, null, 2));
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
    console.log(`\n[forge] ✓ audit done: ${findings.length} finding(s)`);
  }
}
