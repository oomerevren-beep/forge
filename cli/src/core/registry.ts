import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { toSlug } from "./store.js";

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
}

export interface PackageVersion {
  version: string;
  tarball: string;
  sha256: string;
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
  // cli/src/core/ -> ../../.. = repo root
  // When running via tsx, __dirname is cli/src/core
  // Use process.cwd() if registry/ exists there, else resolve relative to this file
  if (existsSync("registry/index.json")) return "registry";
  // fallback: resolve from file location
  const candidates = [
    join(process.cwd(), "registry"),
    join(import.meta.dirname ?? ".", "../../../registry"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "index.json"))) return c;
  }
  return "registry";
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
  // simple semver range: ^1.2.0, ~1.2.0, >=1.0.0 — for v0.1 pick highest satisfying
  const range = requested;
  const satisfying = Object.keys(detail.versions).filter((v) => satisfiesRange(v, range));
  if (satisfying.length === 0) throw new Error(`No version satisfying ${range} for ${pkg}. Available: ${Object.keys(detail.versions).join(", ")}`);
  satisfying.sort(compareSemver);
  const picked = satisfying[satisfying.length - 1];
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

// --- minimal semver helpers ---
function parseSemver(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function compareSemver(a: string, b: string): number {
  const [aM, am, ap] = parseSemver(a);
  const [bM, bm, bp] = parseSemver(b);
  if (aM !== bM) return aM - bM;
  if (am !== bm) return am - bm;
  return ap - bp;
}

function satisfiesRange(version: string, range: string): boolean {
  const v = parseSemver(version);
  const r = range.trim();
  if (r === "*" || r === "") return true;
  if (r.startsWith("^")) {
    const base = parseSemver(r.slice(1));
    // ^1.2.3 => >=1.2.3 <2.0.0 ; ^0.2.3 => >=0.2.3 <0.3.0
    if (base[0] !== 0) return v[0] === base[0] && compareSemver(version, r.slice(1)) >= 0;
    if (base[1] !== 0) return v[0] === 0 && v[1] === base[1] && compareSemver(version, r.slice(1)) >= 0;
    return v[0] === 0 && v[1] === 0 && v[2] === base[2] && compareSemver(version, r.slice(1)) >= 0;
  }
  if (r.startsWith("~")) {
    const base = parseSemver(r.slice(1));
    return v[0] === base[0] && v[1] === base[1] && compareSemver(version, r.slice(1)) >= 0;
  }
  if (r.startsWith(">=")) {
    const base = r.slice(2).trim();
    return compareSemver(version, base) >= 0;
  }
  if (r.startsWith(">")) {
    const base = r.slice(1).trim();
    return compareSemver(version, base) > 0;
  }
  // exact
  return version === r;
}

export function searchPackages(query: string): RegistryPackageSummary[] {
  const index = loadIndex();
  const q = query.toLowerCase();
  return Object.values(index.packages).filter((p) => {
    const hay = `${p.name} ${p.description} ${p.keywords?.join(" ") ?? ""} ${p.type}`.toLowerCase();
    return hay.includes(q);
  });
}
