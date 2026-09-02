import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, symlinkSync, lstatSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// Re-export store helpers for adapter use
export { forgeHome, packagesDir, packageDir, toSlug } from "../core/store.js";

export interface Adapter {
  readonly name: string;
  readonly displayName: string;
  detect(): boolean;
  skillDir(slug: string): string;
  mcpConfigPath(): string | null;
  install(pkgSlug: string, srcDir: string, type: string): Promise<void>;
  uninstall(pkgSlug: string, type: string): Promise<void>;
  list(): Promise<string[]>;
  isInstalled(pkgSlug: string): Promise<boolean>;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function trySymlinkOrCopy(src: string, dest: string): void {
  ensureDir(dirname(dest));
  // remove existing
  if (existsSync(dest)) {
    try {
      const stat = lstatSync(dest);
      if (stat.isSymbolicLink()) unlinkSync(dest);
      else rmSync(dest, { recursive: true, force: true });
    } catch {
      rmSync(dest, { recursive: true, force: true });
    }
  }
  // Try symlink first (junction on Windows for dirs)
  try {
    const isWin = process.platform === "win32";
    // For directories on Windows, use junction
    symlinkSync(src, dest, isWin ? "junction" : "dir");
    return;
  } catch {
    // Fallback to copy
    cpSync(src, dest, { recursive: true });
  }
}

function removeLinkOrDir(target: string): void {
  if (!existsSync(target)) return;
  try {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) unlinkSync(target);
    else rmSync(target, { recursive: true, force: true });
  } catch {
    rmSync(target, { recursive: true, force: true });
  }
}

// --- MCP config helpers ---
export function readMcpConfig(configPath: string): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeMcpConfig(configPath: string, data: Record<string, unknown>): void {
  ensureDir(dirname(configPath));
  writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n");
}

// MCP server entry helpers — handle both claude settings.json and standard mcp.json shapes
export function addMcpServerToConfig(configPath: string, name: string, mcp: { command: string; args?: string[]; env?: Record<string, string> }): void {
  const cfg = readMcpConfig(configPath);
  // Claude: { mcpServers: { name: { command, args, env } } }  or  { mcp: { servers: ... } }
  // Generic: { mcpServers: { ... } }
  const serversKey = (cfg["mcpServers"] ? "mcpServers" : cfg["mcp"] ? "mcp" : "mcpServers") as string;
  // Normalize: always ensure mcpServers exists
  if (!cfg["mcpServers"]) cfg["mcpServers"] = {};
  const servers = cfg["mcpServers"] as Record<string, unknown>;
  servers[name] = {
    command: mcp.command,
    args: mcp.args ?? [],
    ...(mcp.env ? { env: mcp.env } : {}),
  };
  writeMcpConfig(configPath, cfg);
}

export function removeMcpServerFromConfig(configPath: string, name: string): void {
  if (!existsSync(configPath)) return;
  const cfg = readMcpConfig(configPath);
  const servers = cfg["mcpServers"] as Record<string, unknown> | undefined;
  if (servers && name in servers) {
    delete servers[name];
    writeMcpConfig(configPath, cfg);
  }
}

// --- Skill install helper (shared) ---
function installSkillFiles(adapterName: string, pkgSlug: string, srcDir: string, destBase: string): void {
  const dest = join(destBase, pkgSlug);
  trySymlinkOrCopy(srcDir, dest);
}

function uninstallSkillFiles(pkgSlug: string, destBase: string): void {
  const dest = join(destBase, pkgSlug);
  removeLinkOrDir(dest);
}

// --- Adapters ---

export const claudeAdapter: Adapter = {
  name: "claude-code",
  displayName: "Claude Code",
  detect: () => existsSync(join(homedir(), ".claude")),
  skillDir: (slug) => join(homedir(), ".claude", "skills", slug),
  mcpConfigPath: () => join(homedir(), ".claude", "settings.json"),
  async install(pkgSlug, srcDir, type) {
    if (type === "skill" || type === "agent" || type === "command") {
      const base = join(homedir(), ".claude", "skills");
      installSkillFiles("claude-code", pkgSlug, srcDir, base);
    }
    if (type === "agent") {
      // also try agents dir
      const agentsBase = join(homedir(), ".claude", "agents");
      // skillDir already covers, but also ensure agents symlink?
    }
  },
  async uninstall(pkgSlug, type) {
    if (type === "skill" || type === "agent" || type === "command") {
      uninstallSkillFiles(pkgSlug, join(homedir(), ".claude", "skills"));
      // also clean agents if exists
      const agentPath = join(homedir(), ".claude", "agents", pkgSlug);
      removeLinkOrDir(agentPath);
    }
  },
  async list() {
    const dir = join(homedir(), ".claude", "skills");
    if (!existsSync(dir)) return [];
    const { readdirSync } = await import("fs");
    return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() || d.isSymbolicLink()).map((d) => d.name);
  },
  async isInstalled(pkgSlug) {
    return existsSync(join(homedir(), ".claude", "skills", pkgSlug));
  },
};

