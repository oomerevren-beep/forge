// cli/src/adapters/claude.ts — Claude Code harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, removeLinkOrDir, listDirNames } from "./types.js";

export const claudeAdapter: Adapter = {
  name: "claude-code",
  displayName: "Claude Code",
  detect: () => existsSync(join(homedir(), ".claude")),
  skillDir: (slug) => join(homedir(), ".claude", "skills", slug),
  mcpConfigPath: () => join(homedir(), ".claude", "settings.json"),
  async install(pkgSlug, srcDir, type) {
    // Faz 11: 6 tipin tamamı kurulur (skill/mcp/agent/command/hook/plugin)
    void type;
    const base = join(homedir(), ".claude", "skills");
    installSkillFiles("claude-code", pkgSlug, srcDir, base);
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
