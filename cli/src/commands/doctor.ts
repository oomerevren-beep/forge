// cli/src/commands/doctor.ts — Comprehensive system and environment diagnostics (FVP).
//
// Checks:
//   - Node.js runtime version (>= 18.0.0)
//   - Host Operating System & Architecture
//   - Configuration validity (global ~/.forge/config.toml & local forge.toml)
//   - Lockfile integrity (forge.lock vs pinned sha256)
//   - Writable directories (~/.forge, cache, project)
//   - Active adapter health status (detected, MCP configs, package counts)
//   - Registry accessibility (package count, index parsing)
//   - Broken links check & optional repair (--fix)

import { existsSync, accessSync, constants } from "fs";
import { resolve } from "path";
import pc from "picocolors";
import { allAdapters, readMcpConfig, addMcpServerToConfig } from "../adapters/index.js";
import { configPath, loadConfig } from "../core/config.js";
import { findProjectToml, loadProjectToml, validateProjectToml } from "../core/project.js";
import { readLock, verifyLockIntegrity, type IntegrityIssue } from "../core/lock.js";
import { loadIndex, loadPackageDetail, resolveVersion } from "../core/registry.js";
import { ensureForgeDirs, readLinks, packageDir, listInstalledPackages, forgeHome, packagesDir, cacheDir } from "../core/store.js";
import { ensurePackageContent } from "../core/installer.js";
import { parseSourceArg, resolveExternalSource } from "../core/sources.js";
import { storeExternal } from "./add-external.js";
import { compareSemver } from "../core/semver.js";

export interface DoctorCheck {
  name: string;
  category: "runtime" | "os" | "config" | "lockfile" | "filesystem" | "adapters" | "registry";
  status: "pass" | "warn" | "fail";
  message: string;
  detail?: string;
  suggestion?: string;
}

export interface DoctorAdapterReport {
  name: string;
  displayName: string;
  detected: boolean;
  packagesCount: number;
  mcpConfigPath: string | null;
  mcpValid?: boolean;
  mcpServersCount?: number;
  error?: string;
}

export interface DoctorResult {
  ok: boolean;
  node: {
    version: string;
    valid: boolean;
    required: string;
  };
  os: {
    platform: string;
    arch: string;
    release: string;
  };
  checks: DoctorCheck[];
  adapters: DoctorAdapterReport[];
  brokenLinks: {
    broken: number;
    fixed: number;
  };
  timestamp: string;
}

export interface DoctorOpts {
  json?: boolean;
  fix?: boolean;
  mock?: boolean;
  cwd?: string;
}

