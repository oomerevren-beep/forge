// cli/src/commands/pack.ts — Package the current directory into a verified tarball.

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { execFileSync } from "child_process";

import { findProjectToml, loadProjectToml } from "../core/project.js";
import { scanPackageDir, countBySeverity } from "../core/scan.js";

const SKIP_DIRS = new Set(["node_modules", ".git", ".hg", ".svn", "__pycache__", "dist", "build", ".cache", ".forge"]);

async function listFiles(dir: string, out: string[] = []): Promise<string[]> {
  const { readdirSync, statSync: stat } = await import("fs");
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith(".forge-")) continue;
    const full = join(dir, e.name);
    try {
      const st = stat(full);
      if (st.isDirectory()) await listFiles(full, out);
      else if (st.isFile()) out.push(full);
    } catch { /* skip */ }
  }
  return out;
}

export async function runPack(opts: { check?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  const tomlPath = findProjectToml(cwd);
  if (!tomlPath) {
    console.error("[forge] pack requires a forge.toml in the current directory");
    process.exit(1);
  }

  let name: string, version: string;
  try {
    const parsed = loadProjectToml(tomlPath);
    if (!parsed.package) {
      console.error("[forge] pack requires [package] table in forge.toml");
      process.exit(1);
    }
    name = (parsed.package as Record<string, unknown>).name as string;
    version = (parsed.package as Record<string, unknown>).version as string;
    if (!name || !version) {
      console.error("[forge] [package] must have name and version");
      process.exit(1);
    }
  } catch (e) {
    console.error(`[forge] forge.toml parse error: ${(e as Error).message}`);
    process.exit(1);
  }

  console.log(`[forge] packing ${name}@${version}...`);

  const findings = scanPackageDir(cwd);
  const counts = countBySeverity(findings);
  console.log(`[forge] security: ${counts.high} high, ${counts.medium} medium, ${counts.low} low`);
  if (counts.high > 0) {
    console.log("[forge] pack FAILED — high-severity findings must be resolved first");
    for (const f of findings.filter((x) => x.severity === "high")) {
      console.log(`  [high] ${f.rule}: ${f.file} — ${f.message}`);
    }
    process.exit(1);
  }

  if (opts.check) {
    console.log("[forge] check passed");
    return;
  }

  const files = (await listFiles(cwd)).sort();
  if (files.length === 0) {
    console.error("[forge] pack: no files to pack (empty directory?)");
    process.exit(1);
  }

  const outDir = join(cwd, "dist");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const slug = name.replace("/", "-");
  const tarball = join(outDir, `${slug}-${version}.tgz`);

  try {
    const fileList = files.map((f) => `"${f}"`).join("\n");
    const listPath = join(cwd, ".forge-pack-list.txt");
    writeFileSync(listPath, fileList + "\n");
    execFileSync("python", ["-c", `
import tarfile, sys, os
cwd = os.getcwd()
with tarfile.open(sys.argv[1], 'w:gz') as tf:
    for line in open('.forge-pack-list.txt'):
        f = line.strip().strip('"')
        if f and os.path.isfile(f):
            tf.add(f, arcname=os.path.relpath(f, cwd))
`], { stdio: "pipe" });
    const { unlinkSync } = await import("fs");
    try { unlinkSync(listPath); } catch { /* best-effort */ }
  } catch (e) {
    console.error(`[forge] tarball creation failed: ${(e as Error).message}`);
    process.exit(1);
  }

  let sha256: string;
  try {
    const buf = readFileSync(tarball);
    sha256 = createHash("sha256").update(buf).digest("hex");
  } catch (e) {
    console.error(`[forge] sha256 failed: ${(e as Error).message}`);
    process.exit(1);
  }

  console.log(`[forge] packed ${tarball}`);
  console.log(`[forge] sha256: ${sha256}`);
  console.log(`[forge] files: ${files.length}`);
  console.log(`[forge] size: ${statSync(tarball).size} bytes`);
}
