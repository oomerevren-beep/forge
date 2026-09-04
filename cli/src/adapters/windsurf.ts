// cli/src/adapters/windsurf.ts — Windsurf harness (2026 format)
//
// Skills: <scope>/skills/<slug>/ (kept for back-compat).
// Rules (Cascade AI): merged forge blocks in <project>/.windsurfrules —
// user content outside markers is never touched (see core/merge.ts).
// MCP: synced to <project>/.windsurf/mcp_config.json, else the global
// ~/.codeium/windsurf/mcp_config.json (via mcpConfigPath).
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { type Adapter, type PackageMeta } from "./types.js";
import {
  testHome,
  pointerBody,
  sharedList,
  sharedIsInstalled,
  sharedUninstall,
  sharedInstall,
  syncBlockFile,
  unsyncBlockFile,
  shouldSyncRules,
  type ScopePaths,
} from "./base.js";

function inProject(): boolean {
  return existsSync(join(process.cwd(), ".windsurf"));
}

function paths(): ScopePaths {
  return {
    skillBases: () => [join(process.cwd(), ".windsurf", "skills"), join(testHome(), ".windsurf", "skills")],
    installBase: () =>
      inProject() ? join(process.cwd(), ".windsurf", "skills") : join(testHome(), ".windsurf", "skills"),
  };
}

function rulesPath(): string {
  return join(process.cwd(), ".windsurfrules");
}

function syncRules(projectDir: string, pkgSlug: string, meta?: PackageMeta): void {
  const file = join(projectDir, ".windsurfrules");
  if (!shouldSyncRules(projectDir, file)) return;
  syncBlockFile(
    file,
    pkgSlug,
    meta?.version ?? "0.0.0",
    pointerBody({
      slug: pkgSlug,
      version: meta?.version ?? "",
      description: meta?.description ?? `${pkgSlug} (installed via Forge)`,
      skillPath: join(paths().installBase(), pkgSlug),
    }),
  );
}

export const windsurfAdapter: Adapter = {
  name: "windsurf",
  displayName: "Windsurf",
  version: "0.2.0",
  detect: () =>
    existsSync(join(process.cwd(), ".windsurf")) ||
    existsSync(join(testHome(), ".windsurf")) ||
    existsSync(join(testHome(), ".codeium", "windsurf")),
  skillDir: (slug) => join(paths().installBase(), slug),
  mcpConfigPath: () => {
    if (inProject()) return join(process.cwd(), ".windsurf", "mcp_config.json");
    return join(testHome(), ".codeium", "windsurf", "mcp_config.json");
  },
  async install(pkgSlug, srcDir, _type, meta) {
    sharedInstall(paths(), pkgSlug, srcDir);
    syncRules(process.cwd(), pkgSlug, meta);
  },
  async uninstall(pkgSlug, _type) {
    sharedUninstall(paths(), pkgSlug);
    unsyncBlockFile(rulesPath(), pkgSlug);
    // Per-package Cascade rule files, if a previous version created them.
    rmSync(join(process.cwd(), ".windsurf", "rules", `${pkgSlug}.md`), { force: true });
  },
  async list() {
    return sharedList(paths());
  },
  async isInstalled(pkgSlug) {
    return sharedIsInstalled(paths(), pkgSlug);
  },
};