function isDirWritable(dir: string): boolean {
  try {
    if (!existsSync(dir)) return false;
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(opts: DoctorOpts = {}): Promise<DoctorResult> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const checks: DoctorCheck[] = [];
  let allPassed = true;

  // 1. Node.js Version
  const currentVer = process.version.replace(/^v/, "");
  const nodeValid = compareSemver(currentVer, "18.0.0") >= 0;
  if (nodeValid) {
    checks.push({
      name: "Node.js runtime",
      category: "runtime",
      status: "pass",
      message: `Node.js ${process.version} (>= 18.0.0 required)`,
    });
  } else {
    allPassed = false;
    checks.push({
      name: "Node.js runtime",
      category: "runtime",
      status: "fail",
      message: `Node.js ${process.version} is unsupported (>= 18.0.0 required)`,
      suggestion: "Upgrade your Node.js runtime via nvm, fnm, or official installer.",
    });
  }

  // 2. Operating System
  checks.push({
    name: "Operating System",
    category: "os",
    status: "pass",
    message: `${process.platform} (${process.arch})`,
  });

  // 3. Configuration Validity
  ensureForgeDirs();
  const globalCfgPath = configPath();
  try {
    loadConfig();
    checks.push({
      name: "Global Configuration",
      category: "config",
      status: "pass",
      message: `Valid (${globalCfgPath})`,
    });
  } catch (e) {
    allPassed = false;
    checks.push({
      name: "Global Configuration",
      category: "config",
      status: "fail",
      message: `Corrupted global config at ${globalCfgPath}`,
      detail: (e as Error).message,
      suggestion: `Remove or fix ${globalCfgPath}`,
    });
  }

  const projectTomlPath = findProjectToml(cwd);
  let isPackageManifest = false;
  if (projectTomlPath) {
    try {
      const proj = loadProjectToml(projectTomlPath);
      const valErrors = validateProjectToml(proj);
      if (valErrors.length === 0) {
        const depCount = Object.keys(proj.dependencies).length;
        const skillCount = Object.keys(proj.skills ?? {}).length;
        checks.push({
          name: "Project Manifest",
          category: "config",
          status: "pass",
          message: `Valid forge.toml (${depCount} dep(s), ${skillCount} skill(s))`,
          detail: projectTomlPath,
        });
      } else {
        allPassed = false;
        checks.push({
          name: "Project Manifest",
          category: "config",
          status: "fail",
          message: `forge.toml has validation errors (${valErrors.length})`,
          detail: valErrors.join("; "),
          suggestion: "Fix fields in forge.toml according to docs/SPEC.md",
        });
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("looks like a package manifest ([package])")) {
        isPackageManifest = true;
        checks.push({
          name: "Project Manifest",
          category: "config",
          status: "pass",
          message: "Package manifest forge.toml ([package])",
          detail: projectTomlPath,
        });
      } else {
        allPassed = false;
        checks.push({
          name: "Project Manifest",
          category: "config",
          status: "fail",
          message: `forge.toml parse error`,
          detail: msg,
          suggestion: "Verify TOML syntax in forge.toml",
        });
      }
    }
  } else {
    checks.push({
      name: "Project Manifest",
      category: "config",
      status: "pass",
      message: "No forge.toml in current directory (global mode)",
    });
  }

  // 4. Lockfile Integrity
  if (projectTomlPath && !isPackageManifest) {
    const lock = readLock(cwd);
    if (!lock) {
      checks.push({
        name: "Lockfile Integrity",
        category: "lockfile",
        status: "warn",
        message: "forge.lock not found",
        suggestion: "Run 'forge sync' or 'forge install' to generate forge.lock",
      });
    } else {
      let issues: IntegrityIssue[] = [];
      try {
        issues = await verifyLockIntegrity(lock, { allowMock: opts.mock });
      } catch (e) {
        issues.push({ name: "lock", kind: "yanked", message: (e as Error).message });
      }
      if (issues.length === 0) {
        checks.push({
          name: "Lockfile Integrity",
          category: "lockfile",
          status: "pass",
          message: `forge.lock verified (${lock.packages.length} package(s) pinned)`,
        });
      } else {
        allPassed = false;
        checks.push({
          name: "Lockfile Integrity",
          category: "lockfile",
          status: "fail",
          message: `${issues.length} integrity issue(s) detected`,
          detail: issues.map((i) => `[${i.kind}] ${i.message}`).join("; "),
          suggestion: "Run 'forge update <pkg>' to resolve hash mismatches or update forge.lock",
        });
      }
    }
  }

  // 5. Writable Directories
  const forgeHomePath = forgeHome();
  const pkgsPath = packagesDir();
  const cachePath = cacheDir();

  const homeWritable = isDirWritable(forgeHomePath);
  const pkgsWritable = isDirWritable(pkgsPath);
  const cacheWritable = isDirWritable(cachePath);
  const cwdWritable = isDirWritable(cwd);

  if (homeWritable && pkgsWritable && cacheWritable && cwdWritable) {
    checks.push({
      name: "Writable Directories",
      category: "filesystem",
      status: "pass",
      message: `~/.forge, packages, cache, cwd all writable`,
    });
  } else {
    allPassed = false;
    const failedDirs = [
      !homeWritable && forgeHomePath,
      !pkgsWritable && pkgsPath,
      !cacheWritable && cachePath,
      !cwdWritable && cwd,
    ].filter(Boolean) as string[];
    checks.push({
      name: "Writable Directories",
      category: "filesystem",
      status: "fail",
      message: `Permission denied writing to: ${failedDirs.join(", ")}`,
      suggestion: "Check filesystem permissions for the indicated directories.",
    });
  }

  // 6. Registry Accessibility
  try {
    const idx = await loadIndex();
    checks.push({
      name: "Registry Accessibility",
      category: "registry",
      status: "pass",
      message: `Accessible (${idx.count} packages available)`,
    });
  } catch (e) {
    allPassed = false;
    checks.push({
      name: "Registry Accessibility",
      category: "registry",
      status: "fail",
      message: `Registry unavailable: ${(e as Error).message}`,
      suggestion: "Check network connectivity or registry path configuration in ~/.forge/config.toml",
    });
  }

  // 7. Active Adapters Health
  const adapterReports: DoctorAdapterReport[] = [];
  for (const adapter of allAdapters) {
    let detected: boolean;
    try {
      detected = adapter.detect();
    } catch {
      detected = false;
    }

    let pkgCount = 0;
    if (detected) {
      try {
        const list = await adapter.list();
        pkgCount = list.length;
      } catch {
        pkgCount = 0;
      }
    }

    const cfgPath = adapter.mcpConfigPath();
    let mcpValid: boolean | undefined;
    let mcpServersCount: number | undefined;
    let errorMsg: string | undefined;

    if (cfgPath && existsSync(cfgPath)) {
      try {
        const cfg = readMcpConfig(cfgPath);
        mcpValid = true;
        const servers = cfg?.["mcpServers"] as Record<string, unknown> | undefined;
        mcpServersCount = servers ? Object.keys(servers).length : 0;
      } catch (e) {
        mcpValid = false;
        errorMsg = (e as Error).message;
      }
    }

    adapterReports.push({
      name: adapter.name,
      displayName: adapter.displayName,
      detected,
      packagesCount: pkgCount,
      mcpConfigPath: cfgPath,
      mcpValid,
      mcpServersCount,
      error: errorMsg,
    });
  }

  const detectedAdapters = adapterReports.filter((a) => a.detected);
  const unhealthyAdapters = adapterReports.filter((a) => a.detected && (a.mcpValid === false || a.error));
  let adapterStatus: "pass" | "warn" | "fail" = "pass";
  let adapterMsg = `${detectedAdapters.length}/${allAdapters.length} harness(es) detected`;

  if (unhealthyAdapters.length > 0) {
    adapterStatus = "fail";
    allPassed = false;
    adapterMsg += ` (${unhealthyAdapters.length} configuration error(s))`;
  } else if (detectedAdapters.length === 0) {
    adapterStatus = "warn";
  }

  checks.push({
    name: "Adapters",
    category: "adapters",
    status: adapterStatus,
    message: adapterMsg,
    detail: detectedAdapters.map((a) => a.displayName).join(", "),
    suggestion: unhealthyAdapters.length > 0
      ? `Fix invalid MCP or adapter configurations in: ${unhealthyAdapters.map((a) => a.displayName).join(", ")}`
      : undefined,
  });

  // 8. Broken Links Check & Optional --fix
  const links = readLinks();
  let broken = 0;
  let fixed = 0;
  for (const [name, rec] of Object.entries(links)) {
    const dir = packageDir(rec.slug, rec.version);
    if (!existsSync(dir)) {
      broken++;
      if (opts.fix) {
        try {
          if (rec.source && rec.source !== "registry") {
            const spec = parseSourceArg(rec.source);
            const staged = resolveExternalSource(spec);
            storeExternal(staged);
            fixed++;
          } else {
            const detail = await loadPackageDetail(name);
            const resolved = await resolveVersion(name, rec.version);
            await ensurePackageContent(name, resolved.version, detail, resolved.versionMeta, { allowMock: opts.mock });
            fixed++;
          }
        } catch {
          // best-effort
        }
      }
    }

    for (const adapterName of rec.adapters) {
      const adapter = allAdapters.find((a) => a.name === adapterName);
      if (!adapter) continue;

      if (rec.type === "mcp") {
        const cfgPath = adapter.mcpConfigPath();
        if (cfgPath) {
          try {
            const cfg = readMcpConfig(cfgPath);
            const servers = cfg?.["mcpServers"] as Record<string, unknown> | undefined;
            if (!servers || !(rec.slug in servers)) {
              broken++;
              if (opts.fix && existsSync(dir)) {
                try {
                  const resolved = await resolveVersion(name, rec.version);
                  if (resolved.versionMeta.mcp) {
                    addMcpServerToConfig(cfgPath, rec.slug, resolved.versionMeta.mcp);
                    fixed++;
                  }
                } catch {
                  // best-effort
                }
              }
            }
          } catch {
            broken++;
          }
        }
        continue;
      }

      if (adapterName === "generic") continue;
      const installed = await adapter.isInstalled(rec.slug);
      if (!installed) {
        broken++;
        if (opts.fix && existsSync(dir)) {
          try {
            await adapter.install(rec.slug, dir, rec.type ?? "skill", { version: rec.version });
            fixed++;
          } catch {
            // best-effort
          }
        }
      }
    }
  }

  if (broken > 0 && broken > fixed) {
    allPassed = false;
    checks.push({
      name: "Package Links",
      category: "filesystem",
      status: "fail",
      message: `${broken - fixed} broken link(s) detected`,
      suggestion: "Run 'forge doctor --fix' to restore missing package links",
    });
  } else if (fixed > 0) {
    checks.push({
      name: "Package Links",
      category: "filesystem",
      status: "pass",
      message: `All package links intact (fixed ${fixed} link(s))`,
    });
  } else {
    checks.push({
      name: "Package Links",
      category: "filesystem",
      status: "pass",
      message: `All package links intact`,
    });
  }

  const result: DoctorResult = {
    ok: allPassed && (broken === 0 || broken === fixed),
    node: {
      version: process.version,
      valid: nodeValid,
      required: ">=18.0.0",
    },
    os: {
      platform: process.platform,
      arch: process.arch,
      release: process.release?.name ?? "node",
    },
    checks,
    adapters: adapterReports,
    brokenLinks: { broken, fixed },
    timestamp: new Date().toISOString(),
  };

  // Render output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printDoctorTerminal(result, opts);
  }

  return result;
}

