// cli/src/adapters/generic.ts — Generic fallback (./.forge/packages)
import { join } from "path";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames } from "./types.js";
import { existsSync } from "fs";

export const genericAdapter: Adapter = {
  name: "generic",
  displayName: "Generic (.forge)",
  detect: () => true, // always as fallback
  skillDir: (slug) => join(process.cwd(), ".forge", "packages", slug),
  mcpConfigPath: () => join(process.cwd(), ".forge", "mcp.json"),
  async install(pkgSlug, srcDir, _type) {
    installSkillFiles("generic", pkgSlug, srcDir, join(process.cwd(), ".forge", "packages"));
  },
  async uninstall(pkgSlug, _type) {
    uninstallSkillFiles(pkgSlug, join(process.cwd(), ".forge", "packages"));
  },
  async list() {
    return listDirNames(join(process.cwd(), ".forge", "packages"));
  },
  async isInstalled(pkgSlug) {
    return existsSync(join(process.cwd(), ".forge", "packages", pkgSlug));
  },
};
