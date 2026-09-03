// cli/src/adapters/cursor.ts — Cursor harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames } from "./types.js";

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
    void type;
    const base = existsSync(join(process.cwd(), ".cursor")) ? join(process.cwd(), ".cursor", "skills") : join(homedir(), ".cursor", "skills");
    installSkillFiles("cursor", pkgSlug, srcDir, base);
  },
  async uninstall(pkgSlug, _type) {
    const base = existsSync(join(process.cwd(), ".cursor")) ? join(process.cwd(), ".cursor", "skills") : join(homedir(), ".cursor", "skills");
    uninstallSkillFiles(pkgSlug, base);
  },
  async list() {
    const bases = [join(process.cwd(), ".cursor", "skills"), join(homedir(), ".cursor", "skills")];
    for (const b of bases) {
      if (existsSync(b)) return listDirNames(b);
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".cursor", "skills"), join(homedir(), ".cursor", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};
