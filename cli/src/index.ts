#!/usr/bin/env node
// forge CLI — v0.2 (FVP: Full Viable Product)
import { Command } from "commander";
import { existsSync, rmSync } from "fs";

import { loadPackageDetail, resolveVersion, parsePackageArg, searchPackages } from "./core/registry.js";
import { parseSourceArg } from "./core/sources.js";
import { ensurePackageContent } from "./core/installer.js";
import { ensureForgeDirs, readLinks, writeLinks, packageDir, toSlug, listInstalledPackages } from "./core/store.js";
import { allAdapters, detectAdapters, addMcpServerToConfig, removeMcpServerFromConfig } from "./adapters/index.js";
import { runInit } from "./commands/init.js";
import { runInstall } from "./commands/install.js";
import { runSync } from "./commands/sync.js";
import { runOutdated, runUpdate } from "./commands/update.js";
import { runAudit } from "./commands/audit.js";
import { runDoctor } from "./commands/doctor.js";
import { DEP_NAME_RE, findProjectToml, loadProjectToml } from "./core/project.js";
import { ensureConfig } from "./core/config.js";
import { scanPackageDir } from "./core/scan.js";
import { formatActionableError } from "./core/errors.js";

ensureConfig();

const program = new Command();

program
  .name("forge")
  .description("Forge — Docker for AI Agent Context. Universal package manager for skills, MCPs, plugins, agents.")
  .version("0.2.0")
  .helpOption("-h, --help", "display help for command");

