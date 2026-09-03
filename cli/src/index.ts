#!/usr/bin/env node
// forge CLI — v0.1 (Faz 1: gerçek add/remove/list/doctor)
import { Command } from "commander";
import { existsSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import { loadIndex, loadPackageDetail, resolveVersion, parsePackageArg, searchPackages } from "./core/registry.js";
import { ensurePackageContent } from "./core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, packageDir, toSlug, listInstalledPackages } from "./core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig, removeMcpServerFromConfig } from "./adapters/index.js";
import { runInit } from "./commands/init.js";
import { runInstall } from "./commands/install.js";
import { runOutdated, runUpdate } from "./commands/update.js";
import { runAudit } from "./commands/audit.js";
import { DEP_NAME_RE } from "./core/project.js";
import { ensureConfig } from "./core/config.js";

ensureConfig();

const program = new Command();

program
  .name("forge")
  .description("The Homebrew for AI Agents — one CLI for skills, MCPs, plugins, agents")
  .version("0.1.1")
  .helpOption("-h, --help", "display help for command");

// --- add ---
program
  .command("add")
  .description("Install a package (e.g. forge add anthropics/plan@1.2.0)")
  .argument("<pkg>", "package name, e.g. anthropics/plan or anthropics/plan@1.2.0")
  .option("--global", "install globally (default)")
  .option("--dry-run", "show what would be installed without writing")
  .option("--mock", "allow mock content for packages with no verified tarball yet")
  .action(async (pkgArg, opts) => {
    const { name, version: requested } = parsePackageArg(pkgArg);
    if (!DEP_NAME_RE.test(name)) {
      console.error(`[forge] invalid package name "${name}" — expected scope/name (e.g. anthropics/plan)`);
      process.exit(1);
    }
    console.log(`[forge] resolving ${name}${requested ? "@" + requested : ""}...`);

    let detail, version, versionMeta;
    try {
      const resolved = resolveVersion(name, requested);
      detail = resolved.detail;
      version = resolved.version;
      versionMeta = resolved.versionMeta;
    } catch (e) {
      console.error(`[forge] error: ${(e as Error).message}`);
      process.exit(1);
    }

    const slug = toSlug(name);
    console.log(`[forge] found ${name}@${version} [${detail.type}] — ${detail.description}`);

    if (opts.dryRun) {
      console.log(`[forge] (dry-run) would install to ~/.forge/packages/${slug}@${version}/`);
      const adapters = detectAdapters();
      console.log(`[forge] (dry-run) would link to: ${adapters.map((a) => a.name).join(", ")}`);
      if (versionMeta.mcp) console.log(`[forge] (dry-run) MCP: ${versionMeta.mcp.command} ${(versionMeta.mcp.args ?? []).join(" ")}`);
      return;
    }

    // Ensure content in store (fail-closed: throws on unverified/failed downloads)
    console.log(`[forge] installing ${name}@${version}...`);
    let srcDir: string;
    try {
      srcDir = await ensurePackageContent(name, version, detail, versionMeta, { allowMock: opts.mock });
    } catch (e) {
      // exitCode + return (not process.exit): lets open fetch handles close,
      // avoids a libuv handle-closing crash on Windows.
      console.error((e as Error).message);
      process.exitCode = 1;
      return;
    }
    console.log(`[forge] package content ready: ${srcDir}`);

    // Detect adapters
    const adapters = detectAdapters();
    console.log(`[forge] detected harnesses: ${adapters.map((a) => `${a.displayName} (${a.name})`).join(", ")}`);

    // Install to each adapter
    for (const adapter of adapters) {
      try {
        await adapter.install(slug, srcDir, detail.type);
        console.log(`  ✓ ${adapter.displayName} → ${adapter.skillDir(slug)}`);

        // MCP: inject into mcp config
        if (detail.type === "mcp" && versionMeta.mcp) {
          const cfgPath = adapter.mcpConfigPath();
          if (cfgPath) {
            const mcpName = slug; // use slug as MCP server key
            addMcpServerToConfig(cfgPath, mcpName, versionMeta.mcp);
            console.log(`  ✓ MCP config → ${cfgPath} [${mcpName}]`);
          }
        }
      } catch (e) {
        console.warn(`  ✗ ${adapter.displayName} failed: ${(e as Error).message}`);
      }
    }

    // Handle dependencies (shallow, one level for v0.1)
    const deps = versionMeta.dependencies ?? {};
    if (Object.keys(deps).length > 0) {
      console.log(`[forge] installing ${Object.keys(deps).length} dependencies...`);
      for (const [depName, depRange] of Object.entries(deps)) {
        try {
          const depResolved = resolveVersion(depName, depRange);
          const depSrc = await ensurePackageContent(depName, depResolved.version, depResolved.detail, depResolved.versionMeta, { allowMock: opts.mock });
          for (const adapter of adapters) {
            await adapter.install(toSlug(depName), depSrc, depResolved.detail.type);
          }
          console.log(`  ✓ dep ${depName}@${depResolved.version}`);
        } catch (e) {
          console.warn(`  ✗ dep ${depName} failed: ${(e as Error).message}`);
        }
      }
    }

    // Record link
    ensureForgeDirs();
    const links = readLinks();
    links[name] = {
      pkg: name,
      version,
      slug,
      type: detail.type,
      adapters: adapters.map((a) => a.name),
      installedAt: new Date().toISOString(),
    };
    writeLinks(links);

    console.log(`\n[forge] ✓ installed ${name}@${version} on ${adapters.length} harness(es)`);
    console.log(`[forge] run 'forge list' to see installed packages, 'forge doctor' to check health`);
  });

