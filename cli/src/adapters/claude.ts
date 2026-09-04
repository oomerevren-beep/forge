// cli/src/adapters/claude.ts — Claude Code harness (2026 format)
//
// Skills/agents: type-aware dirs under ~/.claude/ (skills/, agents/, ...).
// Rules (declarative): merged forge blocks in <project>/CLAUDE.md — user
// content outside markers is never touched (see core/merge.ts).
// MCP: user-scope ~/.claude.json (mcpServers key — behavior config in
// settings.json is left alone).
import { existsSync } from "fs";
import { join } from "path";
import { type Adapter, type PackageMeta, removeLinkOrDir, targetDirFor, uninstallSkillFiles, installSkillFiles } from "./types.js";
import {
  testHome,
  pointerBody,
  sharedList,
  sharedIsInstalled,
  syncBlockFile,
  unsyncBlockFile,
  shouldSyncRules,
  type ScopePaths,
} from "./base.js";

function skillPaths(): ScopePaths {
  const base = join(testHome(), ".claude");
  return {
    skillBases: () => [join(base, "skills")],
    installBase: () => join(base, "skills"),
  };
}

function claudeMdPath(projectDir: string): string {
  return join(projectDir, "CLAUDE.md");
}

function syncClaudeMd(projectDir: string, pkgSlug: string, meta?: PackageMeta): void {
  const file = claudeMdPath(projectDir);
  if (!shouldSyncRules(projectDir, file)) return;
  syncBlockFile(
    file,
    pkgSlug,
    meta?.version ?? "0.0.0",
    pointerBody({
      slug: pkgSlug,
      version: meta?.version ?? "",
      description: meta?.description ?? `${pkgSlug} (installed via Forge)`,
      skillPath: join(testHome(), ".claude", "skills", pkgSlug),
    }),
  );
}

export const claudeAdapter: Adapter = {
  name: "claude-code",
  displayName: "Claude Code",
  version: "0.2.0",
  detect: () => existsSync(join(testHome(), ".claude")),
  skillDir: (slug) => join(testHome(), ".claude", "skills", slug),
  // Epoch 1c: Claude user-scope MCP = ~/.claude.json (not settings.json which is behavior config)
  mcpConfigPath: () => join(testHome(), ".claude.json"),
  async install(pkgSlug, srcDir, type, meta) {
    // Epoch 1d: type-aware install — each type goes to its own directory
    const base = join(testHome(), ".claude");
    installSkillFiles("claude-code", pkgSlug, srcDir, targetDirFor(base, type));
    syncClaudeMd(process.cwd(), pkgSlug, meta);
  },
  async uninstall(pkgSlug, type) {
    void type;
    uninstallSkillFiles(pkgSlug, join(testHome(), ".claude", "skills"));
    const agentPath = join(testHome(), ".claude", "agents", pkgSlug);
    removeLinkOrDir(agentPath);
    unsyncBlockFile(claudeMdPath(process.cwd()), pkgSlug);
  },
  async list() {
    return sharedList(skillPaths());
  },
  async isInstalled(pkgSlug) {
    return sharedIsInstalled(skillPaths(), pkgSlug);
  },
};
