// cli/src/commands/tui.ts — Interactive TUI dashboard (Phase 4).

import {
  intro,
  outro,
  select,
  multiselect,
  text,
  spinner,
  isCancel,
  cancel,
} from "@clack/prompts";
import colors from "picocolors";

import { detectAdapters } from "../adapters/index.js";
import { searchPackages } from "../core/registry.js";
import { runSync } from "./sync.js";
import { findProjectToml } from "../core/project.js";

interface TuiItem {
  value: string;
  label: string;
  hint?: string;
}

function detectProjectHarnesses(): string[] {
  const detected = detectAdapters();
  return detected.map((a) => a.displayName);
}

function buildSkillItems(): TuiItem[] {
  return [
    { value: "agent-pr-reviewer", label: "Agent PR Reviewer", hint: "Auto-review PRs" },
    { value: "agent-security-auditor", label: "Security Auditor", hint: "AST-based scan" },
    { value: "agent-test-generator", label: "Test Generator", hint: "Write tests" },
    { value: "cmd-plan", label: "Plan Command", hint: "/plan slash cmd" },
    { value: "cmd-review", label: "Review Command", hint: "/review slash cmd" },
  ];
}

function buildMcpItems(): TuiItem[] {
  return [
    { value: "mcp-filesystem", label: "Filesystem MCP", hint: "Local file access" },
    { value: "mcp-github", label: "GitHub MCP", hint: "Repos, PRs, issues" },
    { value: "mcp-postgres", label: "Postgres MCP", hint: "Database queries" },
    { value: "mcp-memory", label: "Memory MCP", hint: "Persistent memory" },
    { value: "mcp-sequential-thinking", label: "Sequential Thinking", hint: "Step-by-step" },
  ];
}

function buildRoleItems(): TuiItem[] {
  return [
    { value: "role-developer", label: "Senior Developer", hint: "Full-stack coding" },
    { value: "role-reviewer", label: "Code Reviewer", hint: "PR review focus" },
    { value: "role-architect", label: "System Architect", hint: "Design & patterns" },
    { value: "role-tester", label: "QA Engineer", hint: "Testing strategy" },
  ];
}

async function promptSearch(): Promise<void> {
  const query = await text({
    message: "Search packages (or press Enter to browse)",
    placeholder: "e.g. pdf, mcp, security...",
  });
  if (isCancel(query)) {
    cancel("Cancelled.");
    process.exit(0);
  }
  if (query.trim()) {
    const s = spinner();
    s.start(`Searching for "${query}"...`);
    try {
      const results = await searchPackages(query);
      s.stop(`Found ${results.length} package(s)`);
      if (results.length === 0) {
        outro(colors.yellow("No results. Try a different query."));
        return;
      }
      const picked = await multiselect({
        message: `Select packages to install (${results.length} found)`,
        options: results.slice(0, 15).map((p) => ({
          value: p.name,
          label: `${p.name}@${p.latest}`,
          hint: p.description.slice(0, 60),
        })),
        required: false,
      });
      if (isCancel(picked)) {
        cancel("Cancelled.");
        process.exit(0);
      }
      if (picked.length > 0) {
        outro(colors.cyan(`Selected: ${picked.join(", ")} - run 'forge add <pkg>' to install.`));
      }
    } catch (e) {
      s.stop("Search failed");
      outro(colors.red(`Error: ${(e as Error).message}`));
    }
  }
}

export async function runTui(): Promise<void> {
  intro(colors.bold(colors.magenta("🔥 Forge - The Homebrew for AI Agents")));

  const harnesses = detectProjectHarnesses();
  if (harnesses.length > 0) {
    console.log(colors.dim(`  Detected: ${harnesses.join(", ")}`));
  } else {
    console.log(colors.dim("  No editor detected - installing for all harnesses."));
  }

  const tomlPath = findProjectToml(process.cwd());
  if (tomlPath) {
    console.log(colors.dim(`  Project: ${tomlPath}`));
  }

  const category = await select({
    message: "What would you like to do?",
    options: [
      { value: "browse", label: "Browse & Install Packages", hint: "Skills, MCPs, agents" },
      { value: "search", label: "Search Registry", hint: "Fuzzy search all packages" },
      { value: "sync", label: "Sync Team Context", hint: "forge sync - all editors" },
      { value: "init", label: "Create New Package", hint: "forge init <name>" },
      { value: "audit", label: "Security Audit", hint: "Scan installed packages" },
    ],
  });

  if (isCancel(category)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  switch (category) {
    case "search":
      await promptSearch();
      break;

    case "sync": {
      const s = spinner();
      s.start("Syncing team context...");
      try {
        await runSync({});
        s.stop("Sync complete");
        outro(colors.green("✓ Every editor now shares the same context"));
      } catch (e) {
        s.stop("Sync failed");
        outro(colors.red(`Error: ${(e as Error).message}`));
      }
      break;
    }

    case "init": {
      const type = await select({
        message: "Package type?",
        options: [
          { value: "skill", label: "Skill", hint: "SKILL.md capability" },
          { value: "mcp", label: "MCP Server", hint: "Model Context Protocol" },
          { value: "agent", label: "Agent", hint: "Subagent definition" },
          { value: "command", label: "Command", hint: "Slash command" },
        ],
      });
      if (isCancel(type)) {
        cancel("Cancelled.");
        process.exit(0);
      }
      outro(colors.cyan(`Run: forge init <name> --type ${type} --yes`));
      break;
    }

    case "audit":
      outro(colors.cyan("Run: forge audit"));
      break;

    case "browse":
    default: {
      const subCategory = await select({
        message: "Browse category",
        options: [
          { value: "skills", label: "Popular Skills", hint: "Code review, planning, etc." },
          { value: "mcp", label: "MCP Servers", hint: "Postgres, GitHub, Filesystem" },
          { value: "roles", label: "Agent Role Templates", hint: "Pre-built team roles" },
        ],
      });
      if (isCancel(subCategory)) {
        cancel("Cancelled.");
        process.exit(0);
      }

      let items: TuiItem[] = [];
      switch (subCategory) {
        case "skills":
          items = buildSkillItems();
          break;
        case "mcp":
          items = buildMcpItems();
          break;
        case "roles":
          items = buildRoleItems();
          break;
      }

      const picked = await multiselect({
        message: `Select ${subCategory} to install (Space to select, Enter to confirm)`,
        options: items,
        required: false,
      });

      if (isCancel(picked)) {
        cancel("Cancelled.");
        process.exit(0);
      }

      if (picked.length === 0) {
        outro(colors.yellow("Nothing selected."));
        return;
      }

      const s = spinner();
      s.start(`Installing ${picked.length} package(s)...`);
      s.stop(`${picked.length} package(s) selected`);
      outro(colors.cyan(`Run:\n${picked.map((p) => `  forge add ${p}`).join("\n")}`));
      break;
    }
  }
}
