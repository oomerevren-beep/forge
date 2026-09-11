import { existsSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";
import { resolveVersion, satisfiesRange } from "../core/registry.js";
import { ensurePackageContent } from "../core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, toSlug } from "../core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig } from "../adapters/index.js";
import { findProjectToml, loadProjectToml, validateProjectToml } from "../core/project.js";
import { readLock, writeLock, verifyLockIntegrity, lockEntryFor, type LockEntry } from "../core/lock.js";
import { loadConfig } from "../core/config.js";
import { scanPackageDir } from "../core/scan.js";
import { parseSourceArg, resolveExternalSource } from "../core/sources.js";
import { storeExternal } from "./add-external.js";
import { injectMcpServers } from "./sync.js";
import { formatKnownPattern, formatActionableError } from "../core/errors.js";

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

export async function runInstall(opts: { cwd?: string; frozen?: boolean; mock?: boolean; skipScan?: boolean } = {}): Promise<void> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const tomlPath = findProjectToml(cwd);
  if (!tomlPath) {
    console.error(formatKnownPattern(`forge.toml not found in ${cwd}`));
    process.exit(1);
  }

  let project;
  try {
    project = loadProjectToml(tomlPath);
  } catch (e) {
    console.error(formatActionableError(e));
    process.exit(1);
  }

  const errs = validateProjectToml(project);
  if (errs.length > 0) {
    for (const er of errs) console.error(`[forge] ${er}`);
    process.exit(1);
  }

  const deps = project.dependencies;
  const hasSkills = Object.keys(project.skills ?? {}).length > 0;
  if (Object.keys(deps).length === 0 && !hasSkills) {
    console.log(`[forge] no dependencies in ${tomlPath}`);
    return;
  }

  // --frozen: install exactly from lock
  if (opts.frozen) {
    const lock = readLock(cwd);
    if (!lock) {
      console.error(formatKnownPattern(`--frozen requires forge.lock, but none found in ${cwd}`));
      process.exit(1);
    }
    // verify lock matches dependencies keys (at least every dep has an entry)
    // AND that each locked version still satisfies forge.toml's range —
    // a hand-aged lock must never silently downgrade under --frozen.
    const lockMap = new Map(lock.packages.map((p) => [p.name, p]));
    for (const [depName, depRange] of Object.entries(deps)) {
      const locked = lockMap.get(depName);
      if (!locked) {
        console.error(formatKnownPattern(`--frozen: lock missing package "${depName}"`));
        process.exit(1);
      }
      if (!satisfiesRange(locked.version, depRange)) {
        console.error(formatKnownPattern(`--frozen: locked ${depName}@${locked.version} does not satisfy forge.toml range "${depRange}"`));
        process.exit(1);
      }
    }
    console.log(`[forge] installing ${lock.packages.length} package(s) from forge.lock (frozen)...`);
    // Security barrier: yanked versions and hash drift refuse the install.
    const integrityIssues = await verifyLockIntegrity(lock, { allowMock: opts.mock });
    if (integrityIssues.length > 0) {
      for (const issue of integrityIssues) console.error(formatKnownPattern(issue.message));
      process.exit(1);
    }
    const adapters = pickAdapters(project.forge?.harnesses);
    console.log(`[forge] harnesses: ${adapters.map((a) => a.displayName).join(", ")}`);
    const t0 = Date.now();
    let ok = 0;
    for (const entry of lock.packages) {
      try {
        if (entry.source && entry.source !== "registry") {
          const spec = parseSourceArg(entry.resolved ? `${entry.source.split("@")[0]}#${entry.resolved}` : entry.source);
          const staged = resolveExternalSource(spec);
          try {
            if (!opts.skipScan) {
              const highs = scanPackageDir(staged.dir, { permissions: project.permissions }).filter((f) => f.severity === "high");
              if (highs.length > 0) {
                throw new Error(`security scan FAILED (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing install`);
              }
            }
            if (entry.sha256 && staged.sha256 && entry.sha256 !== staged.sha256) {
              throw new Error(`integrity mismatch for ${entry.name}: lock=${entry.sha256.slice(0, 12)}… resolved=${staged.sha256.slice(0, 12)}…`);
            }
            const srcDir = storeExternal(staged);
            for (const adapter of adapters) {
              await adapter.install(toSlug(entry.name), srcDir, staged.type, { version: staged.version, description: staged.description });
            }
            ensureForgeDirs();
            const links = readLinks();
            links[entry.name] = {
              pkg: entry.name,
              version: staged.version,
              slug: toSlug(entry.name),
              type: staged.type,
              adapters: adapters.map((a) => a.name),
              installedAt: new Date().toISOString(),
              source: entry.source,
            };
            writeLinks(links);
            ok++;
            console.log(`  ✓ ${entry.name}@${staged.version} (from ${entry.source})`);
          } catch (e) {
            try { staged.cleanup(); } catch { /* best-effort */ }
            throw e;
          }
          continue;
        }

        const { detail, version, versionMeta } = await resolveVersion(entry.name, entry.version);
        const src = await ensurePackageContent(entry.name, version, detail, versionMeta, { allowMock: opts.mock });
        if (!opts.skipScan) {
          const highs = scanPackageDir(src, { permissions: project.permissions }).filter((f) => f.severity === "high");
          if (highs.length > 0) {
            throw new Error(`security scan FAILED for ${entry.name} (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing install`);
          }
        }
        for (const adapter of adapters) {
          await adapter.install(toSlug(entry.name), src, detail.type, {
            version,
            description: detail.description,
          });
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
        console.warn(`  ✗ ${entry.name} failed: ${formatActionableError(e)}`);
      }
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n[forge] ✓ installed ${ok}/${lock.packages.length} from lock in ${dt}s`);
    if (ok < lock.packages.length) process.exitCode = 1;
    return;
  }

  // Normal: resolve from dependencies (+ [skills] from the universal manifest)
  const skillEntries = Object.entries(project.skills ?? {});
  const totalWork = Object.keys(deps).length + skillEntries.length;
  console.log(`[forge] installing ${totalWork} package(s) from ${tomlPath}...`);
  const adapters = pickAdapters(project.forge?.harnesses);
  console.log(`[forge] harnesses: ${adapters.map((a) => a.displayName).join(", ")}`);

  const t0 = Date.now();
  const lockEntries: LockEntry[] = [];
  let ok = 0;
  let skipped = 0;

  // External [skills] (github:/URL/local) resolve outside the registry loop.
  for (const [skillName, ref] of skillEntries) {
    const source = ref.source ?? "registry";
    if (source === "registry") continue; // handled in the registry loop below
    try {
      const spec = parseSourceArg(ref.ref ? `${source}#${ref.ref}` : source);
      const staged = resolveExternalSource(spec);
      try {
        const highs = scanPackageDir(staged.dir, { permissions: project.permissions }).filter((f) => f.severity === "high");
        if (highs.length > 0) {
          throw new Error(`security scan FAILED (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing install`);
        }
        const srcDir = storeExternal(staged);
        for (const adapter of adapters) {
          await adapter.install(toSlug(skillName), srcDir, staged.type, { version: staged.version, description: staged.description });
        }
        ensureForgeDirs();
        const links = readLinks();
        links[skillName] = {
          pkg: skillName,
          version: staged.version,
          slug: toSlug(skillName),
          type: staged.type,
          adapters: adapters.map((a) => a.name),
          installedAt: new Date().toISOString(),
          source: staged.source,
        };
        writeLinks(links);
        lockEntries.push(lockEntryFor(skillName, staged.version, staged.type, { sha256: staged.sha256, resolved: staged.resolved }, staged.source));
        ok++;
        console.log(`  ✓ ${skillName}@${staged.version} (from ${staged.source})`);
      } catch (e) {
        try {
          staged.cleanup();
        } catch { /* best-effort */ }
        throw e;
      }
    } catch (e) {
      console.error(`  ✗ ${skillName} failed: ${formatActionableError(e)}`);
    }
  }

  // Registry skills without explicit source join the semver loop.
  const mergedDeps: Record<string, string> = { ...deps };
  for (const [skillName, ref] of skillEntries) {
    if ((ref.source ?? "registry") === "registry" && ref.version && mergedDeps[skillName] === undefined) {
      mergedDeps[skillName] = ref.version;
    }
  }

  // Check existing links to skip already-installed exact version? We reinstall if range resolves same version already installed? For idempotency allow skip? We'll still ensure content but count skipped.
  const existingLinks = readLinks();

  for (const [depName, depRange] of Object.entries(mergedDeps)) {
    try {
      const { detail, version, versionMeta } = await resolveVersion(depName, depRange);
      const already = existingLinks[depName];
      const isSameVersionInstalled = already?.version === version && existsSyncForSlug(toSlug(depName), version);
      if (isSameVersionInstalled) {
        // verify adapters still have it? For speed skip re-install? But ensure adapters have it
        // For mcp packages isInstalled checks skillDir which is not created — treat store existence as enough
        if (detail.type === "mcp") {
          lockEntries.push(lockEntryFor(depName, version, detail.type, versionMeta));
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
          lockEntries.push(lockEntryFor(depName, version, detail.type, versionMeta));
          skipped++;
          console.log(`  = ${depName}@${version} already installed across ${adapters.length} harness(es)`);
          continue;
        }
      }
      const src = await ensurePackageContent(depName, version, detail, versionMeta, { allowMock: opts.mock });
      if (!opts.skipScan) {
        const highs = scanPackageDir(src, { permissions: project.permissions }).filter((f) => f.severity === "high");
        if (highs.length > 0) {
          throw new Error(`security scan FAILED for ${depName} (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing install`);
        }
      }
      for (const adapter of adapters) {
        await adapter.install(toSlug(depName), src, detail.type, { version, description: detail.description });
        if (detail.type === "mcp" && versionMeta.mcp) {
          const cfgPath = adapter.mcpConfigPath();
          if (cfgPath) addMcpServerToConfig(cfgPath, toSlug(depName), versionMeta.mcp);
        }
      }
      // deps of dep (one level)
      const subDeps = versionMeta.dependencies ?? {};
      for (const [subName, subRange] of Object.entries(subDeps)) {
        try {
          const sub = await resolveVersion(subName, subRange);
          const subSrc = await ensurePackageContent(subName, sub.version, sub.detail, sub.versionMeta, { allowMock: opts.mock });
          for (const adapter of adapters) await adapter.install(toSlug(subName), subSrc, sub.detail.type, { version: sub.version, description: sub.detail.description });
          console.log(`    dep ${subName}@${sub.version}`);
        } catch (e) {
          console.warn(`    ! dep ${subName} failed: ${formatActionableError(e)}`);
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
      lockEntries.push(lockEntryFor(depName, version, detail.type, versionMeta));
      ok++;
      console.log(`  ✓ ${depName}@${version}`);
    } catch (e) {
      console.error(`  ✗ ${depName} failed: ${formatActionableError(e)}`);
    }
  }

  // Write lock (deterministic order)
  lockEntries.sort((a, b) => a.name.localeCompare(b.name));
  writeLock(lockEntries, cwd);

  // Project MCP servers → every adapter config.
  const mcpServers = project.mcp?.servers ?? {};
  if (Object.keys(mcpServers).length > 0) {
    const writes = injectMcpServers(adapters, mcpServers);
    console.log(`[forge] ✓ ${Object.keys(mcpServers).length} MCP server(s) injected (${writes} config writes)`);
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const total = ok + skipped;
  const failed = totalWork - total;
  if (failed > 0) {
    console.log(`\n[forge] ✗ ${failed} package(s) failed — installed ${ok} new, ${skipped} cached (${total}/${totalWork}) on ${adapters.length} harness(es) in ${dt}s`);
    process.exitCode = 1;
  } else {
    console.log(`\n[forge] ✓ installed ${ok} new, ${skipped} cached (${total}/${totalWork}) on ${adapters.length} harness(es) in ${dt}s`);
  }
  console.log(`[forge] lock written to ${cwd}/forge.lock`);
}

function existsSyncForSlug(slug: string, version: string): boolean {
  return existsSync(join(homedir(), ".forge", "packages", `${slug}@${version}`));
}
