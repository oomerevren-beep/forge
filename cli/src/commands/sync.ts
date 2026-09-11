// cli/src/commands/sync.ts — Reactive Hot-Reload Watcher & Drift Protection (FVP).
//
// `forge sync` distributes context to all detected harness adapters:
//   - Skills & rules
//   - MCP servers
//   - Agent roles (AGENTS.md)
//   - Deterministic lockfile (forge.lock)
//
// Flags:
//   --dry-run: Preview changes without writing to disk
//   --diff: Display ANSI colored unified diff before modifying files
//   --frozen: Fail closed if forge.lock is missing, drifted, or unverified
//   --watch: Live re-sync on forge.toml changes

import { resolve, join, relative } from "path";
import { existsSync, watch, FSWatcher, readFileSync } from "fs";
import pc from "picocolors";
import { resolveVersion } from "../core/registry.js";
import { ensurePackageContent } from "../core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, toSlug } from "../core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig, readMcpConfig, type Adapter } from "../adapters/index.js";
import { pointerBody } from "../adapters/base.js";
import { ruleContent } from "../adapters/cursor.js";
import {
  findProjectToml,
  loadProjectToml,
  validateProjectToml,
  type SkillRef,
  type ProjectPermissions,
} from "../core/project.js";
import { writeLock, readLock, verifyLockIntegrity, lockEntryFor, lockPath, type LockEntry } from "../core/lock.js";
import { parseSourceArg, resolveExternalSource } from "../core/sources.js";
import { storeExternal } from "./add-external.js";
import { scanPackageDir } from "../core/scan.js";
import { upsertForgeBlock, forgeStartMarker, forgeEndMarker } from "../core/merge.js";
import { createUnifiedDiff, colorizeDiff } from "../core/diff.js";
import { checkDrift, recordSync, backupDriftedFile, formatDriftWarning } from "../core/drift.js";
import { formatActionableError, formatKnownPattern } from "../core/errors.js";

