// cli/src/adapters/base.ts — Shared adapter foundation (Phase 2).
//
// Eliminates the copy-pasted project-or-home resolution, list/isInstalled
// loops, and rule-file sync shared by all file-based harness adapters.
// Adapters keep their own path quirks; everything mechanical lives here.
//
// Test hook: set FORGE_TEST_HOME to redirect home-dir resolution into a
// temp dir so adapter tests never touch the real ~/.cursor, ~/.claude, ...

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import {
  installSkillFiles,
  uninstallSkillFiles,
  listDirNames,
  ensureDir,
  backupFileIfExists,
} from "./types.js";
import { upsertForgeBlock, removeForgeBlock } from "../core/merge.js";

export function testHome(): string {
  return process.env.FORGE_TEST_HOME ?? homedir();
}

/** Package metadata for rule-file sync — single definition lives in types.ts. */
export type { PackageMeta } from "./types.js";

/** Build the instruction body for rule files: SKILL.md/agent.md excerpt, capped. */
export function instructionBody(srcDir: string, fallback: string): string {
  for (const f of ["SKILL.md", "agent.md"]) {
    try {
      const p = join(srcDir, f);
      if (existsSync(p)) {
        const text = readFileSync(p, "utf-8").trim().slice(0, 2000);
        if (text.length > 0) return `${text}\n`;
      }
    } catch {
      /* unreadable source — use the fallback line */
    }
  }
  return `${fallback}\n`;
}

/** Short pointer body for merged files (CLAUDE.md, AGENTS.md, .windsurfrules). */
export function pointerBody(pkg: {
  slug: string;
  version: string;
  description: string;
  skillPath: string;
}): string {
  const at = pkg.version ? `@${pkg.version}` : "";
  return `- ${pkg.slug}${at}: ${pkg.description}\n  Full instructions: ${pkg.skillPath}\n`;
}

export interface ScopePaths {
  /** Bases to try in order, e.g. [projectSkills, homeSkills]. */
  skillBases: () => string[];
  /** Base used for fresh installs (first entry that should receive the package). */
  installBase: () => string;
}

export async function sharedList(paths: ScopePaths): Promise<string[]> {
  for (const b of paths.skillBases()) {
    if (existsSync(b)) return listDirNames(b);
  }
  return [];
}

export async function sharedIsInstalled(paths: ScopePaths, pkgSlug: string): Promise<boolean> {
  return paths.skillBases().some((b) => existsSync(join(b, pkgSlug)));
}

export function sharedUninstall(paths: ScopePaths, pkgSlug: string): void {
  for (const b of paths.skillBases()) uninstallSkillFiles(pkgSlug, b);
}

export function sharedInstall(paths: ScopePaths, pkgSlug: string, srcDir: string): void {
  installSkillFiles("forge", pkgSlug, srcDir, paths.installBase());
}

const PROJECT_MARKERS = [
   "forge.toml",
   "package.json",
   ".git",
   "AGENTS.md",
   "CLAUDE.md",
   ".cursor",
   "opencode.json",
   ".codex",
   ".windsurf",
   ".dsh",
 ];

 /** True when dir looks like a project (or already holds the rule file). */
 export function isProjectDir(dir: string): boolean {
   return PROJECT_MARKERS.some((m) => existsSync(join(dir, m)));
 }

 /** Merge-gate for cwd-root rule files: sync when the file exists or dir is a project. */
 export function shouldSyncRules(dir: string, filePath: string): boolean {
   return existsSync(filePath) || isProjectDir(dir);
 }

 /** Write a fully forge-managed per-package file (e.g. .cursor/rules/<slug>.mdc).
 * An existing file WITHOUT a forge marker is backed up (.bak) first so user
 * content is never silently lost; files already carrying our marker for the
 * same id are overwritten in place.
 */
export function writeManagedFile(filePath: string, id: string, content: string): void {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf-8");
    if (!raw.includes(`id="${id}"`)) backupFileIfExists(filePath);
  }
  writeFileSync(filePath, content);
}

/** Merge a forge block into a user-owned file (never touches outside content). */
export function syncBlockFile(filePath: string, id: string, version: string, body: string): void {
  ensureDir(dirname(filePath));
  upsertForgeBlock(filePath, id, version, body);
}

/** Remove only our block; delete the file when forge created it and it is now blank. */
export function unsyncBlockFile(filePath: string, id: string): void {
  removeForgeBlock(filePath, id, { deleteIfEmpty: true });
}

export { upsertForgeBlock, removeForgeBlock };
