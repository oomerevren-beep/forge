// cli/src/commands/pack.ts — Package a directory into a verified deterministic tarball.

import { existsSync, writeFileSync, mkdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";
import { findProjectToml, loadPackageToml } from "../core/project.js";
import { scanPackageDir, countBySeverity } from "../core/scan.js";
import { createDeterministicTarGz } from "../core/tar.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "__pycache__",
  "dist",
  "build",
  ".cache",
  ".forge",
]);

async function listFiles(dir: string, baseDir: string, out: { relPath: string; absPath: string }[] = []): Promise<{ relPath: string; absPath: string }[]> {
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
      if (st.isDirectory()) {
        await listFiles(full, baseDir, out);
      } else if (st.isFile()) {
        const rel = relative(baseDir, full).replace(/\\/g, "/");
        out.push({ relPath: rel, absPath: full });
      }
    } catch {
      /* skip unreadable */
    }
  }
  return out;
}

export interface PackResult {
  name: string;
  version: string;
  tarballPath: string;
  sha256: string;
  fileCount: number;
  sizeBytes: number;
}

function matchesFilePattern(relPath: string, pattern: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");
  if (pat === "*" || pat === "**" || pat === "**/*") return true;
  if (pat.endsWith("/**")) {
    const pfx = pat.slice(0, -3);
    return norm === pfx || norm.startsWith(pfx + "/");
  }
  if (pat.endsWith("/*")) {
    const pfx = pat.slice(0, -2);
    return norm.startsWith(pfx + "/") && !norm.slice(pfx.length + 1).includes("/");
  }
  if (pat.startsWith("*.")) {
    return norm.endsWith(pat.slice(1));
  }
  if (pat.endsWith("*")) {
    return norm.startsWith(pat.slice(0, -1));
  }
  return norm === pat || norm.startsWith(pat + "/");
}

export async function packPackage(
  targetDir: string,
  opts: { check?: boolean; outDir?: string } = {},
): Promise<PackResult> {
  const dir = resolve(targetDir);
  const tomlPath = findProjectToml(dir);
  if (!tomlPath) {
    throw new Error(`forge pack requires a forge.toml in ${dir}`);
  }

  let name: string;
  let version: string;
  let parsedToml;
  try {
    parsedToml = loadPackageToml(tomlPath);
    if (!parsedToml.package) {
      throw new Error("forge pack requires [package] table in forge.toml");
    }
    name = parsedToml.package.name;
    version = parsedToml.package.version;
    if (!name || !version) {
      throw new Error("[package] must have name and version");
    }
  } catch (e) {
    throw new Error(`forge.toml parse error: ${(e as Error).message}`, { cause: e });
  }

  // Security scan pass
  const findings = scanPackageDir(dir);
  const counts = countBySeverity(findings);
  if (counts.high > 0) {
    const highMsgs = findings
      .filter((x) => x.severity === "high")
      .map((f) => `  [high] ${f.rule}: ${f.file} — ${f.message}`)
      .join("\n");
    throw new Error(`pack FAILED — high-severity security findings must be resolved first:\n${highMsgs}`);
  }

  const outDir = resolve(opts.outDir ?? join(dir, "dist"));
  const slug = name.replace(/\//g, "-");
  const tarballPath = join(outDir, `${slug}-${version}.tgz`);

  let files = (await listFiles(dir, dir)).sort((a, b) => a.relPath.localeCompare(b.relPath));

  // Exclude archives and the target tarball to prevent recursive nesting
  files = files.filter(
    (f) =>
      !f.relPath.endsWith(".tgz") &&
      !f.relPath.endsWith(".tar.gz") &&
      f.absPath !== tarballPath,
  );

  // Apply [files].include and [files].exclude if configured in forge.toml
  if (parsedToml.files?.include && parsedToml.files.include.length > 0) {
    const includes = parsedToml.files.include;
    files = files.filter(
      (f) =>
        f.relPath === "forge.toml" ||
        includes.some((pat: string) => matchesFilePattern(f.relPath, pat)),
    );
  }

  if (parsedToml.files?.exclude && parsedToml.files.exclude.length > 0) {
    const excludes = parsedToml.files.exclude;
    files = files.filter(
      (f) =>
        f.relPath === "forge.toml" ||
        !excludes.some((pat: string) => matchesFilePattern(f.relPath, pat)),
    );
  }

  if (files.length === 0) {
    throw new Error("pack: no files to pack (empty directory?)");
  }

  if (opts.check) {
    return {
      name,
      version,
      tarballPath,
      sha256: "",
      fileCount: files.length,
      sizeBytes: 0,
    };
  }

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const { tarball, sha256, fileCount } = createDeterministicTarGz(files);
  writeFileSync(tarballPath, tarball);
  const sizeBytes = statSync(tarballPath).size;

  return {
    name,
    version,
    tarballPath,
    sha256,
    fileCount,
    sizeBytes,
  };
}

export async function runPack(
  dirArg?: string,
  opts: { check?: boolean; out?: string; json?: boolean } = {},
): Promise<PackResult> {
  const dir = dirArg ? resolve(dirArg) : process.cwd();

  try {
    const result = await packPackage(dir, { check: opts.check, outDir: opts.out });
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    if (opts.check) {
      console.log(`[forge] check passed for ${result.name}@${result.version} (${result.fileCount} files)`);
      return result;
    }

    console.log(`[forge] packed ${result.tarballPath}`);
    console.log(`[forge] sha256: ${result.sha256}`);
    console.log(`[forge] files: ${result.fileCount}`);
    console.log(`[forge] size: ${result.sizeBytes} bytes`);
    return result;
  } catch (e) {
    console.error(`[forge] ${(e as Error).message}`);
    process.exit(1);
  }
}