export interface SyncOpts {
  cwd?: string;
  frozen?: boolean;
  mock?: boolean;
  skipScan?: boolean;
  watch?: boolean;
  dryRun?: boolean;
  diff?: boolean;
}

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
  permissions?: ProjectPermissions,
): Promise<Resolved> {
  const source = ref.source ?? "registry";
  if (source === "registry") {
    const { detail, version, versionMeta } = await resolveVersion(name, ref.version ?? "latest");
    const srcDir = await ensurePackageContent(name, version, detail, versionMeta, { allowMock: opts.mock });
    if (!opts.skipScan) {
      const highs = scanPackageDir(srcDir, { permissions }).filter((f) => f.severity === "high");
      if (highs.length > 0) {
        throw new Error(
          `[forge] security scan FAILED for ${name} (${highs.length} high): ${highs[0].rule} ${highs[0].file} — refusing sync`,
        );
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
  const spec = parseSourceArg(ref.ref ? `${source}#${ref.ref}` : source);
  const staged = resolveExternalSource(spec);
  try {
    if (!opts.skipScan) {
      const highs = scanPackageDir(staged.dir, { permissions }).filter((f) => f.severity === "high");
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
      lock: lockEntryFor(name, staged.version, staged.type, { sha256: staged.sha256, resolved: staged.resolved }, staged.source),
    };
  } catch (e) {
    try {
      staged.cleanup();
    } catch { /* best-effort */ }
    throw e;
  }
}

function simulateBlockUpsert(original: string, id: string, version: string, body: string): string {
  const cleanBody = body.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n";
  const block = `${forgeStartMarker(id, version)}\n${cleanBody}${forgeEndMarker(id)}\n`;
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<!-- FORGE:(?:MANAGED:)?START id="${esc}" version="[^"]*" -->\\r?\\n[\\s\\S]*?<!-- FORGE:(?:MANAGED:)?END id="${esc}" -->\\r?\\n?`);
  if (pattern.test(original)) {
    return original.replace(pattern, block);
  }
  const sep = original.length > 0 && !original.endsWith("\n") ? "\n" : "";
  const gap = original.length > 0 && !original.endsWith("\n\n") ? "\n" : "";
  return `${original}${sep}${gap}${block}`;
}

export async function runSync(opts: SyncOpts = {}): Promise<void> {
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

  // Merge [dependencies] and [skills]
  const work: { name: string; ref: SkillRef }[] = [
    ...Object.entries(project.dependencies).map(([name, version]) => ({ name, ref: { version } as SkillRef })),
    ...Object.entries(project.skills ?? {}).map(([name, ref]) => ({ name, ref })),
  ];

  if (work.length === 0 && !project.mcp?.servers && !project.agents) {
    console.log(`[forge] nothing to sync in ${tomlPath}`);
    return;
  }

  // --frozen checks
  if (opts.frozen) {
    const lock = readLock(cwd);
    if (!lock) {
      console.error(formatKnownPattern(`--frozen requires forge.lock, but none found in ${cwd}`));
      process.exit(1);
    }
    const integrityIssues = await verifyLockIntegrity(lock, { allowMock: opts.mock });
    if (integrityIssues.length > 0) {
      for (const issue of integrityIssues) {
        console.error(formatKnownPattern(issue.message));
      }
      process.exit(1);
    }
    const lockMap = new Map(lock.packages.map((p) => [p.name, p]));
    for (const { name } of work) {
      if (!lockMap.has(name)) {
        console.error(formatKnownPattern(`--frozen: lock missing package "${name}"`));
        process.exit(1);
      }
    }
  }

  const adapters = pickAdapters(project.forge?.harnesses);
  const prefix = opts.dryRun ? "(dry-run) " : "";
  console.log(`[forge] ${prefix}syncing ${work.length} skill(s) to ${adapters.map((a) => a.displayName).join(", ")}...`);

  const t0 = Date.now();
  const lockEntries: LockEntry[] = [];
  const simulatedFiles = new Map<string, string>();
  let ok = 0;

  for (const { name, ref } of work) {
    try {
      const r = await resolveSkill(name, ref, opts, project.permissions);
      const slug = toSlug(r.name);

      // Check drift & diff across adapters
      for (const adapter of adapters) {
        // Cursor rules drift & diff
        if (adapter.name === "cursor") {
          const rulePath = join(cwd, ".cursor", "rules", `${slug}.mdc`);
          const incomingRule = ruleContent(slug, r.srcDir, { version: r.version, description: r.description });
          if (existsSync(rulePath)) {
            const drift = checkDrift(rulePath, incomingRule, { cwd });
            if (drift.hasDrift) {
              console.warn(formatDriftWarning(relative(cwd, rulePath), drift));
              if (!opts.dryRun) backupDriftedFile(rulePath);
            }
          }
          if (opts.diff) {
            const orig = existsSync(rulePath) ? readFileSync(rulePath, "utf-8") : "";
            const d = createUnifiedDiff(`.cursor/rules/${slug}.mdc`, `.cursor/rules/${slug}.mdc`, orig, incomingRule);
            if (d) {
              console.log(`\n${pc.bold(pc.cyan(`=== Diff: .cursor/rules/${slug}.mdc ===`))}`);
              console.log(colorizeDiff(d));
            }
          }
        }

        // Claude Code CLAUDE.md drift & diff
        if (adapter.name === "claude-code") {
          const claudeFile = join(cwd, "CLAUDE.md");
          const incomingPointer = pointerBody({
            slug,
            version: r.version,
            description: r.description,
            skillPath: adapter.skillDir(slug),
          });
          if (existsSync(claudeFile)) {
            const drift = checkDrift(claudeFile, incomingPointer, { blockId: slug, cwd });
            if (drift.hasDrift) {
              console.warn(formatDriftWarning(relative(cwd, claudeFile), drift));
              if (!opts.dryRun) backupDriftedFile(claudeFile);
            }
          }
          if (opts.diff) {
            const orig = simulatedFiles.get(claudeFile) ?? (existsSync(claudeFile) ? readFileSync(claudeFile, "utf-8") : "");
            const simulated = simulateBlockUpsert(orig, slug, r.version, incomingPointer);
            simulatedFiles.set(claudeFile, simulated);
            const d = createUnifiedDiff("CLAUDE.md", "CLAUDE.md", orig, simulated);
            if (d) {
              console.log(`\n${pc.bold(pc.cyan(`=== Diff: CLAUDE.md [${slug}] ===`))}`);
              console.log(colorizeDiff(d));
            }
          }
        }

        // Windsurf .windsurfrules drift & diff
        if (adapter.name === "windsurf") {
          const wsFile = join(cwd, ".windsurfrules");
          const incomingPointer = pointerBody({
            slug,
            version: r.version,
            description: r.description,
            skillPath: adapter.skillDir(slug),
          });
          if (existsSync(wsFile)) {
            const drift = checkDrift(wsFile, incomingPointer, { blockId: slug, cwd });
            if (drift.hasDrift) {
              console.warn(formatDriftWarning(relative(cwd, wsFile), drift));
              if (!opts.dryRun) backupDriftedFile(wsFile);
            }
          }
          if (opts.diff) {
            const orig = simulatedFiles.get(wsFile) ?? (existsSync(wsFile) ? readFileSync(wsFile, "utf-8") : "");
            const simulated = simulateBlockUpsert(orig, slug, r.version, incomingPointer);
            simulatedFiles.set(wsFile, simulated);
            const d = createUnifiedDiff(".windsurfrules", ".windsurfrules", orig, simulated);
            if (d) {
              console.log(`\n${pc.bold(pc.cyan(`=== Diff: .windsurfrules [${slug}] ===`))}`);
              console.log(colorizeDiff(d));
            }
          }
        }

        if (!opts.dryRun) {
          await adapter.install(slug, r.srcDir, r.type, { version: r.version, description: r.description });

          // Record sync state for drift protection
          if (adapter.name === "cursor") {
            const rulePath = join(cwd, ".cursor", "rules", `${slug}.mdc`);
            const incomingRule = ruleContent(slug, r.srcDir, { version: r.version, description: r.description });
            if (existsSync(rulePath)) recordSync(rulePath, incomingRule, { cwd });
          } else if (adapter.name === "claude-code") {
            const claudeFile = join(cwd, "CLAUDE.md");
            const incomingPointer = pointerBody({ slug, version: r.version, description: r.description, skillPath: adapter.skillDir(slug) });
            if (existsSync(claudeFile)) recordSync(claudeFile, incomingPointer, { blockId: slug, cwd });
          } else if (adapter.name === "windsurf") {
            const wsFile = join(cwd, ".windsurfrules");
            const incomingPointer = pointerBody({ slug, version: r.version, description: r.description, skillPath: adapter.skillDir(slug) });
            if (existsSync(wsFile)) recordSync(wsFile, incomingPointer, { blockId: slug, cwd });
          }
        }
      }

      if (!opts.dryRun) {
        ensureForgeDirs();
        const links = readLinks();
        links[r.name] = {
          pkg: r.name,
          version: r.version,
          slug,
          type: r.type,
          adapters: adapters.map((a) => a.name),
          installedAt: new Date().toISOString(),
          ...(r.lock.source !== "registry" ? { source: r.lock.source } : {}),
        };
        writeLinks(links);
      }

      lockEntries.push(r.lock);
      ok++;
      console.log(`  ✓ ${r.name}@${r.version}`);
    } catch (e) {
      console.error(`  ✗ ${name} failed: ${formatActionableError(e)}`);
    }
  }

  // MCP servers from [mcp.servers.*]
  const servers = project.mcp?.servers ?? {};
  if (Object.keys(servers).length > 0) {
    if (opts.diff) {
      for (const adapter of adapters) {
        const cfgPath = adapter.mcpConfigPath();
        if (cfgPath) {
          try {
            const currentCfg = existsSync(cfgPath) ? (readMcpConfig(cfgPath) ?? {}) : {};
            const origJson = JSON.stringify(currentCfg, null, 2);
            const simCfg = JSON.parse(origJson);
            if (!simCfg.mcpServers) simCfg.mcpServers = {};
            for (const [sName, sDef] of Object.entries(servers)) {
              simCfg.mcpServers[sName] = { command: sDef.command, args: sDef.args ?? [], ...(sDef.env ? { env: sDef.env } : {}) };
            }
            const newJson = JSON.stringify(simCfg, null, 2);
            const d = createUnifiedDiff(relative(cwd, cfgPath), relative(cwd, cfgPath), origJson, newJson);
            if (d) {
              console.log(`\n${pc.bold(pc.cyan(`=== Diff: ${relative(cwd, cfgPath)} [mcpServers] ===`))}`);
              console.log(colorizeDiff(d));
            }
          } catch {
            /* best effort diff preview */
          }
        }
      }
    }

    if (opts.dryRun) {
      console.log(`[forge] (dry-run) would inject ${Object.keys(servers).length} MCP server(s)`);
    } else {
      const mcpCount = injectMcpServers(adapters, servers);
      console.log(`[forge] ✓ ${Object.keys(servers).length} MCP server(s) injected (${mcpCount} config writes)`);
    }
  }

  // Agent roles → team block in <project>/AGENTS.md
  const roles = project.agents ?? {};
  const roleNames = Object.keys(roles);
  if (roleNames.length > 0) {
    const body = roleNames
      .map((role) => {
        const r = roles[role];
        return `- ${role}${r.model ? ` (model: ${r.model})` : ""}${r.system_prompt ? `\n  ${r.system_prompt}` : ""}`;
      })
      .join("\n");
    const agentsPath = join(cwd, "AGENTS.md");
    const blockBody = `# Team agent roles (from forge.toml)\n\n${body}\n`;

    if (existsSync(agentsPath)) {
      const drift = checkDrift(agentsPath, blockBody, { blockId: "forge/team-roles", cwd });
      if (drift.hasDrift) {
        console.warn(formatDriftWarning("AGENTS.md", drift));
        if (!opts.dryRun) backupDriftedFile(agentsPath);
      }
    }

    if (opts.diff) {
      const orig = existsSync(agentsPath) ? readFileSync(agentsPath, "utf-8") : "";
      const simulated = simulateBlockUpsert(orig, "forge/team-roles", "1", blockBody);
      const d = createUnifiedDiff("AGENTS.md", "AGENTS.md", orig, simulated);
      if (d) {
        console.log(`\n${pc.bold(pc.cyan("=== Diff: AGENTS.md [forge/team-roles] ==="))}`);
        console.log(colorizeDiff(d));
      }
    }

    if (!opts.dryRun) {
      upsertForgeBlock(agentsPath, "forge/team-roles", "1", blockBody);
      recordSync(agentsPath, blockBody, { blockId: "forge/team-roles", cwd });
      console.log(`[forge] ✓ ${roleNames.length} agent role(s) synced to AGENTS.md`);
    } else {
      console.log(`[forge] (dry-run) would sync ${roleNames.length} agent role(s) to AGENTS.md`);
    }
  }

  // Lockfile write or diff
  if (!opts.frozen) {
    lockEntries.sort((a, b) => a.name.localeCompare(b.name));
    if (opts.diff) {
      const origLock = existsSync(lockPath(cwd)) ? readFileSync(lockPath(cwd), "utf-8") : "";
      const lines: string[] = ["# Generated by Forge — do not edit manually", ""];
      for (const e of lockEntries) {
        lines.push("[[packages]]");
        lines.push(`name = "${e.name}"`);
        lines.push(`version = "${e.version}"`);
        lines.push(`type = "${e.type}"`);
        if (e.tarball) lines.push(`tarball = "${e.tarball}"`);
        if (e.sha256) lines.push(`sha256 = "${e.sha256}"`);
        if (e.source) lines.push(`source = "${e.source}"`);
        if (e.resolved) lines.push(`resolved = "${e.resolved}"`);
        lines.push("");
      }
      const newLock = lines.join("\n");
      const d = createUnifiedDiff("forge.lock", "forge.lock", origLock, newLock);
      if (d) {
        console.log(`\n${pc.bold(pc.cyan("=== Diff: forge.lock ==="))}`);
        console.log(colorizeDiff(d));
      }
    }

    if (!opts.dryRun) {
      writeLock(lockEntries, cwd);
    }
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(3);
  if (opts.dryRun) {
    console.log(`\n[forge] (dry-run) completed in ${dt}s — 0 files written to disk.`);
    return;
  }

  console.log(`\n[forge] ✓ synced ${ok}/${work.length} in ${dt}s — every editor now shares the same context`);
  if (ok < work.length) {
    process.exitCode = 1;
  }

  // --- Watch mode ---
  if (opts.watch) {
    await runWatch(cwd, tomlPath, opts);
  }
}

async function runWatch(cwd: string, tomlPath: string, opts: { mock?: boolean; skipScan?: boolean }): Promise<void> {
  console.log(`\n[forge] ⚡ watching for changes... (Ctrl+C to stop)`);

  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const resync = async () => {
    const t0 = Date.now();
    try {
      const project = loadProjectToml(tomlPath);
      const errs = validateProjectToml(project);
      if (errs.length > 0) {
        for (const er of errs) console.error(`[forge] ${er}`);
        return;
      }

      const work: { name: string; ref: SkillRef }[] = [
        ...Object.entries(project.dependencies).map(([name, version]) => ({ name, ref: { version } as SkillRef })),
        ...Object.entries(project.skills ?? {}).map(([name, ref]) => ({ name, ref })),
      ];

      const adapters = pickAdapters(project.forge?.harnesses);
      let ok = 0;
      for (const { name, ref } of work) {
        try {
          const r = await resolveSkill(name, ref, opts, project.permissions);
          for (const adapter of adapters) {
            await adapter.install(toSlug(r.name), r.srcDir, r.type, { version: r.version, description: r.description });
          }
          ok++;
        } catch (e) {
          console.error(`  ✗ ${name} failed: ${(e as Error).message}`);
        }
      }

      const servers = project.mcp?.servers ?? {};
      injectMcpServers(adapters, servers);

      const dt = (Date.now() - t0) / 1000;
      console.log(`  ⚡ [${dt.toFixed(3)}s] Re-synced ${ok}/${work.length} skill(s) to ${adapters.map((a) => a.name).join(", ")}`);
    } catch (e) {
      console.error(`  ! sync error: ${(e as Error).message}`);
    }
  };

  const scheduleResync = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(resync, 50);
  };

  try {
    watcher = watch(tomlPath, (_eventType, _filename) => {
      scheduleResync();
    });
  } catch (e) {
    console.error(`[forge] watch failed: ${(e as Error).message}`);
    return;
  }

  try {
    const project = loadProjectToml(tomlPath);
    for (const ref of Object.values(project.skills ?? {})) {
      const source = (ref as SkillRef).source ?? "registry";
      if (source !== "registry") {
        const spec = parseSourceArg((ref as SkillRef).ref ? `${source}#${(ref as SkillRef).ref}` : source);
        if (spec.kind === "local") {
          const skillDir = resolve(cwd, spec.ref);
          if (existsSync(skillDir)) {
            try {
              const localWatcher = watch(skillDir, { recursive: true }, () => {
                scheduleResync();
              });
              localWatcher.on("error", () => {});
            } catch { /* ignore */ }
          }
        }
      }
    }
  } catch { /* ignore */ }

  process.on("SIGINT", () => {
    if (watcher) watcher.close();
    console.log("\n[forge] watch stopped");
    process.exit(0);
  });

  await new Promise(() => {});
}
