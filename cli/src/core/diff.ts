// cli/src/core/diff.ts — Unified diff engine with ANSI colorization.
//
// Computes line-by-line unified diffs with configurable context
// and formats them with picocolors for terminal display.

import pc from "picocolors";

export interface DiffOptions {
  contextLines?: number;
  oldHeader?: string;
  newHeader?: string;
}

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

/**
 * Compute unified diff between two text strings using LCS (Longest Common Subsequence).
 * Returns empty string if contents are identical.
 */
export function createUnifiedDiff(
  oldPath: string,
  newPath: string,
  oldText: string,
  newText: string,
  options: DiffOptions = {},
): string {
  const normOld = oldText.replace(/\r\n/g, "\n");
  const normNew = newText.replace(/\r\n/g, "\n");

  if (normOld === normNew) {
    return "";
  }

  const oldLines = normOld.length > 0 ? normOld.split("\n") : [];
  const newLines = normNew.length > 0 ? normNew.split("\n") : [];

  const context = options.contextLines ?? 3;
  const hunks = computeHunks(oldLines, newLines, context);

  if (hunks.length === 0) {
    return "";
  }

  const oldHeader = options.oldHeader ?? `a/${oldPath}`;
  const newHeader = options.newHeader ?? `b/${newPath}`;

  const out: string[] = [
    `--- ${oldHeader}`,
    `+++ ${newHeader}`,
  ];

  for (const h of hunks) {
    out.push(`@@ -${h.oldStart},${h.oldCount} +${h.newStart},${h.newCount} @@`);
    out.push(...h.lines);
  }

  return out.join("\n") + "\n";
}

/**
 * Colorize a unified diff string for terminal output using picocolors.
 */
export function colorizeDiff(diff: string): string {
  if (!diff) return "";
  const lines = diff.split("\n");
  const colored: string[] = [];

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) {
      colored.push(pc.bold(pc.cyan(line)));
    } else if (line.startsWith("@@")) {
      colored.push(pc.cyan(line));
    } else if (line.startsWith("+")) {
      colored.push(pc.green(line));
    } else if (line.startsWith("-")) {
      colored.push(pc.red(line));
    } else {
      colored.push(pc.dim(line));
    }
  }

  return colored.join("\n");
}

type EditOp = { type: "keep" | "add" | "delete"; line: string };

function computeHunks(oldLines: string[], newLines: string[], context: number): DiffHunk[] {
  const edits = computeEdits(oldLines, newLines);

  // Group edits into hunks separated by context lines
  const hunks: DiffHunk[] = [];
  let i = 0;

  while (i < edits.length) {
    // Find next change (add or delete)
    while (i < edits.length && edits[i].type === "keep") {
      i++;
    }
    if (i >= edits.length) break;

    // Determine hunk boundaries with context
    const changeStart = i;
    const hunkStart = Math.max(0, changeStart - context);

    // Scan until we have at least 2*context keep lines or reach end
    let changeEnd = i;
    while (i < edits.length) {
      if (edits[i].type !== "keep") {
        changeEnd = i;
      } else if (i - changeEnd >= 2 * context) {
        break;
      }
      i++;
    }

    const hunkEnd = Math.min(edits.length, changeEnd + context + 1);

    // Count line numbers for the hunk
    let oldStart = 1;
    let newStart = 1;
    for (let k = 0; k < hunkStart; k++) {
      if (edits[k].type === "keep" || edits[k].type === "delete") oldStart++;
      if (edits[k].type === "keep" || edits[k].type === "add") newStart++;
    }

    let oldCount = 0;
    let newCount = 0;
    const lines: string[] = [];

    for (let k = hunkStart; k < hunkEnd; k++) {
      const op = edits[k];
      if (op.type === "keep") {
        lines.push(` ${op.line}`);
        oldCount++;
        newCount++;
      } else if (op.type === "delete") {
        lines.push(`-${op.line}`);
        oldCount++;
      } else if (op.type === "add") {
        lines.push(`+${op.line}`);
        newCount++;
      }
    }

    hunks.push({
      oldStart: oldCount === 0 ? 0 : oldStart,
      oldCount,
      newStart: newCount === 0 ? 0 : newStart,
      newCount,
      lines,
    });
  }

  return hunks;
}

function computeEdits(a: string[], b: string[]): EditOp[] {
  // Fast paths for additions/deletions on empty inputs
  if (a.length === 0) {
    return b.map((line) => ({ type: "add" as const, line }));
  }
  if (b.length === 0) {
    return a.map((line) => ({ type: "delete" as const, line }));
  }

  // Safety cap to avoid excessive allocations on enormous files
  const MAX_LINES = 2500;
  const aSlice = a.length > MAX_LINES ? a.slice(0, MAX_LINES) : a;
  const bSlice = b.length > MAX_LINES ? b.slice(0, MAX_LINES) : b;

  const m = aSlice.length;
  const n = bSlice.length;

  // Build LCS table (capped to prevent huge memory usage on very large files)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (aSlice[i] === bSlice[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to assemble edit operations
  const edits: EditOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aSlice[i - 1] === bSlice[j - 1]) {
      edits.push({ type: "keep", line: aSlice[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.push({ type: "add", line: bSlice[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      edits.push({ type: "delete", line: aSlice[i - 1] });
      i--;
    }
  }

  edits.reverse();
  return edits;
}
