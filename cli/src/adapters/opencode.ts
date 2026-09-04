// cli/src/adapters/opencode.ts — OpenCode harness (shared file-adapter base)
import { existsSync } from "fs";
import { join } from "path";
import { type Adapter } from "./types.js";
import {
  testHome,
  sharedList,
  sharedIsInstalled,
  sharedUninstall,
  sharedInstall,
  type ScopePaths,
} from "./base.js";
import { syncAgentsMd, unsyncAgentsMd } from "./agents-md.js";

function inProject(): boolean {
  return existsSync(join(process.cwd(), "opencode.json"));
}

function paths(): ScopePaths {
  return {
    skillBases: () => [join(process.cwd(), ".opencode", "skills"), join(testHome(), ".config", "opencode", "skills")],
    installBase: () =>
      inProject() ? join(process.cwd(), ".opencode", "skills") : join(testHome(), ".config", "opencode", "skills"),
  };
}

export const opencodeAdapter: Adapter = {
  name: "opencode",
  displayName: "OpenCode",
  version: "0.2.0",
  detect: () => inProject() || existsSync(join(testHome(), ".config", "opencode", "opencode.json")),
  skillDir: (slug) => join(paths().installBase(), slug),
  mcpConfigPath: () => {
    const proj = join(process.cwd(), "opencode.json");
    if (existsSync(proj)) return proj;
    return join(testHome(), ".config", "opencode", "opencode.json");
  },
  async install(pkgSlug, srcDir, _type, meta) {
    sharedInstall(paths(), pkgSlug, srcDir);
    syncAgentsMd(process.cwd(), pkgSlug, join(paths().installBase(), pkgSlug), meta);
  },
  async uninstall(pkgSlug, _type) {
    sharedUninstall(paths(), pkgSlug);
    unsyncAgentsMd(process.cwd(), pkgSlug);
  },
  async list() {
    return sharedList(paths());
  },
  async isInstalled(pkgSlug) {
    return sharedIsInstalled(paths(), pkgSlug);
  },
};
