// cli/src/core/semver.ts — Epoch 1c: tam semver (^ ~ >= > <= < * exact + kompozit + x-range + pre-release)
// Tek kaynak (single source of truth) — registry.ts ve project.ts burayı kullanır.

export type SemverTuple = [number, number, number];

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  pre?: string; // e.g. "beta", "rc.1"
}

export function parseSemver(v: string): ParsedVersion {
  const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-.]?([a-zA-Z0-9.]+))?/);
  if (!m) return { major: 0, minor: 0, patch: 0 };
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    pre: m[4],
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  // Pre-release: 1.2.3-beta < 1.2.3 (SemVer spec)
  if (pa.pre && !pb.pre) return -1;
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && pb.pre) return pa.pre.localeCompare(pb.pre);
  return 0;
}

export function isValidRange(r: string): boolean {
  const t = r.trim();
  if (t === "*" || t === "" || t === "latest") return true;
  // Exact: 1.2.0, v1.2.0
  if (/^v?\d+\.\d+\.\d+/.test(t)) return true;
  // ^ + full semver: ^1.2.0, ^0.2.3
  if (/^\^v?\d+\.\d+\.\d+/.test(t)) return true;
  // ~ + full semver: ~1.2.3, ~0.1.0
  if (/^~v?\d+\.\d+\.\d+/.test(t)) return true;
  // x-range: 1.x, 1.2.x, 1.*, 1.2.*
  if (/^\d+\.(\*|x)$/.test(t)) return true;
  if (/^\d+\.\d+\.(\*|x)$/.test(t)) return true;
  // Kısmi aralıklar: ^1, ~1, ~1.2
  if (/^\^\d+$/.test(t)) return true;
  if (/^~\d+$/.test(t)) return true;
  if (/^~\d+\.\d+$/.test(t)) return true;
  // Tek operatörler: >=1.0.0, <2.0.0, =1.2.3
  if (/^(>=|<=|>|<|=)\s*v?\d+\.\d+\.\d+/.test(t)) return true;
  // Kompozit aralıklar: >=1.2.0 <2.0.0
  if (/^(>=|<=|>|<)\s*v?\d+\.\d+\.\d+\s+(>=|<=|>|<)\s*v?\d+\.\d+\.\d+/.test(t)) return true;
  return false;
}

export function satisfiesRange(version: string, range: string): boolean {
  const r = range.trim();
  if (r === "*" || r === "" || r === "latest") return true;

  // Kompozit aralık: "op1 ver1 op2 ver2"
  const composite = r.match(/^(>=|<=|>|<)\s*(v?\d+\.\d+\.\d+)\s+(>=|<=|>|<)\s*(v?\d+\.\d+\.\d+)$/);
  if (composite) {
    const [, op1, ver1, op2, ver2] = composite;
    return applyOp(version, op1, ver1) && applyOp(version, op2, ver2);
  }

  // ^ (caret): ^1.2.0, ^0.2.3, ^1.2, ^1
  if (r.startsWith("^")) {
    const baseStr = r.slice(1).trim();
    const base = parseSemver(baseStr);
    if (compareSemver(version, baseStr) < 0) return false;
    const pv = parseSemver(version);
    // ^1 → >=1.0.0 <2.0.0
    if (baseStr.match(/^\d+$/)) return pv.major === base.major;
    // ^1.2 → >=1.2.0 <2.0.0
    if (baseStr.match(/^\d+\.\d+$/)) return pv.major === base.major && pv.minor === base.minor;
    // ^1.2.3 → >=1.2.3 <2.0.0
    if (base.major !== 0) return pv.major === base.major;
    if (base.minor !== 0) return pv.major === 0 && pv.minor === base.minor;
    return pv.major === 0 && pv.minor === 0 && pv.patch === base.patch;
  }

  // ~ (tilde): ~1.2.3, ~1.2, ~1
  if (r.startsWith("~")) {
    const baseStr = r.slice(1).trim();
    const base = parseSemver(baseStr);
    if (compareSemver(version, baseStr) < 0) return false;
    const pv = parseSemver(version);
    if (baseStr.match(/^\d+\.\d+\.\d+$/)) {
      // ~1.2.3 → >=1.2.3 <1.3.0
      return pv.major === base.major && pv.minor === base.minor;
    }
    if (baseStr.match(/^\d+\.\d+$/)) {
      // ~1.2 → >=1.2.0 <1.3.0
      return pv.major === base.major && pv.minor === base.minor;
    }
    // ~1 → >=1.0.0 <2.0.0
    return pv.major === base.major;
  }

  // X-range: 1.x, 1.2.x, 1.*, 1.2.*
  const xRange = r.match(/^(\d+)(?:\.(\d+))?\.(\*|x)$/);
  if (xRange) {
    const [, maj, min] = xRange;
    const pv = parseSemver(version);
    if (min === undefined) {
      // 1.x → major = 1
      return pv.major === parseInt(maj, 10);
    }
    // 1.2.x → major = 1, minor = 2
    return pv.major === parseInt(maj, 10) && pv.minor === parseInt(min, 10);
  }

  // Tek operatörler
  if (r.startsWith(">=")) return applyOp(version, ">=", r.slice(2).trim());
  if (r.startsWith("<=")) return applyOp(version, "<=", r.slice(2).trim());
  if (r.startsWith(">")) return applyOp(version, ">", r.slice(1).trim());
  if (r.startsWith("<")) return applyOp(version, "<", r.slice(1).trim());
  if (r.startsWith("=")) return compareSemver(version, r.slice(1).trim()) === 0;

  // Exact (allow leading v)
  const norm = r.startsWith("v") ? r.slice(1) : r;
  const vnorm = version.startsWith("v") ? version.slice(1) : version;
  if (/^\d+\.\d+\.\d+/.test(norm)) return compareSemver(vnorm, norm) === 0;
  return version === r;
}

function applyOp(version: string, op: string, target: string): boolean {
  const cmp = compareSemver(version, target);
  switch (op) {
    case ">=": return cmp >= 0;
    case "<=": return cmp <= 0;
    case ">": return cmp > 0;
    case "<": return cmp < 0;
    default: return false;
  }
}

export function maxSatisfying(versions: string[], range: string): string | null {
  const sat = versions.filter((v) => satisfiesRange(v, range));
  if (sat.length === 0) return null;
  sat.sort(compareSemver);
  return sat[sat.length - 1];
}