// --- add ---
program
  .command("add")
  .description("Install a package (registry, github:, git URL, or local path)")
  .argument("<pkg>", "package ref: scope/name[@range], github:owner/repo[#ref], <git-url>[#ref], ./local/path")
  .option("--global", "install globally (default)")
  .option("--dry-run", "show what would be installed without writing")
  .option("--mock", "allow mock content for packages with no verified tarball yet")
  .option("--skip-scan", "skip the pre-install security scan (not recommended)", false)
  .action(async (pkgArg, opts) => {
    const { installExternal } = await import("./commands/add-external.js");
    const extOpts = { dryRun: opts.dryRun, mock: opts.mock, skipScan: opts.skipScan };
    const spec = parseSourceArg(pkgArg);
    // Explicit external sources (github:, git URLs, local paths) bypass the registry.
    if (spec.kind !== "registry" && spec.explicit) {
      await installExternal(spec, extOpts);
      return;
    }
    // Bare owner/repo (or scope/name[@range]): registry FIRST, GitHub fallback.
    const { name, version: requested } = parsePackageArg(pkgArg);
    if (!DEP_NAME_RE.test(name)) {
      console.error(`[forge] invalid package name "${name}" — expected scope/name (e.g. anthropics/plan)`);
      process.exit(1);
    }
    if (spec.kind !== "registry") {
      try {
        await loadPackageDetail(name);
      } catch {
        console.log(`[forge] ${name} not in registry — trying GitHub...`);
        await installExternal({ ...spec, explicit: true }, extOpts);
        return;
      }
    }
    console.log(`[forge] resolving ${name}${requested ? "@" + requested : ""}...`);

    let detail, version, versionMeta;
    try {
      const resolved = await resolveVersion(name, requested);
      detail = resolved.detail;
      version = resolved.version;
      versionMeta = resolved.versionMeta;
    } catch (e) {
      console.error(formatActionableError(e));
      process.exit(1);
    }

    const slug = toSlug(name);
    console.log(`[forge] found ${name}@${version} [${detail.type}] — ${detail.description}`);
    console.log(versionMeta.verified
      ? `[forge] verified tarball ✓ (sha256 pinned)`
      : `[forge] community tier (unverified) — install needs a verified tarball or --mock`);

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
      console.error(formatActionableError(e));
      process.exitCode = 1;
      return;
    }
    console.log(`[forge] package content ready: ${srcDir}`);
    // Pre-install security scan: HIGH findings fail-closed unless --skip-scan
    if (!opts.skipScan) {
      let permissions;
      try {
        const tomlPath = findProjectToml(process.cwd());
        if (tomlPath) permissions = loadProjectToml(tomlPath).permissions;
      } catch { /* best-effort */ }
      const findings = scanPackageDir(srcDir, { permissions });
      const highs = findings.filter((f) => f.severity === "high");
      const mediums = findings.filter((f) => f.severity === "medium");
      for (const f of mediums.slice(0, 10)) {
        console.warn(`[forge] scan warn [${f.rule}] ${f.file}${f.line > 0 ? `:${f.line}` : ""} — ${f.message}`);
      }
      if (highs.length > 0) {
        console.error(`[forge] ✗ security scan FAILED for ${name}: ${highs.length} high-severity finding(s)`);
        for (const f of highs.slice(0, 10)) {
          console.error(`[forge]   [high] [${f.rule}] ${f.file}${f.line > 0 ? `:${f.line}` : ""} — ${f.message}`);
        }
        console.error(`[forge] Refusing to install. Re-run with --skip-scan only if you trust this package.`);
        process.exitCode = 1;
        return;
      }
      console.log(`[forge] scan clean (${findings.length} finding(s), 0 high)`);
    }

    // Detect adapters
    const adapters = detectAdapters();
    console.log(`[forge] detected harnesses: ${adapters.map((a) => `${a.displayName} (${a.name})`).join(", ")}`);

    // Install to each adapter
    let failed = 0;
    for (const adapter of adapters) {
      try {
        await adapter.install(slug, srcDir, detail.type, { version, description: detail.description });
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
        failed++;
      }
    }

    // Epoch 1e: exit 1 on any adapter failure
    if (failed > 0) {
      console.log(`\n[forge] ✗ ${failed} harness(es) failed — installed on ${adapters.length - failed}/${adapters.length}`);
      process.exitCode = 1;
    } else {
      console.log(`\n[forge] ✓ installed ${name}@${version} on ${adapters.length} harness(es)`);
    }

    // Handle dependencies (shallow, one level for v0.1)
    const deps = versionMeta.dependencies ?? {};
    if (Object.keys(deps).length > 0) {
      console.log(`[forge] installing ${Object.keys(deps).length} dependencies...`);
      for (const [depName, depRange] of Object.entries(deps)) {
        try {
          const depResolved = await resolveVersion(depName, depRange);
          const depSrc = await ensurePackageContent(depName, depResolved.version, depResolved.detail, depResolved.versionMeta, { allowMock: opts.mock });
          for (const adapter of adapters) {
            await adapter.install(toSlug(depName), depSrc, depResolved.detail.type, {
              version: depResolved.version,
              description: depResolved.detail.description,
            });
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
      }
      // Epoch 1d: MCP config cleanup — ALWAYS, even if link is missing
      // (orphan MCP entries from crashed installs)
      const cfgPath = adapter.mcpConfigPath();
      if (cfgPath) {
        try {
          removeMcpServerFromConfig(cfgPath, slug);
        } catch { /* stale MCP entries are best-effort cleanup */ }
      }
    }
    // Remove from store (keep cache? remove package dir)
    if (record) {
      const dir = packageDir(slug, record.version);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
        console.log(`[forge] removed store: ${dir}`);
      }
      Reflect.deleteProperty(links, name);
      writeLinks(links);
    } else {
      // Epoch 1d: always clean links entry if it exists (even partial)
      if (links[name]) {
        Reflect.deleteProperty(links, name);
        writeLinks(links);
      }
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
  .option("--json", "output JSON", false)
  .action(async (opts) => {
    const links = readLinks();
    const entries = Object.values(links);
    if (opts.json) {
      if (entries.length === 0) {
        const pkgs = listInstalledPackages();
        const jsonList = pkgs.map((p) => ({
          name: p.slug,
          version: p.version,
          slug: p.slug,
          type: "skill",
          adapters: [],
          installedAt: "",
          dir: p.dir,
          exists: existsSync(p.dir),
        }));
        console.log(JSON.stringify(jsonList, null, 2));
        return;
      }
      const jsonList = entries.map((r) => {
        const dir = packageDir(r.slug, r.version);
        return {
          name: r.pkg,
          version: r.version,
          slug: r.slug,
          type: r.type,
          adapters: r.adapters,
          installedAt: r.installedAt,
          dir,
          exists: existsSync(dir),
        };
      });
      console.log(JSON.stringify(jsonList, null, 2));
      return;
    }
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
  .description("Check system environment and harness health diagnostics")
  .option("--fix", "try to fix broken links")
  .option("--mock", "allow mock content when --fix restores packages with no verified tarball")
  .option("--json", "output JSON", false)
  .action(async (opts) => {
    const res = await runDoctor({ fix: opts.fix, mock: opts.mock, json: opts.json });
    if (!res.ok) process.exitCode = 1;
  });

// --- search ---
program
  .command("search")
  .description("Search registry")
  .argument("<query>", "search query")
  .option("--type <type>", "filter by type (skill/mcp/plugin/agent/command/instruction/workflow/rule/prompt/config)")
  .option("--harness <harness>", "filter by supported harness (claude-code/cursor/codex/windsurf/opencode)")
  .option("--tier <tier>", "filter by quality tier (community/verified/trusted)")
  .option("--author <author>", "filter by author or organization")
  .option("--json", "output JSON")
  .action(async (query, opts) => {
    const results = await searchPackages(query, {
      type: opts.type,
      harness: opts.harness,
      tier: opts.tier,
      author: opts.author,
    });
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    if (results.length === 0) {
      const filters = [
        opts.type ? `type=${opts.type}` : null,
        opts.harness ? `harness=${opts.harness}` : null,
        opts.tier ? `tier=${opts.tier}` : null,
        opts.author ? `author=${opts.author}` : null,
      ].filter(Boolean).join(", ");
      console.log(`No results for "${query}"${filters ? ` [${filters}]` : ""}`);
      return;
    }
    console.log(`Found ${results.length} package(s) for "${query}":\n`);
    for (const p of results) {
      const tier = p.tier ?? (p.verified ? "verified" : "community");
      const mark =
        tier === "trusted"
          ? " [trusted ★]"
          : tier === "verified"
          ? " [verified ✓]"
          : " [community]";
      const authorStr = p.author ? ` by ${p.author}` : "";
      console.log(`  - ${p.name}@${p.latest} [${p.type}]${mark}${authorStr} — ${p.description}`);
      if (p.keywords?.length) console.log(`    keywords: ${p.keywords.join(", ")}`);
    }
  });

// --- info ---
program
  .command("info")
  .description("Show package info with trust signals, permissions, and discovery")
  .argument("<pkg>", "package name")
  .option("--json", "output JSON")
  .action(async (pkg, opts) => {
    const { runInfo } = await import("./commands/info.js");
    await runInfo(pkg, { json: opts.json });
  });

// --- init ---
program
  .command("init")
  .description("Scaffold a new package or import existing configs (forge init --from-existing)")
  .argument("[name]", "package name (e.g. my-skill or scope/name)")
  .option("--type <type>", "package type (skill/mcp/agent/command/hook/plugin)", "skill")
  .option("--yes", "skip prompts and use defaults", false)
  .option("--force", "overwrite existing forge.toml", false)
  .option("--from-existing", "import existing .cursorrules, CLAUDE.md, mcp.json into forge.toml")
  .action(async (name, opts) => {
    await runInit({ name, type: opts.type, yes: opts.yes, force: opts.force, fromExisting: opts.fromExisting });
  });

// --- install ---
program
  .command("install")
  .alias("i")
  .description("Install all dependencies from forge.toml (team sync, e.g. forge install)")
  .option("--frozen", "install exactly from forge.lock", false)
  .option("--mock", "allow mock content for packages with no verified tarball yet", false)
  .option("--skip-scan", "skip the pre-install security scan (not recommended)", false)
  .action(async (opts) => {
    await runInstall({ frozen: opts.frozen, mock: opts.mock, skipScan: opts.skipScan });
  });

// --- sync ---
program
  .command("sync")
  .description("One-command team sync: skills + rules + MCP servers + agent roles (e.g. forge sync)")
  .option("--frozen", "fail loudly if forge.lock is missing, out of sync, or unverified", false)
  .option("--mock", "allow mock content for packages with no verified tarball yet", false)
  .option("--skip-scan", "skip the pre-install security scan (not recommended)", false)
  .option("--watch", "watch forge.toml for changes and auto-sync (hot reload)", false)
  .option("--dry-run", "preview changes without modifying files", false)
  .option("--diff", "show colored unified diff of changes before writing", false)
  .action(async (opts) => {
    await runSync({
      frozen: opts.frozen,
      mock: opts.mock,
      skipScan: opts.skipScan,
      watch: opts.watch,
      dryRun: opts.dryRun,
      diff: opts.diff,
    });
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

// --- tui ---
program
  .command("tui")
  .description("Launch interactive TUI dashboard (no args = same as npx forge)")
  .action(async () => {
    const { runTui } = await import("./commands/tui.js");
    await runTui();
  });

// --- test ---
program
  .command("test")
  .description("Test a package against the adapter matrix (dry-run install)")
  .argument("<pkg>", "package name or path")
  .option("--mock", "allow mock content for packages with no verified tarball yet", false)
  .action(async (pkg, opts) => {
    const { runTest } = await import("./commands/test.js");
    await runTest(pkg, { mock: opts.mock });
  });

// --- create ---
program
  .command("create")
  .description("Scaffold a new Forge package with manifest, README, LICENSE, and test template")
  .argument("<name>", "package name (e.g. my-skill or scope/name)")
  .option("--type <type>", "package type (skill/agent/mcp/rule/command/instruction/workflow/prompt/config)", "skill")
  .option("--author <author>", "author name and optional email")
  .option("--description <desc>", "package description")
  .option("--license <license>", "SPDX license (default MIT)", "MIT")
  .option("--force", "overwrite existing files", false)
  .option("--cwd <path>", "working directory")
  .action(async (name, opts) => {
    const { runCreate } = await import("./commands/create.js");
    await runCreate(name, opts);
  });

// --- validate ---
program
  .command("validate")
  .description("Strict pre-publish validation: manifest, semver, license, README, permissions, secrets, and security")
  .argument("[path]", "path to package directory", ".")
  .option("--json", "output JSON", false)
  .action(async (path, opts) => {
    const { runValidate } = await import("./commands/validate.js");
    await runValidate(path, { json: opts.json });
  });

// --- pack ---
program
  .command("pack")
  .description("Package the directory into a verified deterministic tarball")
  .argument("[path]", "path to package directory", ".")
  .option("--check", "validate only — do not write tarball", false)
  .option("--out <dir>", "output directory for tarball")
  .option("--json", "output JSON", false)
  .action(async (path, opts) => {
    const { runPack } = await import("./commands/pack.js");
    await runPack(path, { check: opts.check, out: opts.out, json: opts.json });
  });

// --- publish ---
program
  .command("publish")
  .description("Publish package: validate -> scan -> pack -> registry")
  .argument("[path]", "path to package directory", ".")
  .option("--dry-run", "preview actions without publishing", false)
  .option("--token <token>", "authentication token for registry")
  .option("--registry <url>", "target registry URL")
  .option("--tag <tag>", "release tag", "latest")
  .option("--access <access>", "package access level (public/restricted)", "public")
  .option("--json", "output JSON", false)
  .action(async (path, opts) => {
    const { runPublish } = await import("./commands/publish.js");
    await runPublish(path, opts);
  });

// --- verify ---
program
  .command("verify")
  .description("Verify a package: schema, permissions, security scan")
  .argument("<pkg>", "package name or path")
  .action(async (pkg) => {
    const { runVerify } = await import("./commands/verify.js");
    await runVerify(pkg);
  });

// --- audit (Phase 10 skeleton, full DB in Phase 22) ---
program
  .command("audit")
  .description("Audit installed packages (skeleton — full DB in Phase 22)")
  .option("--json", "output JSON", false)
  .action(async (opts) => {
    await runAudit({ json: opts.json });
  });

program.parse();