// --- remove ---
program
  .command("remove")
  .alias("rm")
  .alias("uninstall")
  .description("Remove a package")
  .argument("<pkg>", "package name")
  .action(async (pkgArg) => {
    const { name } = parsePackageArg(pkgArg);
    if (!DEP_NAME_RE.test(name)) {
      console.error(`[forge] invalid package name "${name}" — expected scope/name (e.g. anthropics/plan)`);
      process.exit(1);
    }
    const slug = toSlug(name);
    const links = readLinks();
    const record = links[name];
    if (!record) {
      console.warn(`[forge] ${name} not found in ~/.forge/links.json — trying to remove anyway`);
    }
    const version = record?.version ?? "unknown";
    // Remove from adapters
    const adapters = allAdapters; // try all to be thorough
    for (const adapter of adapters) {
      const wasInstalled = await adapter.isInstalled(slug);
      if (wasInstalled) {
        // need type to know what to clean — try skill first, also MCP
        try {
          await adapter.uninstall(slug, "skill");
          await adapter.uninstall(slug, "mcp");
          await adapter.uninstall(slug, "agent");
          console.log(`  ✓ removed from ${adapter.displayName}`);
        } catch (e) {
          console.warn(`  ✗ ${adapter.displayName}: ${(e as Error).message}`);
        }
        // MCP config cleanup
        const cfgPath = adapter.mcpConfigPath();
        if (cfgPath) removeMcpServerFromConfig(cfgPath, slug);
      }
    }
    // Remove from store (keep cache? remove package dir)
    if (record) {
      const dir = packageDir(slug, record.version);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
        console.log(`[forge] removed store: ${dir}`);
      }
      delete links[name];
      writeLinks(links);
    } else {
      // try to clean any version dir matching slug
      for (const p of listInstalledPackages()) {
        if (p.slug === slug) {
          rmSync(p.dir, { recursive: true, force: true });
          console.log(`[forge] removed store: ${p.dir}`);
        }
      }
    }
    console.log(`[forge] ✓ removed ${name}${version !== "unknown" ? "@" + version : ""}`);
  });

// --- list ---
program
  .command("list")
  .alias("ls")
  .description("List installed packages")
  .action(async () => {
    const links = readLinks();
    const entries = Object.values(links);
    if (entries.length === 0) {
      // fallback: list store dirs
      const pkgs = listInstalledPackages();
      if (pkgs.length === 0) {
        console.log("[forge] no packages installed. Try: forge add anthropics/plan");
        return;
      }
      console.log("[forge] installed packages (from store):");
      for (const p of pkgs) {
        console.log(`  - ${p.slug}@${p.version}  (${p.dir})`);
      }
      return;
    }
    console.log(`[forge] ${entries.length} package(s) installed:\n`);
    for (const r of entries) {
      const dir = packageDir(r.slug, r.version);
      const exists = existsSync(dir) ? "" : " (missing dir!)";
      console.log(`  - ${r.pkg}@${r.version} [${r.adapters.join(", ")}]${exists}`);
      console.log(`    ${dir}`);
    }
  });

