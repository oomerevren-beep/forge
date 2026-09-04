// cli/src/adapters/codex.ts — Codex harness (shared file-adapter base)
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

function paths(): ScopePaths {
  const base = join(testHome(), ".codex", "skills");
  return { skillBases: () => [base], installBase: () => base };
}

export const codexAdapter: Adapter = {
  name: "codex",
  displayName: "Codex",
  version: "0.2.0",
  detect: () => existsSync(join(testHome(), ".codex")),
  skillDir: (slug) => join(paths().installBase(), slug),
  mcpConfigPath: () => join(testHome(), ".codex", "mcp.json"),
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
