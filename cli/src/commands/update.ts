import { readLinks } from "../core/store.js";
import { loadPackageDetail, resolveVersion } from "../core/registry.js";
import { ensurePackageContent } from "../core/installer.js";
import { toSlug, ensureForgeDirs, writeLinks } from "../core/store.js";
import { detectAdapters, addMcpServerToConfig, allAdapters } from "../adapters/index.js";
import { loadConfig } from "../core/config.js";
import { readLock, writeLock, type LockEntry } from "../core/lock.js";
import { findProjectToml, loadProjectToml } from "../core/project.js";
import { resolve as resolvePath } from "path";

function pickAdapters(harnesses?: string[]) {
  if (harnesses && harnesses.length > 0) {
    const filtered = allAdapters.filter((a) => harnesses.includes(a.name));
    if (filtered.length) return filtered;
  }
  const cfg = loadConfig();
  if (cfg.defaultHarnesses.length) {
    const f = allAdapters.filter((a) => cfg.defaultHarnesses.includes(a.name));
    if (f.length) return f;
  }
  return detectAdapters();
}

export async function runOutdated(opts: { cwd?: string } = {}): Promise<void> {
  const cwd = resolvePath(opts.cwd ?? process.cwd());
  const links = readLinks();
  const entries = Object.values(links);
  if (entries.length === 0) {
    console.log("[forge] no packages installed");
    return;
  }
  let outdated = 0;
  for (const rec of entries) {
    try {
      const detail = loadPackageDetail(rec.pkg);
      const latest = detail.latest;
      if (latest !== rec.version) {
        // Check if latest is actually newer? simple string compare: if latest version > installed by semver naive
        console.log(`${rec.pkg}  ${rec.version} → ${latest} (latest)`);
        outdated++;
      }
    } catch {}
  }
  if (outdated === 0) console.log("[forge] all packages up to date");
  else console.log(`\n[forge] ${outdated} package(s) outdated — run 'forge update'`);
}

export async function runUpdate(pkgArg?: string, opts: { cwd?: string } = {}): Promise<void> {
  const cwd = resolvePath(opts.cwd ?? process.cwd());
  const links = readLinks();
  const lock = readLock(cwd);
  const tomlPath = findProjectToml(cwd);
  let projectHarnesses: string[] | undefined;
  if (tomlPath) {
    try {
      const proj = loadProjectToml(tomlPath);
      projectHarnesses = proj.forge?.harnesses;
    } catch {}
  }
  const adapters = pickAdapters(projectHarnesses);

  const targets: string[] = pkgArg ? [pkgArg] : Object.keys(links);
  if (targets.length === 0) {
    console.log("[forge] nothing to update — no installed packages");
    return;
  }

  let updated = 0;
  for (const name of targets) {
    const rec = links[name];
    if (!rec) {
      console.warn(`[forge] ${name} not installed — skipping`);
      continue;
    }
    try {
      const detail = loadPackageDetail(name);
      const latest = detail.latest;
      if (latest === rec.version) {
        console.log(`  = ${name}@${rec.version} already latest`);
        continue;
      }
      const { version, versionMeta } = resolveVersion(name, latest);
      const src = await ensurePackageContent(name, version, detail, versionMeta);
      for (const adapter of adapters) {
        await adapter.install(toSlug(name), src, detail.type);
        if (detail.type === "mcp" && versionMeta.mcp) {
          const cfgPath = adapter.mcpConfigPath();
          if (cfgPath) addMcpServerToConfig(cfgPath, toSlug(name), versionMeta.mcp);
        }
      }
      ensureForgeDirs();
      links[name] = { ...rec, version, adapters: adapters.map((a) => a.name), installedAt: new Date().toISOString() };
      writeLinks(links);
      console.log(`  ✓ ${name} ${rec.version} → ${version}`);
      updated++;
    } catch (e) {
      console.warn(`  ✗ ${name} failed: ${(e as Error).message}`);
    }
  }

  // Refresh lock if project has one
  if (lock) {
    const updatedEntries: LockEntry[] = Object.values(links).map((r) => ({ name: r.pkg, version: r.version, type: r.type ?? "skill" }));
    updatedEntries.sort((a, b) => a.name.localeCompare(b.name));
    writeLock(updatedEntries, cwd);
    console.log(`[forge] lock refreshed: ${cwd}/forge.lock`);
  }

  if (updated === 0) console.log("[forge] nothing updated");
  else console.log(`\n[forge] ✓ updated ${updated} package(s)`);
}
