// cli/src/adapters/claude.ts — Claude Code harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, removeLinkOrDir, listDirNames, targetDirFor } from "./types.js";

export const claudeAdapter: Adapter = {
  name: "claude-code",
  displayName: "Claude Code",
  version: "0.1.0",
  detect: () => existsSync(join(homedir(), ".claude")),
  skillDir: (slug) => join(homedir(), ".claude", "skills", slug),
  // Epoch 1c: Claude user-scope MCP = ~/.claude.json (not settings.json which is behavior config)
  mcpConfigPath: () => join(homedir(), ".claude.json"),
  async install(pkgSlug, srcDir, type) {
    // Epoch 1d: type-aware install — each type goes to its own directory
    const base = join(homedir(), ".claude");
    installSkillFiles("claude-code", pkgSlug, srcDir, targetDirFor(base, type));
  },
  async uninstall(pkgSlug, type) {
    void type;
    uninstallSkillFiles(pkgSlug, join(homedir(), ".claude", "skills"));
    const agentPath = join(homedir(), ".claude", "agents", pkgSlug);
    removeLinkOrDir(agentPath);
  },
  async list() {
    return listDirNames(join(homedir(), ".claude", "skills"));
  },
  async isInstalled(pkgSlug) {
    return existsSync(join(homedir(), ".claude", "skills", pkgSlug));
  },
};
