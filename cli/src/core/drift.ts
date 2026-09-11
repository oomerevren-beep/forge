// cli/src/core/drift.ts — File overwrite protection and drift detection.
//
// Detects when user has manually edited a Forge-managed file or block
// and prevents silent overwriting by issuing warnings and displaying diffs.

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { join, resolve, relative, dirname } from "path";
import { createHash } from "crypto";
import pc from "picocolors";
import { readForgeBlock } from "./merge.js";
import { createUnifiedDiff, colorizeDiff } from "./diff.js";

export interface SyncFileRecord {
  sha256: string;
  blocks?: Record<string, string>;
  updatedAt: string;
}

export interface SyncState {
  version: string;
  files: Record<string, SyncFileRecord>;
}

export interface DriftCheckResult {
  hasDrift: boolean;
  reason?: string;
  diff?: string;
  isUserFile?: boolean;
}

function statePath(cwd = process.cwd()): string {
  return join(resolve(cwd), ".forge", "sync-state.json");
}

export function loadSyncState(cwd = process.cwd()): SyncState {
  const p = statePath(cwd);
  if (!existsSync(p)) {
    return { version: "1.0", files: {} };
  }
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as SyncState;
    return parsed.files ? parsed : { version: "1.0", files: {} };
  } catch {
    return { version: "1.0", files: {} };
  }
}

export function saveSyncState(cwd: string, state: SyncState): void {
  const p = statePath(cwd);
  const dir = dirname(p);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
}

function hashContent(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n").trim()).digest("hex");
}

/**
 * Check if a file or block has drifted (manually modified by user since last sync).
 */
export function checkDrift(
  filePath: string,
  incomingContent: string,
  options: { blockId?: string; cwd?: string } = {},
): DriftCheckResult {
  if (!existsSync(filePath)) {
    return { hasDrift: false };
  }

  const cwd = options.cwd ?? process.cwd();
  const relPath = relative(cwd, resolve(filePath)).replace(/\\/g, "/");
  const state = loadSyncState(cwd);
  const fileRecord = state.files[relPath];

  const currentDiskContent = readFileSync(filePath, "utf-8");

  // Case 1: Merged block inside a file (e.g. CLAUDE.md, AGENTS.md, .windsurfrules)
  if (options.blockId) {
    const currentBlock = readForgeBlock(filePath, options.blockId);
    if (currentBlock === null) {
      // Block does not exist yet; appending is safe
      return { hasDrift: false };
    }

    const currentBlockHash = hashContent(currentBlock);
    const recordedBlockHash = fileRecord?.blocks?.[options.blockId];
    const incomingBlockHash = hashContent(incomingContent);

    if (currentBlockHash === incomingBlockHash) {
      // Identical block content, no drift
      return { hasDrift: false };
    }

    if (recordedBlockHash && currentBlockHash !== recordedBlockHash) {
      // User manually edited inside the managed block!
      const diff = createUnifiedDiff(
        `${relPath} [local edited]`,
        `${relPath} [incoming sync]`,
        currentBlock,
        incomingContent,
      );
      return {
        hasDrift: true,
        reason: `Managed block "${options.blockId}" in ${relPath} was manually modified by user.`,
        diff,
      };
    }

    return { hasDrift: false };
  }

  // Case 2: Fully managed file (e.g. .cursor/rules/<slug>.mdc)
  const currentFileHash = hashContent(currentDiskContent);
  const incomingFileHash = hashContent(incomingContent);

  if (currentFileHash === incomingFileHash) {
    return { hasDrift: false };
  }

  // If the existing file has NO forge markers at all, user authored it!
  const hasMarker = /<!-- FORGE:(?:MANAGED:)?START/i.test(currentDiskContent);
  if (!hasMarker) {
    const diff = createUnifiedDiff(
      `${relPath} [user file]`,
      `${relPath} [forge generated]`,
      currentDiskContent,
      incomingContent,
    );
    return {
      hasDrift: true,
      isUserFile: true,
      reason: `Existing file ${relPath} does not have Forge markers (authored by user).`,
      diff,
    };
  }

  // If we had recorded this file previously and it changed on disk:
  if (fileRecord && fileRecord.sha256 !== currentFileHash) {
    const diff = createUnifiedDiff(
      `${relPath} [user modified]`,
      `${relPath} [incoming sync]`,
      currentDiskContent,
      incomingContent,
    );
    return {
      hasDrift: true,
      reason: `Forge-managed file ${relPath} was manually modified by user since last sync.`,
      diff,
    };
  }

  // If there is no previous sync record but existing file differs from incoming:
  if (!fileRecord && currentFileHash !== incomingFileHash) {
    const diff = createUnifiedDiff(
      `${relPath} [local modified]`,
      `${relPath} [incoming sync]`,
      currentDiskContent,
      incomingContent,
    );
    return {
      hasDrift: true,
      reason: `Forge-managed file ${relPath} differs from incoming sync.`,
      diff,
    };
  }

  return { hasDrift: false };
}

/**
 * Record successful sync of a file/block to state.
 */
export function recordSync(
  filePath: string,
  content: string,
  options: { blockId?: string; cwd?: string } = {},
): void {
  const cwd = options.cwd ?? process.cwd();
  const relPath = relative(cwd, resolve(filePath)).replace(/\\/g, "/");
  const state = loadSyncState(cwd);

  if (!state.files[relPath]) {
    state.files[relPath] = {
      sha256: existsSync(filePath) ? hashContent(readFileSync(filePath, "utf-8")) : hashContent(content),
      blocks: {},
      updatedAt: new Date().toISOString(),
    };
  }

  if (options.blockId) {
    if (!state.files[relPath].blocks) state.files[relPath].blocks = {};
    state.files[relPath].blocks[options.blockId] = hashContent(content);
  } else {
    state.files[relPath].sha256 = hashContent(content);
  }

  state.files[relPath].updatedAt = new Date().toISOString();
  saveSyncState(cwd, state);
}

/**
 * Creates a safety backup before overwriting a drifted file.
 */
export function backupDriftedFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const backupPath = `${filePath}.drift.bak`;
  try {
    copyFileSync(filePath, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}

/**
 * Format a drift warning message with colored diff.
 */
export function formatDriftWarning(relPath: string, result: DriftCheckResult): string {
  const lines: string[] = [
    `${pc.yellow(pc.bold("[forge] ⚠️  Drift detected in"))} ${pc.bold(relPath)}:`,
    `  ${result.reason ?? "File modified manually since last sync."}`,
  ];
  if (result.diff) {
    lines.push("");
    lines.push(colorizeDiff(result.diff));
  }
  lines.push(`  ${pc.cyan("Protection:")} An automatic backup (${pc.yellow(`${relPath}.drift.bak`)}) has been created before applying updates.`);
  return lines.join("\n");
}