export const codexAdapter: Adapter = {
  name: "codex",
  displayName: "Codex",
  detect: () => existsSync(join(homedir(), ".codex")),
  skillDir: (slug) => join(homedir(), ".codex", "skills", slug),
  mcpConfigPath: () => join(homedir(), ".codex", "mcp.json"),
  async install(pkgSlug, srcDir, type) {
    if (type === "skill" || type === "agent" || type === "command") {
      installSkillFiles("codex", pkgSlug, srcDir, join(homedir(), ".codex", "skills"));
    }
  },
  async uninstall(pkgSlug, _type) {
    uninstallSkillFiles(pkgSlug, join(homedir(), ".codex", "skills"));
  },
  async list() {
    const dir = join(homedir(), ".codex", "skills");
    if (!existsSync(dir)) return [];
    const { readdirSync } = await import("fs");
    return readdirSync(dir, { withFileTypes: true }).filter((d) => (d.isDirectory() || d.isSymbolicLink()) && !d.name.startsWith(".")).map((d) => d.name);
  },
  async isInstalled(pkgSlug) {
    return existsSync(join(homedir(), ".codex", "skills", pkgSlug));
  },
};

export const opencodeAdapter: Adapter = {
  name: "opencode",
  displayName: "OpenCode",
  detect: () => existsSync(join(process.cwd(), "opencode.json")) || existsSync(join(homedir(), ".config", "opencode", "opencode.json")),
  skillDir: (slug) => join(process.cwd(), ".opencode", "skills", slug),
  mcpConfigPath: () => {
    // prefer project-level
    const proj = join(process.cwd(), "opencode.json");
    if (existsSync(proj)) return proj;
    return join(homedir(), ".config", "opencode", "opencode.json");
  },
  async install(pkgSlug, srcDir, type) {
    const isProject = existsSync(join(process.cwd(), "opencode.json"));
    const base = isProject ? join(process.cwd(), ".opencode", "skills") : join(homedir(), ".config", "opencode", "skills");
    if (type === "skill" || type === "agent" || type === "command") {
      installSkillFiles("opencode", pkgSlug, srcDir, base);
    }
  },
  async uninstall(pkgSlug, _type) {
    const isProject = existsSync(join(process.cwd(), "opencode.json"));
    const base = isProject ? join(process.cwd(), ".opencode", "skills") : join(homedir(), ".config", "opencode", "skills");
    uninstallSkillFiles(pkgSlug, base);
  },
  async list() {
    const bases = [join(process.cwd(), ".opencode", "skills"), join(homedir(), ".config", "opencode", "skills")];
    for (const b of bases) {
      if (existsSync(b)) {
        const { readdirSync } = await import("fs");
        return readdirSync(b, { withFileTypes: true }).filter((d) => d.isDirectory() || d.isSymbolicLink()).map((d) => d.name);
      }
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".opencode", "skills"), join(homedir(), ".config", "opencode", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};

export const cursorAdapter: Adapter = {
  name: "cursor",
  displayName: "Cursor",
  detect: () => existsSync(join(process.cwd(), ".cursor")) || existsSync(join(homedir(), ".cursor")),
  skillDir: (slug) => {
    if (existsSync(join(process.cwd(), ".cursor"))) return join(process.cwd(), ".cursor", "skills", slug);
    return join(homedir(), ".cursor", "skills", slug);
  },
  mcpConfigPath: () => {
    if (existsSync(join(process.cwd(), ".cursor"))) return join(process.cwd(), ".cursor", "mcp.json");
    return join(homedir(), ".cursor", "mcp.json");
  },
  async install(pkgSlug, srcDir, type) {
    const base = existsSync(join(process.cwd(), ".cursor")) ? join(process.cwd(), ".cursor", "skills") : join(homedir(), ".cursor", "skills");
    if (type === "skill" || type === "agent" || type === "command") {
      installSkillFiles("cursor", pkgSlug, srcDir, base);
    }
  },
  async uninstall(pkgSlug, _type) {
    const base = existsSync(join(process.cwd(), ".cursor")) ? join(process.cwd(), ".cursor", "skills") : join(homedir(), ".cursor", "skills");
    uninstallSkillFiles(pkgSlug, base);
  },
  async list() {
    const bases = [join(process.cwd(), ".cursor", "skills"), join(homedir(), ".cursor", "skills")];
    for (const b of bases) {
      if (existsSync(b)) {
        const { readdirSync } = await import("fs");
        return readdirSync(b, { withFileTypes: true }).filter((d) => d.isDirectory() || d.isSymbolicLink()).map((d) => d.name);
      }
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".cursor", "skills"), join(homedir(), ".cursor", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};

export const genericAdapter: Adapter = {
  name: "generic",
  displayName: "Generic (.forge)",
  detect: () => true, // always as fallback
  skillDir: (slug) => join(process.cwd(), ".forge", "packages", slug),
  mcpConfigPath: () => join(process.cwd(), ".forge", "mcp.json"),
  async install(pkgSlug, srcDir, _type) {
    installSkillFiles("generic", pkgSlug, srcDir, join(process.cwd(), ".forge", "packages"));
  },
  async uninstall(pkgSlug, _type) {
    uninstallSkillFiles(pkgSlug, join(process.cwd(), ".forge", "packages"));
  },
  async list() {
    const dir = join(process.cwd(), ".forge", "packages");
    if (!existsSync(dir)) return [];
    const { readdirSync } = await import("fs");
    return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() || d.isSymbolicLink()).map((d) => d.name);
  },
  async isInstalled(pkgSlug) {
    return existsSync(join(process.cwd(), ".forge", "packages", pkgSlug));
  },
};

export const allAdapters: Adapter[] = [claudeAdapter, codexAdapter, opencodeAdapter, cursorAdapter, genericAdapter];

export function detectAdapters(): Adapter[] {
  // Return adapters that are detected, plus generic always last.
  // If none detected besides generic, still return generic.
  const detected = allAdapters.filter((a) => a.name === "generic" ? false : a.detect());
  if (detected.length === 0) return [genericAdapter];
  // Always include generic as fallback? For now return detected + generic
  return [...detected, genericAdapter];
}
