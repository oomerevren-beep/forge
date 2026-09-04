// cli/src/adapters/generic.ts — Generic fallback (./.forge/packages)
import { join } from "path";
import { type Adapter } from "./types.js";
import {
  sharedList,
  sharedIsInstalled,
  sharedUninstall,
  sharedInstall,
  type ScopePaths,
} from "./base.js";

function paths(): ScopePaths {
  const base = join(process.cwd(), ".forge", "packages");
  return { skillBases: () => [base], installBase: () => base };
}

export const genericAdapter: Adapter = {
  name: "generic",
  displayName: "Generic (.forge)",
  detect: () => true, // always as fallback
  skillDir: (slug) => join(process.cwd(), ".forge", "packages", slug),
  mcpConfigPath: () => join(process.cwd(), ".forge", "mcp.json"),
  async install(pkgSlug, srcDir, _type, _meta) {
    sharedInstall(paths(), pkgSlug, srcDir);
  },
  async uninstall(pkgSlug, _type) {
    sharedUninstall(paths(), pkgSlug);
  },
  async list() {
    return sharedList(paths());
  },
  async isInstalled(pkgSlug) {
    return sharedIsInstalled(paths(), pkgSlug);
  },
};
