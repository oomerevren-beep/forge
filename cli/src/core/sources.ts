// cli/src/core/sources.ts — Decentralized package sources (Phase 3).
//
// Beyond the verified registry, forge resolves:
//   registry:      pdf/merge, pdf/merge@^1.0.0          (default)
//   github:        github:owner/repo[#ref], owner/repo (fallback when the
//                  registry has no such name), https://github.com/o/r[.git][#ref]
//   git:           https://host/...git, git@host:... (shallow clone)
//   local:         ./path, ../path, /abs/path (monorepo / custom skills)
//
// Registry names win on conflict (owner/repo first tries the registry, then
// falls back to GitHub). Remote sources are cloned shallow (--depth 1) into
// a temp dir; the manifest (forge.toml [package], else SKILL.md / agent.md)
// is parsed for name/version/type/description.

import { existsSync, readFileSync, mkdirSync, rmSync, readdirSync, lstatSync, readlinkSync } from "fs";
import { join, resolve, basename, relative } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { parse } from "smol-toml";
import { copyDirRecursive } from "./fsutil.js";

export type SourceKind = "registry" | "github" | "git" | "local";

export interface SourceSpec {
  kind: SourceKind;
  /** Canonical source string for lock/links (e.g. "github:owner/repo@main"). */
  source: string;
  /** Registry-style name or owner/repo or URL or path (version part stripped). */
  ref: string;
  /** Requested ref/version when present (#main, @^1.0.0). */
  want?: string;
  /** True for explicit markers (github:, git URL, local path). Bare owner/repo is NOT explicit. */
  explicit: boolean;
}

export interface ExternalPackage {
  kind: SourceKind;
  source: string;
  name: string;
  version: string;
  type: string;
  description: string;
  /** Staged content dir (owned by caller — copy into the store, then remove). */
  dir: string;
  /** Git commit SHA when available. */
  resolved?: string;
  /** Deterministic SHA-256 digest of staged content. */
  sha256?: string;
  cleanup: () => void;
}

/** Compute a deterministic SHA-256 content digest across all files in a directory. */
export function computeDirectoryHash(dir: string): string {
  const hash = createHash("sha256");
  function walk(current: string): string[] {
    const list: string[] = [];
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        list.push(...walk(full));
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        list.push(full);
      }
    }
    return list;
  }
  const files = walk(dir).sort();
  for (const f of files) {
    const rel = relative(dir, f).replace(/\\/g, "/");
    hash.update(`path:${rel}\n`);
    try {
      const st = lstatSync(f);
      if (st.isSymbolicLink()) {
        hash.update(`symlink:${readlinkSync(f)}\n`);
      } else {
        const content = readFileSync(f);
        hash.update(content);
      }
    } catch { /* best-effort ignore */ }
  }
  return hash.digest("hex");
}

