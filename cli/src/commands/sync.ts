// cli/src/commands/sync.ts — One-command team sync (Phase 3).
//
// A developer clones the repo and runs `npx forge sync`: forge.toml is read,
// every skill/dependency is resolved (registry or decentralized source),
// content lands in the store, and the CURRENTLY DETECTED editors all receive
// the same skills, rule files (Cursor MDC, CLAUDE.md, .windsurfrules,
// AGENTS.md), and [mcp.servers.*] configs. Agent roles sync as a team block
// in <project>/AGENTS.md. A deterministic forge.lock is written.

import { resolve, join } from "path";
import { resolveVersion } from "../core/registry.js";
import { ensurePackageContent } from "../core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, toSlug } from "../core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig, type Adapter } from "../adapters/index.js";
import {
  findProjectToml,
  loadProjectToml,
  validateProjectToml,
  type SkillRef,
} from "../core/project.js";
import { writeLock, lockEntryFor, type LockEntry } from "../core/lock.js";
import { parseSourceArg, resolveExternalSource } from "../core/sources.js";
import { storeExternal } from "./add-external.js";
import { scanPackageDir } from "../core/scan.js";
import { upsertForgeBlock } from "../core/merge.js";

/** Inject [mcp.servers.*] defs into every adapter config that supports it. Returns servers injected. */
export function injectMcpServers(
  adapters: Adapter[],
  servers: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>,
): number {
  let mcpCount = 0;
  for (const [serverName, def] of Object.entries(servers)) {
    for (const adapter of adapters) {
      try {
        const cfgPath = adapter.mcpConfigPath();
        if (cfgPath) {
          addMcpServerToConfig(cfgPath, serverName, { command: def.command, args: def.args, env: def.env });
          mcpCount++;
        }
      } catch (e) {
        console.warn(`  ! MCP ${serverName} → ${adapter.displayName} failed: ${(e as Error).message}`);
      }
    }
  }
  return mcpCount;
}

function pickAdapters(projectHarnesses?: string[]) {
  if (projectHarnesses && projectHarnesses.length > 0) {
    const filtered = allAdapters.filter((a) => projectHarnesses.includes(a.name));
    if (filtered.length > 0) return filtered;
  }
  return detectAdapters();
}

interface Resolved {
  name: string;
  version: string;
  type: string;
  description: string;
  srcDir: string;
  lock: LockEntry;
}

async function resolveSkill(
  name: string,
  ref: SkillRef,
  opts: { mock?: boolean; skipScan?: boolean },
): Promise<Resolved> {
  const source = ref.source ?? "registry";
  if (source === "registry") {
    const { detail, version, versionMeta } = await resolveVersion(name, ref.version ?? "latest");
    const srcDir = await ensurePackageContent(name, version, detail, versionMeta, { allowMock: opts.mock });
    if (!opts.skipScan) {
      const highs = scanPackageDir(srcDir).filter((f) => f.severity === "high");
      if (highs.length > 0) {
        console.warn(`[forge] scan: ${name} has ${highs.length} high finding(s) (registry package — warning only)`);
      }
    }
    return {
      name,
      version,
      type: detail.type,
      description: detail.description,
      srcDir,
      lock: lockEntryFor(name, version, detail.type, versionMeta),
    };
  }
  // Decentralized source: github: / URL / local path (+ optional #ref).
  const spec = parseSourceArg(ref.ref ? `${source}#${ref.ref}` : source);
  const staged = resolveExternalSource(spec);
  try {
    if (!opts.skipScan) {
      const highs = scanPackageDir(staged.dir).filter((f) => f.severity === "high");
      if (highs.length > 0) {
        throw new Error(
          `[forge] security scan FAILED for ${name} (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing sync`,
        );
      }
    }
    if (ref.version && staged.version !== ref.version) {
      console.warn(`[forge] warn: ${name} resolved ${staged.version}, forge.toml pins ${ref.version} (external sources pin via ref)`);
    }
    const srcDir = storeExternal(staged);
    return {
      name,
      version: staged.version,
      type: staged.type,
      description: staged.description,
      srcDir,
      lock: lockEntryFor(name, staged.version, staged.type, {}, staged.source),
    };
  } catch (e) {
    try {
      staged.cleanup();
    } catch { /* best-effort */ }
    throw e;
  }
}

