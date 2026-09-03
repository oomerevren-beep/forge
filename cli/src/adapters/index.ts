// cli/src/adapters/index.ts — Faz 12: 7 harness re-export (per-file split)
// Her harness 1 dosya: claude.ts, codex.ts, opencode.ts, cursor.ts, dsh.ts, windsurf.ts, generic.ts
// Geriye dönük uyumluluk: mevcut import'lar ./adapters/index.js çalışmaya devam eder.

export type { Adapter } from "./types.js";
export {
  readMcpConfig,
  writeMcpConfig,
  addMcpServerToConfig,
  removeMcpServerFromConfig,
  forgeHome,
  packagesDir,
  packageDir,
  toSlug,
} from "./types.js";

export { claudeAdapter } from "./claude.js";
export { codexAdapter } from "./codex.js";
export { opencodeAdapter } from "./opencode.js";
export { cursorAdapter } from "./cursor.js";
export { dshAdapter } from "./dsh.js";
export { windsurfAdapter } from "./windsurf.js";
export { genericAdapter } from "./generic.js";

import type { Adapter } from "./types.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { opencodeAdapter } from "./opencode.js";
import { cursorAdapter } from "./cursor.js";
import { dshAdapter } from "./dsh.js";
import { windsurfAdapter } from "./windsurf.js";
import { genericAdapter } from "./generic.js";

export const allAdapters: Adapter[] = [
  claudeAdapter,
  codexAdapter,
  opencodeAdapter,
  cursorAdapter,
  dshAdapter,
  windsurfAdapter,
  genericAdapter,
];

export function detectAdapters(): Adapter[] {
  const detected = allAdapters.filter((a) => (a.name === "generic" ? false : a.detect()));
  if (detected.length === 0) return [genericAdapter];
  return [...detected, genericAdapter];
}