// --- doctor ---
program
  .command("doctor")
  .description("Check harness health")
  .option("--fix", "try to fix broken links")
  .option("--mock", "allow mock content when --fix restores packages with no verified tarball")
  .action(async (opts) => {
    ensureForgeDirs();
    console.log("[forge] doctor — checking harnesses...\n");
    for (const adapter of allAdapters) {
      const detected = adapter.detect();
      const icon = detected ? "✓" : "✗";
      const extra = detected ? "(found)" : "(not found)";
      // try to list count if detected
      let countStr = "";
      if (detected) {
        try {
          const list = await adapter.list();
          countStr = ` — ${list.length} package(s)`;
        } catch {
          countStr = "";
        }
      }
      let cfgInfo = "";
      const cfgPath = adapter.mcpConfigPath();
      if (cfgPath) cfgInfo = `  mcp: ${cfgPath}`;
      console.log(`${icon} ${adapter.displayName} (${adapter.name}) ${extra}${countStr}${cfgInfo ? "\n " + cfgInfo : ""}`);
    }

    console.log("\n[forge] store:");
    console.log(`  packages: ${join(homedir(), ".forge", "packages")}`);
    console.log(`  cache:    ${join(homedir(), ".forge", "cache")}`);
    const pkgs = listInstalledPackages();
    console.log(`  installed: ${pkgs.length} package(s)`);
    if (pkgs.length > 0) {
      for (const p of pkgs.slice(0, 5)) console.log(`    - ${p.slug}@${p.version}`);
      if (pkgs.length > 5) console.log(`    ... and ${pkgs.length - 5} more`);
    }

    // Check for broken links (Faz 10 tam: links.json vs FS + --fix eksik symlink/junction'ı yeniden kurar)
    const links = readLinks();
    let broken = 0;
    let fixed = 0;
    for (const [name, rec] of Object.entries(links)) {
      const dir = packageDir(rec.slug, rec.version);
      if (!existsSync(dir)) {
        broken++;
        console.log(`  ! broken: ${name}@${rec.version} — missing ${dir}`);
        if (opts.fix) {
          try {
            const detail = loadPackageDetail(name);
            const resolved = resolveVersion(name, rec.version);
            const srcDir = await ensurePackageContent(name, resolved.version, detail, resolved.versionMeta, { allowMock: opts.mock });
            console.log(`    → store restored: ${srcDir}`);
            fixed++;
          } catch (e) {
            console.log(`    → restore failed: ${(e as Error).message}`);
            continue;
          }
        }
      }
      const liveDir = existsSync(dir) ? dir : packageDir(rec.slug, rec.version);
      for (const adapterName of rec.adapters) {
        const adapter = allAdapters.find((a) => a.name === adapterName);
        if (!adapter) continue;
        // MCP packages don't require skillDir — skip check for them
        if (rec.type === "mcp") continue;
        // generic is project-local (CWD dependent) — skip global check to avoid false positives from different CWD
        if (adapterName === "generic") continue;
        const installed = await adapter.isInstalled(rec.slug);
        if (!installed) {
          console.log(`  ! missing link: ${name} on ${adapterName} → ${adapter.skillDir(rec.slug)}`);
          if (opts.fix) {
            const src = liveDir;
            if (existsSync(src)) {
              await adapter.install(rec.slug, src, rec.type ?? "skill");
              console.log(`    → fixed`);
              fixed++;
            } else {
              console.log(`    → cannot fix, store missing`);
            }
          }
        }
      }
    }
    if (broken === 0) console.log("\n[forge] ✓ no broken packages");
    else console.log(`\n[forge] ${broken} broken package(s)${opts.fix ? ` (${fixed} fixed)` : " — run with --fix"}`);
  });

