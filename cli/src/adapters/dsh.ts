// cli/src/adapters/dsh.ts — DeepSeek harness (shared file-adapter base)
//
// Epoch 1c: DSH adapter is marked deprecated/legacy.
// The DeepSeek harness has no "skills" concept; it uses a cordis.yml + TS plugin model.
// Kept for backwards compatibility, surfaced as "community-maintained, untested".
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
  return existsSync(join(process.cwd(), ".dsh"));
}

function paths(): ScopePaths {
  return {
    skillBases: () => [join(process.cwd(), ".dsh", "skills"), join(testHome(), ".dsh", "skills")],
    installBase: () => (inProject() ? join(process.cwd(), ".dsh", "skills") : join(testHome(), ".dsh", "skills")),
  };
}

export const dshAdapter: Adapter = {
  name: "dsh",
  displayName: "DeepSeek (DSH, community/untested)",
  version: "0.2.0",
  detect: () => existsSync(join(testHome(), ".dsh")) || inProject(),
  skillDir: (slug) => join(paths().installBase(), slug),
  mcpConfigPath: () => {
    if (inProject()) return join(process.cwd(), ".dsh", "mcp.json");
    return join(testHome(), ".dsh", "mcp.json");
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
