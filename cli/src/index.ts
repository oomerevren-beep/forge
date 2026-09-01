#!/usr/bin/env bun
// forge CLI entry — v0.1 skeleton
import { Command } from "commander";

const program = new Command();

program
  .name("forge")
  .description("The Homebrew for AI Agents — one CLI for skills, MCPs, plugins, agents")
  .version("0.1.0");

program.command("add")
  .description("Install a package")
  .argument("<pkg>", "package name, e.g. anthropics/plan")
  .option("--global", "install globally")
  .action(async (pkg) => {
    console.log(`[forge] would install ${pkg} — adapters not yet implemented (v0.1 skeleton)`);
    console.log("See docs/ARCHITECTURE.md for plan.");
  });

program.command("search")
  .description("Search registry")
  .argument("<query>", "search query")
  .action(async (query) => {
    const { readFileSync } = await import("fs");
    const index = JSON.parse(readFileSync("registry/index.json", "utf-8"));
    const results = Object.values(index.packages as Record<string, any>)
      .filter((p: any) => `${p.name} ${p.description} ${p.keywords?.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
    if (results.length === 0) console.log(`No results for "${query}"`);
    else results.forEach((p: any) => console.log(`- ${p.name}@${p.latest} [${p.type}] — ${p.description}`));
  });

program.command("list")
  .description("List installed packages")
  .action(async () => {
    console.log("[forge] list — reads ~/.forge/packages (not yet implemented)");
  });

program.command("doctor")
  .description("Check harness health")
  .action(async () => {
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const { homedir } = await import("os");
    const checks = [
      { name: "claude-code", path: join(homedir(), ".claude") },
      { name: "codex", path: join(homedir(), ".codex") },
      { name: "opencode", path: "opencode.json" },
      { name: "cursor", path: join(process.cwd(), ".cursor") },
    ];
    for (const c of checks) {
      const ok = existsSync(c.path);
      console.log(`${ok ? "✓" : "✗"} ${c.name} — ${c.path} ${ok ? "(found)" : "(not found)"}`);
    }
  });

program.command("info")
  .description("Show package info")
  .argument("<pkg>", "package name")
  .action(async (pkg) => {
    const slug = pkg.replace("/", "-");
    const { readFileSync, existsSync } = await import("fs");
    const p = `registry/packages/${slug}.json`;
    if (!existsSync(p)) { console.error(`Package ${pkg} not found in registry`); process.exit(1); }
    console.log(readFileSync(p, "utf-8"));
  });

program.parse();