// --- search ---
program
  .command("search")
  .description("Search registry")
  .argument("<query>", "search query")
  .option("--type <type>", "filter by type (skill/mcp/plugin/agent/command/hook)")
  .option("--json", "output JSON")
  .action(async (query, opts) => {
    const results = searchPackages(query);
    let filtered = results;
    if (opts.type) filtered = filtered.filter((p) => p.type === opts.type);
    if (opts.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }
    if (filtered.length === 0) {
      console.log(`No results for "${query}"${opts.type ? ` [type=${opts.type}]` : ""}`);
      return;
    }
    console.log(`Found ${filtered.length} package(s) for "${query}":\n`);
    for (const p of filtered) {
      console.log(`  - ${p.name}@${p.latest} [${p.type}] — ${p.description}`);
      if (p.keywords?.length) console.log(`    keywords: ${p.keywords.join(", ")}`);
    }
  });

// --- info ---
program
  .command("info")
  .description("Show package info")
  .argument("<pkg>", "package name")
  .option("--json", "output JSON")
  .action(async (pkg, opts) => {
    try {
      const detail = loadPackageDetail(pkg);
      if (opts.json) {
        console.log(JSON.stringify(detail, null, 2));
        return;
      }
      console.log(`\n${detail.name} [${detail.type}] — ${detail.description}\n`);
      if (detail.homepage) console.log(`homepage:   ${detail.homepage}`);
      if (detail.repository) console.log(`repository: ${detail.repository}`);
      if (detail.keywords?.length) console.log(`keywords:   ${detail.keywords.join(", ")}`);
      console.log(`latest:     ${detail.latest}`);
      console.log(`versions:   ${Object.keys(detail.versions).join(", ")}\n`);
      for (const [ver, meta] of Object.entries(detail.versions)) {
        const marker = ver === detail.latest ? " (latest)" : "";
        console.log(`  ${ver}${marker}:`);
        console.log(`    tarball: ${meta.tarball}`);
        console.log(`    sha256:  ${meta.sha256.slice(0, 16)}...`);
        if (meta.engines) console.log(`    engines: ${JSON.stringify(meta.engines)}`);
        if (meta.dependencies && Object.keys(meta.dependencies).length) console.log(`    deps:    ${JSON.stringify(meta.dependencies)}`);
        if (meta.mcp) console.log(`    mcp:     ${meta.mcp.command} ${(meta.mcp.args ?? []).join(" ")}`);
      }
    } catch (e) {
      console.error(`Package ${pkg} not found: ${(e as Error).message}`);
      process.exit(1);
    }
  });

// --- init ---
program
  .command("init")
  .description("Scaffold a new package (e.g. forge init my-skill --type skill)")
  .argument("[name]", "package name (e.g. my-skill or scope/name)")
  .option("--type <type>", "package type (skill/mcp/agent/command/hook/plugin)", "skill")
  .option("--yes", "skip prompts and use defaults", false)
  .option("--force", "overwrite existing forge.toml", false)
  .action(async (name, opts) => {
    await runInit({ name, type: opts.type, yes: opts.yes, force: opts.force });
  });

// --- install ---
program
  .command("install")
  .alias("i")
  .description("Install all dependencies from forge.toml (team sync, e.g. forge install)")
  .option("--frozen", "install exactly from forge.lock", false)
  .option("--mock", "allow mock content for packages with no verified tarball yet", false)
  .action(async (opts) => {
    await runInstall({ frozen: opts.frozen, mock: opts.mock });
  });

// --- outdated ---
program
  .command("outdated")
  .description("Show outdated packages")
  .action(async () => {
    await runOutdated();
  });

// --- update ---
program
  .command("update")
  .description("Update packages to latest")
  .argument("[pkg]", "package to update (all if omitted)")
  .option("--mock", "allow mock content for packages with no verified tarball yet", false)
  .action(async (pkg, opts) => {
    await runUpdate(pkg, { mock: opts.mock });
  });

// --- audit (Faz 10 iskelet, Faz 22'de tam) ---
program
  .command("audit")
  .description("Audit installed packages (skeleton — full DB in Faz 22)")
  .option("--json", "output JSON", false)
  .action(async (opts) => {
    await runAudit({ json: opts.json });
  });

program.parse();
