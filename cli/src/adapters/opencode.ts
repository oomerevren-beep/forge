// cli/src/adapters/opencode.ts — OpenCode harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames, targetDirFor } from "./types.js";

export const opencodeAdapter: Adapter = {
  name: "opencode",
  displayName: "OpenCode",
  version: "0.1.0",
  detect: () => existsSync(join(process.cwd(), "opencode.json")) || existsSync(join(homedir(), ".config", "opencode", "opencode.json")),
  skillDir: (slug) => join(process.cwd(), ".opencode", "skills", slug),
  mcpConfigPath: () => {
    const proj = join(process.cwd(), "opencode.json");
    if (existsSync(proj)) return proj;
    return join(homedir(), ".config", "opencode", "opencode.json");
  },
  async install(pkgSlug, srcDir, type) {
    void type;
    const isProject = existsSync(join(process.cwd(), "opencode.json"));
    const base = isProject ? join(process.cwd(), ".opencode", "skills") : join(homedir(), ".config", "opencode", "skills");
    installSkillFiles("opencode", pkgSlug, srcDir, base);
  },
  async uninstall(pkgSlug, _type) {
    const isProject = existsSync(join(process.cwd(), "opencode.json"));
    const base = isProject ? join(process.cwd(), ".opencode", "skills") : join(homedir(), ".config", "opencode", "skills");
    uninstallSkillFiles(pkgSlug, base);
  },
  async list() {
    const bases = [join(process.cwd(), ".opencode", "skills"), join(homedir(), ".config", "opencode", "skills")];
    for (const b of bases) {
      if (existsSync(b)) return listDirNames(b);
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".opencode", "skills"), join(homedir(), ".config", "opencode", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};
