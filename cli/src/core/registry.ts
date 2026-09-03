import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { toSlug } from "./store.js";
import { compareSemver, satisfiesRange, maxSatisfying } from "./semver.js";

export interface RegistryIndex {
  generatedAt: string;
  count: number;
  packages: Record<string, RegistryPackageSummary>;
}

export interface RegistryPackageSummary {
  name: string;
  type: string;
  description: string;
  latest: string;
  versions: string[];
  keywords?: string[];
  updatedAt?: string;
  /** Trust tier: true = latest tarball fetched + sha256 pinned (Faz 6-oncesi verified core). */
  verified?: boolean;
}

export interface PackageVersion {
  version: string;
  tarball: string;
  sha256: string;
  /** True only when tarball URL returned HTTP 200 and sha256 matches content. */
  verified?: boolean;
  /** Upstream pin for archive tarballs (e.g. git commit sha). */
  sourceRef?: string;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  mcp?: { command: string; args?: string[]; env?: Record<string, string> };
  publishedAt?: string;
}

export interface PackageDetail {
  name: string;
  type: string;
  description: string;
  homepage?: string;
  repository?: string;
  author?: string;
  keywords?: string[];
  source?: string;
  versions: Record<string, PackageVersion>;
  latest: string;
}

function registryRoot(): string {
  // Resolve from file location: dist/cli/src/core -> dist/cli/src/core/../../.. = package root
  // Then /registry = package's bundled registry dir.
  // When running via tsx in repo, import.meta.dirname = cli/src/core
  // → ../../../registry works (repo root has registry/)
  // When running from global npm install, import.meta.dirname = node_modules/tryforge/dist/cli/src/core
  // → ../../../../registry works (package root has registry/)
  const candidates = [
    join(import.meta.dirname ?? "./", "../../../registry"),
    join(import.meta.dirname ?? "./", "../../../../registry"),
    join(process.cwd(), "registry"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "index.json"))) return c;
  }
  // Last fallback — may still fail with clear error
  return join(import.meta.dirname ?? "./", "../../../registry");
}

export function loadIndex(): RegistryIndex {
  const root = registryRoot();
  const p = join(root, "index.json");
  if (!existsSync(p)) throw new Error(`Registry index not found: ${p}`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

export function loadPackageDetail(pkg: string): PackageDetail {
  const root = registryRoot();
  const slug = toSlug(pkg);
  const p = join(root, "packages", `${slug}.json`);
  if (!existsSync(p)) throw new Error(`Package not found: ${pkg} (${p})`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

export function resolveVersion(pkg: string, requested?: string): { detail: PackageDetail; version: string; versionMeta: PackageVersion } {
  const detail = loadPackageDetail(pkg);
  if (!requested || requested === "latest" || requested === "*") {
    const v = detail.latest;
    const meta = detail.versions[v];
    if (!meta) throw new Error(`Latest version ${v} not found for ${pkg}`);
    return { detail, version: v, versionMeta: meta };
  }
  // exact version
  if (detail.versions[requested]) {
    return { detail, version: requested, versionMeta: detail.versions[requested] };
  }
  // semver range (Faz 10: semver.ts tek kaynak) — pick highest satisfying
  const picked = maxSatisfying(Object.keys(detail.versions), requested);
  if (!picked) throw new Error(`No version satisfying ${requested} for ${pkg}. Available: ${Object.keys(detail.versions).join(", ")}`);
  return { detail, version: picked, versionMeta: detail.versions[picked] };
}

export function parsePackageArg(arg: string): { name: string; version?: string } {
  // anthropics/plan@1.2.0  or  anthropics/plan@^1.0.0  or  anthropics/plan
  const at = arg.lastIndexOf("@");
  // need to distinguish scope/name@ver vs @ver — scope always contains /
  // So if arg is "pkg@ver", at > 0 and slash before at
  if (at > 0 && arg.slice(0, at).includes("/")) {
    return { name: arg.slice(0, at), version: arg.slice(at + 1) };
  }
  return { name: arg };
}

// --- semver helpers Faz 10'da semver.ts'e taşındı (tek kaynak) ---
// Bu dosya geriye dönük uyumluluk için re-export eder.
export { parseSemver, compareSemver, satisfiesRange, maxSatisfying, isValidRange } from "./semver.js";

export function searchPackages(query: string, opts: { type?: string; limit?: number } = {}): RegistryPackageSummary[] {
  const index = loadIndex();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: { p: RegistryPackageSummary; score: number }[] = [];
  for (const p of Object.values(index.packages)) {
    if (opts.type && p.type !== opts.type) continue;
    const name = p.name.toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    const kw = (p.keywords ?? []).join(" ").toLowerCase();
    const type = (p.type ?? "").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (name === t) score += 50;
      else if (name.startsWith(t)) score += 15;
      else if (name.includes(t)) score += 10;
      if (kw.split(/\s+/).includes(t)) score += 8;
      else if (kw.includes(t)) score += 5;
      if (type === t) score += 6;
      if (desc.includes(t)) score += 2;
    }
    if (score > 0) {
      // Verified tarballs rank first on ties — first touch should install cleanly.
      if (p.verified) score += 4;
      scored.push({ p, score });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  const out = scored.map((s) => s.p);
  return typeof opts.limit === "number" ? out.slice(0, opts.limit) : out;
}