export async function runSync(opts: { cwd?: string; mock?: boolean; skipScan?: boolean } = {}): Promise<void> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const tomlPath = findProjectToml(cwd);
  if (!tomlPath) {
    console.error(`[forge] forge.toml not found in ${cwd}`);
    process.exit(1);
  }

  let project;
  try {
    project = loadProjectToml(tomlPath);
  } catch (e) {
    console.error(`[forge] ${(e as Error).message}`);
    process.exit(1);
  }

  const errs = validateProjectToml(project);
  if (errs.length > 0) {
    for (const er of errs) console.error(`[forge] ${er}`);
    process.exit(1);
  }

  // Merge [dependencies] (registry ranges) and [skills] (any source).
  const work: { name: string; ref: SkillRef }[] = [
    ...Object.entries(project.dependencies).map(([name, version]) => ({ name, ref: { version } as SkillRef })),
    ...Object.entries(project.skills ?? {}).map(([name, ref]) => ({ name, ref })),
  ];
  if (work.length === 0 && !project.mcp?.servers && !project.agents) {
    console.log(`[forge] nothing to sync in ${tomlPath}`);
    return;
  }

  const adapters = pickAdapters(project.forge?.harnesses);
  console.log(`[forge] syncing ${work.length} skill(s) to ${adapters.map((a) => a.displayName).join(", ")}...`);

  const t0 = Date.now();
  const lockEntries: LockEntry[] = [];
  let ok = 0;
  for (const { name, ref } of work) {
    try {
      const r = await resolveSkill(name, ref, opts);
      for (const adapter of adapters) {
        await adapter.install(toSlug(r.name), r.srcDir, r.type, { version: r.version, description: r.description });
      }
      ensureForgeDirs();
      const links = readLinks();
      links[r.name] = {
        pkg: r.name,
        version: r.version,
        slug: toSlug(r.name),
        type: r.type,
        adapters: adapters.map((a) => a.name),
        installedAt: new Date().toISOString(),
        ...(r.lock.source !== "registry" ? { source: r.lock.source } : {}),
      };
      writeLinks(links);
      lockEntries.push(r.lock);
      ok++;
      console.log(`  ✓ ${r.name}@${r.version}`);
    } catch (e) {
      console.error(`  ✗ ${name} failed: ${(e as Error).message}`);
    }
  }

  // MCP servers from [mcp.servers.*] → every detected adapter config.
  const servers = project.mcp?.servers ?? {};
  const mcpCount = injectMcpServers(adapters, servers);
  if (Object.keys(servers).length > 0) console.log(`[forge] ✓ ${Object.keys(servers).length} MCP server(s) injected (${mcpCount} config writes)`);

  // Agent roles → team block in <project>/AGENTS.md (non-destructive).
  const roles = project.agents ?? {};
  const roleNames = Object.keys(roles);
  if (roleNames.length > 0) {
    const body = roleNames
      .map((role) => {
        const r = roles[role];
        return `- ${role}${r.model ? ` (model: ${r.model})` : ""}${r.system_prompt ? `\n  ${r.system_prompt}` : ""}`;
      })
      .join("\n");
    upsertForgeBlock(join(cwd, "AGENTS.md"), "forge/team-roles", "1", `# Team agent roles (from forge.toml)\n\n${body}\n`);
    console.log(`[forge] ✓ ${roleNames.length} agent role(s) synced to AGENTS.md`);
  }

  lockEntries.sort((a, b) => a.name.localeCompare(b.name));
  writeLock(lockEntries, cwd);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[forge] ✓ synced ${ok}/${work.length} in ${dt}s — every editor now shares the same context`);
}
