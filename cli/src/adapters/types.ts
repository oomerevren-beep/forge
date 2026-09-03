// cli/src/adapters/types.ts — Epoch 1c: fail-closed MCP config, Windows junction, skill files
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, copyFileSync, symlinkSync, lstatSync, unlinkSync, renameSync } from "fs";
import { join, dirname } from "path";

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

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function trySymlinkOrCopy(src: string, dest: string): void {
  ensureDir(dirname(dest));
  if (existsSync(dest)) {
    try {
      const stat = lstatSync(dest);
      if (stat.isSymbolicLink()) unlinkSync(dest);
      else rmSync(dest, { recursive: true, force: true });
    } catch {
      rmSync(dest, { recursive: true, force: true });
    }
  }
  try {
    const isWin = process.platform === "win32";
    symlinkSync(src, dest, isWin ? "junction" : "dir");
    return;
  } catch {
    cpSync(src, dest, { recursive: true });
  }
}

export function removeLinkOrDir(target: string): void {
  if (!existsSync(target)) return;
  try {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) unlinkSync(target);
    else rmSync(target, { recursive: true, force: true });
  } catch {
    rmSync(target, { recursive: true, force: true });
  }
}

/**
 * Read MCP config — FAIL-CLOSED.
 * Returns null if file doesn't exist.
 * Returns parsed JSON if file is valid JSON.
 * THROWS on parse error (invalid JSON/JSONC) — caller must NOT silently overwrite.
 * This protects user configs with comments (JSONC) or trailing commas from being destroyed.
 */
export function readMcpConfig(configPath: string): Record<string, unknown> | null {
  if (!existsSync(configPath)) return null;
  const raw = readFileSync(configPath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `[forge] MCP config at ${configPath} contains invalid JSON: ${(e as Error).message}\n` +
      `[forge] Refusing to modify. Fix the config manually or rename it, then retry.`
    );
  }
}

export function writeMcpConfig(configPath: string, data: Record<string, unknown>, opts: { expectedMtimeMs?: number } = {}): void {
  ensureDir(dirname(configPath));
  backupFileIfExists(configPath);
  // Epoch 1d: Atomic write — temp dosyaya yaz, sonra rename (crash-safe)
  const tmp = configPath + ".tmp." + Date.now();
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, configPath);
}

/** Snapshot a user-owned config before we overwrite it (single `.bak`, like `sed -i.bak`).
 *  Returns the backup path, or null when there was nothing to back up. */
export function backupFileIfExists(configPath: string): string | null {
  if (!existsSync(configPath)) return null;
  const bak = configPath + ".bak";
  try {
    copyFileSync(configPath, bak);
    console.log(`[forge] backup: ${configPath} → ${bak}`);
    return bak;
  } catch (e) {
    console.warn(`[forge] warning: could not back up ${configPath}: ${(e as Error).message}`);
    return null;
  }
}

export function addMcpServerToConfig(configPath: string, name: string, mcp: { command: string; args?: string[]; env?: Record<string, string> }): void {
  const cfg = readMcpConfig(configPath);
  if (cfg === null) throw new Error(`[forge] ${configPath} does not exist or is invalid JSON`);
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
  const cfg = readMcpConfig(configPath);
  if (cfg === null) return; // file doesn't exist or invalid — nothing to remove
  const servers = cfg["mcpServers"] as Record<string, unknown> | undefined;
  if (servers && name in servers) {
    delete servers[name];
    writeMcpConfig(configPath, cfg);
  }
}

export function installSkillFiles(_adapterName: string, pkgSlug: string, srcDir: string, destBase: string): void {
  const dest = join(destBase, pkgSlug);
  trySymlinkOrCopy(srcDir, dest);
}

export function uninstallSkillFiles(pkgSlug: string, destBase: string): void {
  const dest = join(destBase, pkgSlug);
  removeLinkOrDir(dest);
}

export async function listDirNames(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const { readdirSync } = await import("fs");
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() || d.isSymbolicLink()).map((d) => d.name);
}
