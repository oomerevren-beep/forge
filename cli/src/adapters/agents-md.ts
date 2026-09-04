// cli/src/adapters/agents-md.ts — Shared AGENTS.md rule sync (Phase 2).
//
// OpenCode, Codex, and DSH all honor the AGENTS.md project convention:
// standard system-prompt rules in one shared file. Forge merges one marked
// block per package and never touches surrounding user content.
import { join } from "path";
import type { PackageMeta } from "./types.js";
import {
  pointerBody,
  syncBlockFile,
  unsyncBlockFile,
  shouldSyncRules,
} from "./base.js";

export function agentsMdPath(projectDir: string): string {
  return join(projectDir, "AGENTS.md");
}

export function syncAgentsMd(
  projectDir: string,
  pkgSlug: string,
  skillPath: string,
  meta?: PackageMeta,
): void {
  const file = agentsMdPath(projectDir);
  if (!shouldSyncRules(projectDir, file)) return;
  syncBlockFile(
    file,
    pkgSlug,
    meta?.version ?? "0.0.0",
    pointerBody({
      slug: pkgSlug,
      version: meta?.version ?? "",
      description: meta?.description ?? `${pkgSlug} (installed via Forge)`,
      skillPath,
    }),
  );
}

export function unsyncAgentsMd(projectDir: string, pkgSlug: string): void {
  unsyncBlockFile(agentsMdPath(projectDir), pkgSlug);
}
