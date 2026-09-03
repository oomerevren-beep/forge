// cli/src/adapters/windsurf.ts — Windsurf harness (Faz 12 yeni)
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames, targetDirFor } from "./types.js";

export const windsurfAdapter: Adapter = {
  name: "windsurf",
  displayName: "Windsurf",
  detect: () => existsSync(join(process.cwd(), ".windsurf")) || existsSync(join(homedir(), ".windsurf")) || existsSync(join(homedir(), ".codeium", "windsurf")),
  skillDir: (slug) => {
    if (existsSync(join(process.cwd(), ".windsurf"))) return join(process.cwd(), ".windsurf", "skills", slug);
    return join(homedir(), ".windsurf", "skills", slug);
  },
  mcpConfigPath: () => {
    if (existsSync(join(process.cwd(), ".windsurf"))) return join(process.cwd(), ".windsurf", "mcp_config.json");
    return join(homedir(), ".codeium", "windsurf", "mcp_config.json");
  },
  async install(pkgSlug, srcDir, type) {
    void type;
    const base = existsSync(join(process.cwd(), ".windsurf")) ? join(process.cwd(), ".windsurf", "skills") : join(homedir(), ".windsurf", "skills");
    installSkillFiles("windsurf", pkgSlug, srcDir, base);
  },
  async uninstall(pkgSlug, _type) {
    const bases = [join(process.cwd(), ".windsurf", "skills"), join(homedir(), ".windsurf", "skills")];
    for (const b of bases) uninstallSkillFiles(pkgSlug, b);
  },
  async list() {
    const bases = [join(process.cwd(), ".windsurf", "skills"), join(homedir(), ".windsurf", "skills")];
    for (const b of bases) {
      if (existsSync(b)) return listDirNames(b);
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".windsurf", "skills"), join(homedir(), ".windsurf", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};
