// cli/src/commands/add-external.ts — Install from decentralized sources (Phase 3).
//
// Handles github:/git-URL/local-path packages: resolve → stage → security
// gate → copy into the forge store → install to adapters → record links.
// Fail-closed: HIGH scan findings refuse the install (exit 1) unless the
// package comes from the verified registry path (which only warns).

import {
  resolveExternalSource,
  type SourceSpec,
  type ExternalPackage,
} from "../core/sources.js";
import { copyDirRecursive } from "../core/fsutil.js";
import {
  ensureForgeDirs,
  readLinks,
  writeLinks,
  packageDir,
  toSlug,
} from "../core/store.js";
import { detectAdapters } from "../adapters/index.js";
import { scanPackageDir } from "../core/scan.js";
import { findProjectToml, loadProjectToml } from "../core/project.js";

export interface ExternalInstallOpts {
  dryRun?: boolean;
  mock?: boolean;
  skipScan?: boolean;
}

/**
 * Copy staged external content into the forge store (adapters symlink the
 * store, never tmp). Returns the store dir. Always cleans the stage dir.
 */
export function storeExternal(staged: ExternalPackage): string {
  const dest = packageDir(toSlug(staged.name), staged.version);
  try {
    ensureForgeDirs();
    // NOTE: raw fs.cpSync silently yields empty dirs under non-ASCII
    // Windows home paths — always use copyDirRecursive (see fsutil.ts).
    copyDirRecursive(staged.dir, dest);
    return dest;
  } finally {
    staged.cleanup();
  }
}

export async function installExternal(spec: SourceSpec, opts: ExternalInstallOpts = {}): Promise<void> {
  console.log(`[forge] resolving external source ${spec.source}...`);
  let staged;
  try {
    staged = resolveExternalSource(spec);
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
    return;
  }

  const slug = toSlug(staged.name);
  console.log(`[forge] found ${staged.name}@${staged.version} [${staged.type}] — ${staged.description}`);
  console.log(`[forge] source: ${staged.source} (external — no registry pin)`);

  if (opts.dryRun) {
    console.log(`[forge] (dry-run) would install to ~/.forge/packages/${slug}@${staged.version}/`);
    staged.cleanup();
    return;
  }

  // Security gate: HIGH findings refuse external installs (fail-closed).
  if (!opts.skipScan) {
    let permissions;
    try {
      const tomlPath = findProjectToml(process.cwd());
      if (tomlPath) permissions = loadProjectToml(tomlPath).permissions;
    } catch { /* project parse is best-effort; scan still runs */ }
    const findings = scanPackageDir(staged.dir, { permissions });
    const highs = findings.filter((f) => f.severity === "high");
    const mediums = findings.filter((f) => f.severity === "medium");
    for (const f of mediums.slice(0, 10)) {
      console.warn(`[forge] scan warn [${f.rule}] ${f.file}${f.line > 0 ? `:${f.line}` : ""} — ${f.message}`);
    }
    if (highs.length > 0) {
      console.error(`[forge] ✗ security scan FAILED for ${staged.name}: ${highs.length} high-severity finding(s)`);
      for (const f of highs.slice(0, 10)) {
        console.error(`[forge]   [high] [${f.rule}] ${f.file}${f.line > 0 ? `:${f.line}` : ""} — ${f.message}`);
      }
      console.error(`[forge] Refusing to install. Re-run with --skip-scan only if you trust this source.`);
      staged.cleanup();
      process.exitCode = 1;
      return;
    }
    console.log(`[forge] scan clean (${findings.length} finding(s), 0 high)`);
  }

  // Copy staged content into the store (adapters symlink the store, never tmp).
  const dest = storeExternal(staged);
  console.log(`[forge] package content ready: ${dest}`);

  const adapters = detectAdapters();
  console.log(`[forge] detected harnesses: ${adapters.map((a) => `${a.displayName} (${a.name})`).join(", ")}`);
  let failed = 0;
  for (const adapter of adapters) {
    try {
      await adapter.install(slug, dest, staged.type, { version: staged.version, description: staged.description });
      console.log(`  ✓ ${adapter.displayName} → ${adapter.skillDir(slug)}`);
    } catch (e) {
      console.warn(`  ✗ ${adapter.displayName} failed: ${(e as Error).message}`);
      failed++;
    }
  }
  if (failed > 0) {
    console.log(`\n[forge] ✗ ${failed} harness(es) failed — installed on ${adapters.length - failed}/${adapters.length}`);
    process.exitCode = 1;
  } else {
    console.log(`\n[forge] ✓ installed ${staged.name}@${staged.version} on ${adapters.length} harness(es)`);
  }

  ensureForgeDirs();
  const links = readLinks();
  links[staged.name] = {
    pkg: staged.name,
    version: staged.version,
    slug,
    type: staged.type,
    adapters: adapters.map((a) => a.name),
    installedAt: new Date().toISOString(),
    source: staged.source,
  };
  writeLinks(links);
}