export function parseSourceArg(arg: string): SourceSpec {
  const a = arg.trim();
  // Local paths: ./x, ../x, /abs, ~/x, or .\x on Windows
  if (
    a.startsWith("./") ||
    a.startsWith("../") ||
    a.startsWith(".\\") ||
    a.startsWith("/") ||
    a.startsWith("~/") ||
    /^[a-zA-Z]:[\\/]/.test(a)
  ) {
    return { kind: "local", source: `local:${a}`, ref: a, explicit: true };
  }
  // github:owner/repo[#ref]
  if (a.startsWith("github:")) {
    const rest = a.slice("github:".length);
    const hash = rest.indexOf("#");
    const repo = hash === -1 ? rest : rest.slice(0, hash);
    const want = hash === -1 ? undefined : rest.slice(hash + 1);
    assertRepoShape(repo);
    return { kind: "github", source: want ? `github:${repo}@${want}` : `github:${repo}`, ref: repo, want, explicit: true };
  }
  // Direct git URLs (optional #ref trailer)
  if (/^(https?:\/\/|git@|ssh:\/\/)/.test(a)) {
    let url = a;
    let want: string | undefined;
    const schemeEnd = a.indexOf("://") + 3;
    const hash = a.lastIndexOf("#");
    if (hash > schemeEnd) {
      want = a.slice(hash + 1);
      url = a.slice(0, hash);
    }
    const kind: SourceKind = url.includes("github.com") ? "github" : "git";
    return { kind, source: want ? `${url}@${want}` : url, ref: url, want, explicit: true };
  }
  // owner/repo shorthand (registry fallback handled by caller)
  if (/^[a-z0-9-]+\/[a-z0-9-_.]+(#[a-z0-9-_.]+)?$/i.test(a)) {
    const hash = a.indexOf("#");
    const repo = hash === -1 ? a : a.slice(0, hash);
    const want = hash === -1 ? undefined : a.slice(hash + 1);
    return { kind: "github", source: want ? `github:${repo}@${want}` : `github:${repo}`, ref: repo, want, explicit: false };
  }
  return { kind: "registry", source: "registry", ref: a, explicit: true };
}

function assertRepoShape(repo: string): void {
  if (!/^[a-z0-9-]+\/[a-z0-9-_.]+$/i.test(repo)) {
    throw new Error(`[forge] invalid GitHub repo "${repo}" — expected owner/repo`);
  }
}

function stageDir(): string {
  const dir = join(tmpdir(), `forge-src-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function parseManifest(dir: string, fallbackName: string): { name: string; version: string; type: string; description: string } {
  const tomlPath = join(dir, "forge.toml");
  if (existsSync(tomlPath)) {
    try {
      const parsed = parse(readFileSync(tomlPath, "utf-8")) as Record<string, unknown>;
      const pkg = parsed.package as Record<string, unknown> | undefined;
      if (pkg && typeof pkg.name === "string") {
        const type = typeof pkg.type === "string" ? pkg.type : "skill";
        return {
          name: pkg.name,
          version: typeof pkg.version === "string" ? pkg.version : "0.0.0",
          type,
          description: typeof pkg.description === "string" ? pkg.description : `${pkg.name} (from external source)`,
        };
      }
    } catch (e) {
      throw new Error(`[forge] invalid forge.toml in ${dir}: ${(e as Error).message}`, { cause: e });
    }
  }
  // Fall back to SKILL.md / agent.md conventions
  const skillMd = join(dir, "SKILL.md");
  const agentMd = join(dir, "agent.md");
  const mdPath = existsSync(skillMd) ? skillMd : existsSync(agentMd) ? agentMd : null;
  if (mdPath) {
    const raw = readFileSync(mdPath, "utf-8");
    const heading = raw.split("\n").map((l) => l.trim()).find((l) => l.startsWith("# "));
    const scope = fallbackName.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "external";
    return {
      name: `external/${basename(dir).replace(/[^a-z0-9-]/gi, "").toLowerCase() || scope}`,
      version: "0.0.0",
      type: mdPath === agentMd ? "agent" : "skill",
      description: heading ? heading.replace(/^#\s+/, "").slice(0, 200) : `${fallbackName} (from external source)`,
    };
  }
  throw new Error(
    `[forge] no manifest in ${dir}: expected forge.toml, SKILL.md, or agent.md`,
  );
}

/** Resolve a local directory source into a staged package. */
export function resolveLocalSource(absDir: string): ExternalPackage {
  const dir = resolve(absDir.replace(/^~\//, `${process.env.HOME ?? ""}/`));
  if (!existsSync(dir)) throw new Error(`[forge] local source not found: ${absDir}`);
  const stat = (() => {
    try {
      return { dir: readdirSync(dir).length >= 0 };
    } catch {
      return null;
    }
  })();
  if (!stat) throw new Error(`[forge] local source is not a directory: ${absDir}`);
  const meta = parseManifest(dir, basename(dir));
  const stage = stageDir();
  // NOTE: raw fs.cpSync silently yields empty dirs under non-ASCII paths.
  copyDirRecursive(dir, stage);
  const digest = computeDirectoryHash(stage);
  return {
    kind: "local",
    source: `local:${absDir}`,
    ...meta,
    dir: stage,
    sha256: digest,
    cleanup: () => rmSync(stage, { recursive: true, force: true }),
  };
}

/** Shallow-clone a git URL (or owner/repo) into a staged package. */
export function resolveGitSource(repo: string, want?: string): ExternalPackage {
  const url = repo.includes("://") || repo.startsWith("git@") ? repo : `https://github.com/${repo}.git`;
  if (!/^(https?:\/\/|git@|ssh:\/\/)/.test(url)) {
    throw new Error(`[forge] invalid git source "${repo}"`);
  }
  const kind: SourceKind = url.includes("github.com") ? "github" : "git";
  const stage = stageDir();
  try {
    const args =
      want && want !== "HEAD"
        ? ["clone", "--depth", "1", "--branch", want, url, stage]
        : ["clone", "--depth", "1", url, stage];
    execFileSync("git", args, { stdio: "pipe" });
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw new Error(
      `[forge] git clone failed for ${url}${want ? ` (ref ${want})` : ""}: ${(e as Error).message}\n` +
        `[forge] Check the URL/ref and that 'git' is installed.`,
      { cause: e },
    );
  }
  let commitSha: string | undefined;
  try {
    commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: stage, stdio: "pipe" }).toString().trim();
  } catch { /* best-effort */ }
  const digest = computeDirectoryHash(stage);
  const shortName = (repo.split("/").pop() ?? "repo").replace(/\.git$/, "");
  const meta = parseManifest(stage, shortName);
  const canonical = !repo.includes("://") && kind === "github" ? `github:${repo}` : url;
  return {
    kind,
    source: want ? `${canonical}@${want}` : canonical,
    ...meta,
    dir: stage,
    resolved: commitSha,
    sha256: digest,
    cleanup: () => rmSync(stage, { recursive: true, force: true }),
  };
}

/** Dispatch any non-registry SourceSpec to its resolver. */
export function resolveExternalSource(spec: SourceSpec): ExternalPackage {
  if (spec.kind === "local") return resolveLocalSource(spec.ref);
  return resolveGitSource(spec.ref, spec.want);
}
