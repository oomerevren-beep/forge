// cli/src/core/merge.ts — Non-destructive 3-way merge engine (Phase 2).
//
// Forge-managed sections inside user-owned text files (CLAUDE.md, AGENTS.md,
// .windsurfrules, .cursor/rules/*.mdc) are delimited by markers:
//
//   <!-- FORGE:START id="<slug>" version="<version>" -->
//   ...skill instructions...
//   <!-- FORGE:END id="<slug>" -->
//
// Rules:
// - User content outside markers is NEVER touched (byte-preserved).
// - Re-install / version bump replaces only the marked block (idempotent).
// - Uninstall removes only the marked block; if the file is blank afterwards
//   AND forge created it, the file is deleted (no litter).
// - Missing file is created with just the block.
// - Marker ids are restricted to [a-z0-9-/_.@] to block marker injection.

import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { dirname } from "path";

const ID_RE = /^[a-z0-9\-/_.@]+$/i;

export function forgeStartMarker(id: string, version: string): string {
  assertSafeId(id);
  return `<!-- FORGE:START id="${id}" version="${version}" -->`;
}

export function forgeEndMarker(id: string): string {
  assertSafeId(id);
  return `<!-- FORGE:END id="${id}" -->`;
}

function assertSafeId(id: string): void {
  if (!ID_RE.test(id) || id.includes("-->") || id.includes("\n")) {
    throw new Error(`[forge] invalid forge block id "${id}" — marker injection refused`);
  }
}

function blockPattern(id: string): RegExp {
  assertSafeId(id);
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Matches a full block including a single trailing newline when present.
  return new RegExp(`<!-- FORGE:START id="${esc}" version="[^"]*" -->\\r?\\n[\\s\\S]*?<!-- FORGE:END id="${esc}" -->\\r?\\n?`);
}

function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Read a forge-managed block body for an id, or null when absent. */
export function readForgeBlock(filePath: string, id: string): string | null {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  const m = raw.match(blockPattern(id));
  if (!m) return null;
  const lines = m[0].split("\n");
  // strip first (START) and last (END, possibly with trailing "") lines
  return lines.slice(1, lines[lines.length - 1] === "" ? -2 : -1).join("\n");
}

/**
 * Insert or replace the forge block for `id`. Returns "created" | "updated" |
 * "unchanged" (byte-identical block already present — no write performed).
 */
export function upsertForgeBlock(
  filePath: string,
  id: string,
  version: string,
  body: string,
): "created" | "updated" | "unchanged" {
  assertSafeId(id);
  const cleanBody = body.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n";
  const block = `${forgeStartMarker(id, version)}\n${cleanBody}${forgeEndMarker(id)}\n`;
  if (!existsSync(filePath)) {
    ensureParentDir(filePath);
    writeFileSync(filePath, block);
    return "created";
  }
  const raw = readFileSync(filePath, "utf-8");
  const pattern = blockPattern(id);
  if (pattern.test(raw)) {
    const next = raw.replace(pattern, block);
    if (next === raw) return "unchanged";
    writeFileSync(filePath, next);
    return "updated";
  }
  const sep = raw.length > 0 && !raw.endsWith("\n") ? "\n" : "";
  const gap = raw.length > 0 && !raw.endsWith("\n\n") ? "\n" : "";
  writeFileSync(filePath, `${raw}${sep}${gap}${block}`);
  return "updated";
}

/**
 * Remove the forge block for `id`. Returns true when a block was removed.
 * When the file holds nothing but whitespace afterwards AND `deleteIfEmpty`
 * is set (forge-created files), the file itself is deleted.
 */
export function removeForgeBlock(
  filePath: string,
  id: string,
  opts: { deleteIfEmpty?: boolean } = {},
): boolean {
  if (!existsSync(filePath)) return false;
  const raw = readFileSync(filePath, "utf-8");
  const pattern = blockPattern(id);
  if (!pattern.test(raw)) return false;
  const next = raw.replace(pattern, "").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n");
  if (next.trim().length === 0 && opts.deleteIfEmpty !== false) {
    rmSync(filePath, { force: true });
    return true;
  }
  writeFileSync(filePath, next);
  return true;
}

/** True when the file contains a forge block for `id`. */
export function hasForgeBlock(filePath: string, id: string): boolean {
  if (!existsSync(filePath)) return false;
  return blockPattern(id).test(readFileSync(filePath, "utf-8"));
}
