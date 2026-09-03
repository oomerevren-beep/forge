// cli/src/adapters/types.ts — Faz 12: paylaşılan Adapter tipi + helpers
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, copyFileSync, symlinkSync, lstatSync, unlinkSync } from "fs";
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
  backupFileIfExists(configPath);
  writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n");
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
