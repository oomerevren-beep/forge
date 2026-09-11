import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runSync } from "../cli/src/commands/sync.js";
import { createUnifiedDiff, colorizeDiff } from "../cli/src/core/diff.js";
import { checkDrift, recordSync, backupDriftedFile } from "../cli/src/core/drift.js";

describe("forge sync — diff, dry-run & drift protection (FAZ P1)", () => {
  let dir = "";
  let prevCwd = "";
  let prevTestHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "forge-sync-diff-"));
    prevCwd = process.cwd();
    prevTestHome = process.env.FORGE_TEST_HOME;
    process.env.FORGE_TEST_HOME = dir;
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevTestHome === undefined) delete process.env.FORGE_TEST_HOME;
    else process.env.FORGE_TEST_HOME = prevTestHome;
    rmSync(dir, { recursive: true, force: true });
  });

  it("diff engine generates unified diff with hunks and headers", () => {
    const oldText = "line 1\nline 2\nline 3\n";
    const newText = "line 1\nline 2 (modified)\nline 3\nline 4 (added)\n";
    const diff = createUnifiedDiff("file.txt", "file.txt", oldText, newText);

    assert.ok(diff.includes("--- a/file.txt"));
    assert.ok(diff.includes("+++ b/file.txt"));
    assert.ok(diff.includes("-line 2"));
    assert.ok(diff.includes("+line 2 (modified)"));
    assert.ok(diff.includes("+line 4 (added)"));

    const colored = colorizeDiff(diff);
    assert.ok(colored.length > 0);
  });

  it("diff engine returns empty string for identical inputs", () => {
    const text = "constant content\n";
    const diff = createUnifiedDiff("same.txt", "same.txt", text, text);
    assert.equal(diff, "");
  });

  it("sync --dry-run does not write files or lockfile to disk", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]
name = "dry-run-test"
version = "1.0.0"

[agents.reviewer]
model = "claude-3-7-sonnet"
system_prompt = "Code reviewer"

[skills]
"pdf-merge" = { source = "registry", version = "1.0.0" }
`,
    );

    await runSync({ cwd: dir, dryRun: true, mock: true, skipScan: true });

    // AGENTS.md must NOT have been written
    assert.ok(!existsSync(join(dir, "AGENTS.md")), "AGENTS.md should not be written under --dry-run");
    // forge.lock must NOT have been written
    assert.ok(!existsSync(join(dir, "forge.lock")), "forge.lock should not be written under --dry-run");
  });

  it("sync --diff displays preview of changes", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]
name = "diff-test"
version = "1.0.0"

[agents.tester]
model = "gpt-4o"
system_prompt = "Test specialist"
`,
    );

    let logged = "";
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      logged += args.map(String).join(" ") + "\n";
    };

    try {
      await runSync({ cwd: dir, diff: true, mock: true, skipScan: true });
      assert.ok(logged.includes("=== Diff: AGENTS.md"), "Diff header should be printed");
      assert.ok(logged.includes("+"), "Diff additions should be shown");
      assert.ok(existsSync(join(dir, "AGENTS.md")), "AGENTS.md should be written");
    } finally {
      console.log = origLog;
    }
  });

  it("drift protection detects manual edits to managed blocks and files", () => {
    const testFile = join(dir, "managed.md");
    const initialContent = "<!-- FORGE:MANAGED:START id=\"test-pkg\" version=\"1.0.0\" -->\nManaged Line\n<!-- FORGE:MANAGED:END id=\"test-pkg\" -->\n";
    writeFileSync(testFile, initialContent);

    // Record initial sync
    recordSync(testFile, "Managed Line\n", { blockId: "test-pkg", cwd: dir });

    // No drift yet
    let check = checkDrift(testFile, "Managed Line\n", { blockId: "test-pkg", cwd: dir });
    assert.equal(check.hasDrift, false);

    // User edits the managed block
    const editedContent = "<!-- FORGE:MANAGED:START id=\"test-pkg\" version=\"1.0.0\" -->\nUser Edited Line!\n<!-- FORGE:MANAGED:END id=\"test-pkg\" -->\n";
    writeFileSync(testFile, editedContent);

    // Drift must be detected!
    check = checkDrift(testFile, "Incoming Line\n", { blockId: "test-pkg", cwd: dir });
    assert.equal(check.hasDrift, true);
    assert.ok(check.reason?.includes("manually modified"));
    assert.ok(check.diff?.includes("-User Edited Line!"));

    // Backup is created safely
    const bak = backupDriftedFile(testFile);
    assert.ok(bak && existsSync(bak));
    assert.ok(readFileSync(bak, "utf-8").includes("User Edited Line!"));
  });

  it("drift protection warns if non-forge file exists at managed path", () => {
    const rulePath = join(dir, "custom.mdc");
    writeFileSync(rulePath, "Hand-crafted user rule without forge markers");

    const check = checkDrift(rulePath, "Incoming forge content", { cwd: dir });
    assert.equal(check.hasDrift, true);
    assert.equal(check.isUserFile, true);
    assert.ok(check.reason?.includes("authored by user"));
  });

  it("runSync end-to-end detects drift and creates .drift.bak on user modifications", async () => {
    writeFileSync(
      join(dir, "forge.toml"),
      `[project]
name = "e2e-drift-test"
version = "1.0.0"

[agents.lead]
model = "claude-3-7-sonnet"
system_prompt = "Initial team lead instructions"
`,
    );

    // Initial sync creates AGENTS.md and records state
    await runSync({ cwd: dir, mock: true, skipScan: true });
    const agentsFile = join(dir, "AGENTS.md");
    assert.ok(existsSync(agentsFile));

    // User manually modifies the AGENTS.md managed block
    const original = readFileSync(agentsFile, "utf-8");
    const tampered = original.replace("Initial team lead instructions", "HAND-MODIFIED instructions by developer");
    writeFileSync(agentsFile, tampered);

    let warnings = "";
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings += args.map(String).join(" ") + "\n";
    };

    try {
      // Second sync should detect drift, issue warning, and create .drift.bak
      await runSync({ cwd: dir, mock: true, skipScan: true });
      assert.ok(
        warnings.includes("Drift detected in") && warnings.includes("AGENTS.md"),
        "Warning should alert about drift in AGENTS.md",
      );
      assert.ok(existsSync(`${agentsFile}.drift.bak`), "Automatic backup AGENTS.md.drift.bak must exist");
      const bakContent = readFileSync(`${agentsFile}.drift.bak`, "utf-8");
      assert.ok(bakContent.includes("HAND-MODIFIED instructions by developer"), "Backup must preserve user modifications");
    } finally {
      console.warn = origWarn;
    }
  });
});
