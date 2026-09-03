import { existsSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";
import { loadIndex, resolveVersion, satisfiesRange } from "../core/registry.js";
import { ensurePackageContent } from "../core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, toSlug } from "../core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig } from "../adapters/index.js";
import { findProjectToml, loadProjectToml, validateProjectToml } from "../core/project.js";
import { readLock, writeLock, type LockEntry } from "../core/lock.js";
import { loadConfig } from "../core/config.js";

function pickAdapters(projectHarnesses?: string[]) {
  if (projectHarnesses && projectHarnesses.length > 0) {
    const filtered = allAdapters.filter((a) => projectHarnesses.includes(a.name));
    if (filtered.length === 0) {
      console.warn(`[forge] warning: [forge].harnesses has no known adapter, falling back to auto-detect`);
      return detectAdapters();
    }
    return filtered;
  }
  const cfg = loadConfig();
  if (cfg.defaultHarnesses.length > 0) {
    const filtered = allAdapters.filter((a) => cfg.defaultHarnesses.includes(a.name));
    if (filtered.length > 0) return filtered;
  }
  return detectAdapters();
}

export async function runInstall(opts: { cwd?: string; frozen?: boolean; mock?: boolean } = {}): Promise<void> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const tomlPath = findProjectToml(cwd);
  if (!tomlPath) {
    console.error(`[forge] forge.toml not found in ${cwd}`);
    console.error(`[forge] run 'forge init' to create a project, or create forge.toml with [dependencies]`);
    process.exit(1);
  }

  let project;
  try {
    project = loadProjectToml(tomlPath);
  } catch (e) {
    console.error(`[forge] ${(e as Error).message}`);
    process.exit(1);
  }

  const errs = validateProjectToml(project, tomlPath);
  if (errs.length > 0) {
    for (const er of errs) console.error(`[forge] ${er}`);
    process.exit(1);
  }

  const deps = project.dependencies;
  if (Object.keys(deps).length === 0) {
    console.log(`[forge] no dependencies in ${tomlPath}`);
    return;
  }

  // --frozen: install exactly from lock
  if (opts.frozen) {
    const lock = readLock(cwd);
    if (!lock) {
      console.error(`[forge] --frozen requires forge.lock, but none found in ${cwd}`);
      process.exit(1);
    }
    // verify lock matches dependencies keys (at least every dep has an entry)
    // AND that each locked version still satisfies forge.toml's range —
    // a hand-aged lock must never silently downgrade under --frozen.
    const lockMap = new Map(lock.packages.map((p) => [p.name, p]));
    for (const [depName, depRange] of Object.entries(deps)) {
      const locked = lockMap.get(depName);
      if (!locked) {
        console.error(`[forge] --frozen: lock missing ${depName} (run 'forge install' without --frozen to update lock)`);
        process.exit(1);
      }
      if (!satisfiesRange(locked.version, depRange)) {
        console.error(`[forge] --frozen: locked ${depName}@${locked.version} does not satisfy forge.toml range "${depRange}" (run 'forge install' without --frozen to update lock)`);
        process.exit(1);
      }
    }
    console.log(`[forge] installing ${lock.packages.length} package(s) from forge.lock (frozen)...`);
    const adapters = pickAdapters(project.forge?.harnesses);
    console.log(`[forge] harnesses: ${adapters.map((a) => a.displayName).join(", ")}`);
    const t0 = Date.now();
    let ok = 0;
    for (const entry of lock.packages) {
      try {
        const { detail, version, versionMeta } = resolveVersion(entry.name, entry.version);
        const src = await ensurePackageContent(entry.name, version, detail, versionMeta, { allowMock: opts.mock });
        for (const adapter of adapters) {
          await adapter.install(toSlug(entry.name), src, detail.type);
          if (detail.type === "mcp" && versionMeta.mcp) {
            const cfgPath = adapter.mcpConfigPath();
            if (cfgPath) addMcpServerToConfig(cfgPath, toSlug(entry.name), versionMeta.mcp);
          }
        }
        // update links
        const links = readLinks();
        links[entry.name] = {
          pkg: entry.name,
          version,
          slug: toSlug(entry.name),
          type: detail.type,
          adapters: adapters.map((a) => a.name),
          installedAt: new Date().toISOString(),
        };
        writeLinks(links);
        ok++;
        console.log(`  ✓ ${entry.name}@${version}`);
      } catch (e) {
        console.warn(`  ✗ ${entry.name} failed: ${(e as Error).message}`);
      }
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n[forge] ✓ installed ${ok}/${lock.packages.length} from lock in ${dt}s`);
    return;
  }

  // Normal: resolve from dependencies
  console.log(`[forge] installing ${Object.keys(deps).length} package(s) from ${tomlPath}...`);
  const adapters = pickAdapters(project.forge?.harnesses);
  console.log(`[forge] harnesses: ${adapters.map((a) => a.displayName).join(", ")}`);

  const t0 = Date.now();
  const lockEntries: LockEntry[] = [];
  let ok = 0;
  let skipped = 0;

  // Check existing links to skip already-installed exact version? We reinstall if range resolves same version already installed? For idempotency allow skip? We'll still ensure content but count skipped.
  const existingLinks = readLinks();

  for (const [depName, depRange] of Object.entries(deps)) {
    try {
      const { detail, version, versionMeta } = resolveVersion(depName, depRange);
      const already = existingLinks[depName];
      const isSameVersionInstalled = already?.version === version && existsSyncForSlug(toSlug(depName), version);
      if (isSameVersionInstalled) {
        // verify adapters still have it? For speed skip re-install? But ensure adapters have it
        // For mcp packages isInstalled checks skillDir which is not created — treat store existence as enough
        if (detail.type === "mcp") {
          lockEntries.push({ name: depName, version, type: detail.type });
          skipped++;
          console.log(`  = ${depName}@${version} already installed`);
          continue;
        }
        // We do lightweight check: if every adapter reports installed, skip heavy install
        let allPresent = true;
        for (const a of adapters) {
          if (!(await a.isInstalled(toSlug(depName)))) allPresent = false;
        }
        if (allPresent) {
          lockEntries.push({ name: depName, version, type: detail.type });
          skipped++;
          console.log(`  = ${depName}@${version} already installed`);
          continue;
        }
      }
      const src = await ensurePackageContent(depName, version, detail, versionMeta, { allowMock: opts.mock });
      for (const adapter of adapters) {
        await adapter.install(toSlug(depName), src, detail.type);
        if (detail.type === "mcp" && versionMeta.mcp) {
          const cfgPath = adapter.mcpConfigPath();
          if (cfgPath) addMcpServerToConfig(cfgPath, toSlug(depName), versionMeta.mcp);
        }
      }
      // deps of dep (one level)
      const subDeps = versionMeta.dependencies ?? {};
      for (const [subName, subRange] of Object.entries(subDeps)) {
        try {
          const sub = resolveVersion(subName, subRange);
          const subSrc = await ensurePackageContent(subName, sub.version, sub.detail, sub.versionMeta, { allowMock: opts.mock });
          for (const adapter of adapters) await adapter.install(toSlug(subName), subSrc, sub.detail.type);
          console.log(`    dep ${subName}@${sub.version}`);
        } catch (e) {
          console.warn(`    ! dep ${subName} failed: ${(e as Error).message}`);
        }
      }
      ensureForgeDirs();
      const links = readLinks();
      links[depName] = {
        pkg: depName,
        version,
        slug: toSlug(depName),
        type: detail.type,
        adapters: adapters.map((a) => a.name),
        installedAt: new Date().toISOString(),
      };
      writeLinks(links);
      lockEntries.push({ name: depName, version, type: detail.type });
      ok++;
      console.log(`  ✓ ${depName}@${version}`);
    } catch (e) {
      console.error(`  ✗ ${depName} failed: ${(e as Error).message}`);
    }
  }

  // Write lock (deterministic order)
  lockEntries.sort((a, b) => a.name.localeCompare(b.name));
  writeLock(lockEntries, cwd);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const total = ok + skipped;
  console.log(`\n[forge] ✓ installed ${ok} new, ${skipped} cached (${total}/${Object.keys(deps).length}) on ${adapters.length} harness(es) in ${dt}s`);
  console.log(`[forge] lock written to ${cwd}/forge.lock`);
}

function existsSyncForSlug(slug: string, version: string): boolean {
  return existsSync(join(homedir(), ".forge", "packages", `${slug}@${version}`));
}
