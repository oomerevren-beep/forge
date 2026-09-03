// cli/src/commands/audit.ts — Faz 10 iskelet (Faz 22'de tam güvenlik denetimi)
// Şimdilik: placeholder SHA, eksik alan, bozuk link taraması. Exit 0 her zaman (placeholder Faz 2'den kalma, fail değil).

import { readLinks } from "../core/store.js";
import { loadPackageDetail } from "../core/registry.js";
import { isPlaceholderSha } from "../core/installer.js";

export async function runAudit(opts: { json?: boolean } = {}): Promise<void> {
  const links = readLinks();
  const entries = Object.values(links);
  const findings: { pkg: string; level: "warn" | "info"; message: string }[] = [];

  if (entries.length === 0) {
    console.log("[forge] audit: no installed packages — nothing to check");
    console.log("[forge] audit: full vulnerability DB in Faz 22");
    return;
  }

  for (const rec of entries) {
    try {
      const detail = loadPackageDetail(rec.pkg);
      const meta = detail.versions[rec.version];
      if (!meta) {
        findings.push({ pkg: rec.pkg, level: "warn", message: `version ${rec.version} not in registry` });
        continue;
      }
      if (meta.sha256 && isPlaceholderSha(meta.sha256)) {
        findings.push({ pkg: rec.pkg, level: "info", message: `placeholder SHA (mock content, Faz 5'te 5 gerçek SHA — kalan Faz 22'de)` });
      }
      if (!meta.tarball || meta.tarball.includes("placeholder")) {
        findings.push({ pkg: rec.pkg, level: "warn", message: `tarball URL placeholder` });
      }
    } catch (e) {
      findings.push({ pkg: rec.pkg, level: "warn", message: `registry read failed: ${(e as Error).message}` });
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ packages: entries.length, findings }, null, 2));
    return;
  }

  console.log(`[forge] audit — ${entries.length} package(s) checked (skeleton, full DB Faz 22):\n`);
  if (findings.length === 0) {
    console.log("[forge] ✓ no issues");
  } else {
    for (const f of findings.slice(0, 30)) {
      console.log(`  [${f.level}] ${f.pkg}: ${f.message}`);
    }
    if (findings.length > 30) console.log(`  ... and ${findings.length - 30} more`);
  }
  console.log(`\n[forge] audit done: ${findings.length} finding(s)`);
}
