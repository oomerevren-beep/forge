// cli/src/core/fsutil.ts — Filesystem helpers (Phase 3).
//
// copyDirRecursive: Node's fs.cpSync(recursive) silently produces EMPTY dirs
// when the destination is under a non-ASCII path on Windows (observed on
// Node 24 + C:\Users\ömer\... — no error, exit 0, zero files copied).
// Single-file ops (copyFileSync/writeFileSync/mkdirSync) are unaffected, so
// this helper walks the tree and copies file-by-file. Always prefer it over
// raw fs.cpSync for store staging and install fallbacks.

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync, rmSync } from "fs";
import { join } from "path";

/** Recursive directory copy that works under non-ASCII Windows paths. */
export function copyDirRecursive(src: string, dest: string): void {
  const st = statSync(src);
  if (!st.isDirectory()) throw new Error(`[forge] copyDirRecursive: not a directory: ${src}`);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const from = join(src, e.name);
    const to = join(dest, e.name);
    if (e.isDirectory()) {
      copyDirRecursive(from, to);
    } else if (e.isFile() || e.isSymbolicLink()) {
      try {
        copyFileSync(from, to);
      } catch (err) {
        // Dangling symlink or unreadable file: record nothing, but do not
        // silently ship a partial tree — fail closed.
        throw new Error(`[forge] copy failed ${from} → ${to}: ${(err as Error).message}`, { cause: err });
      }
    }
  }
}
