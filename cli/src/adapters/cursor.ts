// cli/src/adapters/cursor.ts — Cursor harness (2026 format)
//
// Skills: <scope>/skills/<slug>/ (legacy dir, kept for back-compat).
// Rules (modern): <scope>/rules/<slug>.mdc with frontmatter
//   (description, globs, alwaysApply) — Cursor reads these natively.
// MCP: injected into <scope>/mcp.json (via mcpConfigPath).
// Scope = project .cursor/ when present, else ~/.cursor/.
import { existsSync, rmSync } from "fs";
import { join } from "path";
import {
  type Adapter,
  type PackageMeta,
} from "./types.js";
import {
  testHome,
  instructionBody,
  sharedList,
  sharedIsInstalled,
  sharedUninstall,
  sharedInstall,
  writeManagedFile,
  type ScopePaths,
} from "./base.js";

function scopeBase(): string {
  const proj = join(process.cwd(), ".cursor");
  if (existsSync(proj)) return proj;
  return join(testHome(), ".cursor");
}

function paths(): ScopePaths {
  const base = scopeBase();
  return {
    skillBases: () => [join(process.cwd(), ".cursor", "skills"), join(testHome(), ".cursor", "skills")],
    installBase: () => join(base, "skills"),
  };
}

function ruleFile(scope: string, pkgSlug: string): string {
  return join(scope, "rules", `${pkgSlug}.mdc`);
}

function ruleContent(pkgSlug: string, srcDir: string, meta?: PackageMeta): string {
  const description = meta?.description ?? `${pkgSlug} (installed via Forge)`;
  const version = meta?.version ?? "0.0.0";
  const body = instructionBody(srcDir, `${pkgSlug}@${version} — ${description}`);
  return `---\ndescription: ${description}\nglobs:\nalwaysApply: false\n---\n<!-- FORGE:START id="${pkgSlug}" version="${version}" -->\n${body}<!-- FORGE:END id="${pkgSlug}" -->\n`;
}

export const cursorAdapter: Adapter = {
  name: "cursor",
  displayName: "Cursor",
  version: "0.2.0",
  detect: () => existsSync(join(process.cwd(), ".cursor")) || existsSync(join(testHome(), ".cursor")),
  skillDir: (slug) => join(paths().installBase(), slug),
  mcpConfigPath: () => join(scopeBase(), "mcp.json"),
  async install(pkgSlug, srcDir, _type, meta) {
    sharedInstall(paths(), pkgSlug, srcDir);
    // Modern multi-rule format alongside the legacy skills dir.
    writeManagedFile(ruleFile(scopeBase(), pkgSlug), pkgSlug, ruleContent(pkgSlug, srcDir, meta));
  },
  async uninstall(pkgSlug, _type) {
    sharedUninstall(paths(), pkgSlug);
    rmSync(ruleFile(join(process.cwd(), ".cursor"), pkgSlug), { force: true });
    rmSync(ruleFile(join(testHome(), ".cursor"), pkgSlug), { force: true });
  },
  async list() {
    return sharedList(paths());
  },
  async isInstalled(pkgSlug) {
    return sharedIsInstalled(paths(), pkgSlug);
  },
};