function printDoctorTerminal(result: DoctorResult, opts: DoctorOpts): void {
  console.log(`\n${pc.bold(pc.cyan("[forge] doctor — System & Harness Diagnostics"))}\n`);

  for (const check of result.checks) {
    let mark: string;
    if (check.status === "pass") {
      mark = pc.green("✓");
    } else if (check.status === "warn") {
      mark = pc.yellow("!");
    } else {
      mark = pc.red("✗");
    }

    console.log(`  ${mark} ${pc.bold(check.name.padEnd(24))} ${check.message}`);
    if (check.detail) {
      console.log(`    ${pc.dim(check.detail)}`);
    }
    if (check.suggestion) {
      console.log(`    ${pc.cyan("Suggestion:")} ${check.suggestion}`);
    }
  }

  console.log(`\n${pc.bold("Harnesses:")}`);
  for (const a of result.adapters) {
    const mark = a.detected ? pc.green("✓") : pc.dim("✗");
    const countStr = a.detected ? pc.dim(`(${a.packagesCount} package(s))`) : pc.dim("(not detected)");
    console.log(`  ${mark} ${a.displayName.padEnd(16)} ${countStr}`);
    if (a.mcpConfigPath) {
      const mcpStatus = a.mcpValid === false ? pc.red(" [mcp config invalid]") : "";
      console.log(`    ${pc.dim(`mcp: ${a.mcpConfigPath}`)}${mcpStatus}`);
    }
    if (a.error) {
      console.log(`    ${pc.red(`error: ${a.error}`)}`);
    }
  }

  console.log(`\n${pc.bold("Package Store:")}`);
  const pkgs = listInstalledPackages();
  console.log(`  Packages: ${packagesDir()} (${pkgs.length} installed)`);
  console.log(`  Cache:    ${cacheDir()}`);

  if (result.brokenLinks.broken > 0) {
    if (opts.fix) {
      console.log(`\n${pc.yellow(`[forge] fixed ${result.brokenLinks.fixed}/${result.brokenLinks.broken} broken package link(s)`)}`);
    } else {
      console.log(`\n${pc.yellow(`[forge] ${result.brokenLinks.broken} broken link(s) found — run 'forge doctor --fix' to repair`)}`);
    }
  }

  if (result.ok) {
    console.log(`\n${pc.green(pc.bold("[forge] ✓ All health checks passed — your agent environment is ready."))}\n`);
  } else {
    console.log(`\n${pc.red(pc.bold("[forge] ✗ Some diagnostic checks failed. See suggestions above."))}\n`);
  }
}
