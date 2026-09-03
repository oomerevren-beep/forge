// cli/src/adapters/codex.ts — Codex harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames, targetDirFor } from "./types.js";

export const codexAdapter: Adapter = {
  name: "codex",
  displayName: "Codex",
  version: "0.1.0",
  detect: () => existsSync(join(homedir(), ".codex")),
  skillDir: (slug) => join(homedir(), ".codex", "skills", slug),
  mcpConfigPath: () => join(homedir(), ".codex", "mcp.json"),
  async install(pkgSlug, srcDir, type) {
    void type;
    installSkillFiles("codex", pkgSlug, srcDir, join(homedir(), ".codex", "skills"));
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
