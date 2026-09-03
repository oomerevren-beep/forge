// cli/src/core/semver.ts — Faz 10: tam semver (^ ~ >= > <= < * exact)
// REVIZE-B Faz 10: ^1.2.3 = >=1.2.3 <2.0.0, ~, >=, * parse — tek kaynak (single source of truth)
// registry.ts ve project.ts burayı kullanır, inline kopya yok.

export type SemverTuple = [number, number, number];

export function parseSemver(v: string): SemverTuple {
  const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

export function compareSemver(a: string, b: string): number {
  const [aM, am, ap] = parseSemver(a);
  const [bM, bm, bp] = parseSemver(b);
  if (aM !== bM) return aM - bM;
  if (am !== bm) return am - bm;
  return ap - bp;
}

export function isValidRange(r: string): boolean {
  const t = r.trim();
  if (t === "*" || t === "" || t === "latest") return true;
  if (/^(>=|<=|>|<|\^|~|=)/.test(t)) {
    const ver = t.replace(/^(>=|<=|>|<|\^|~|=)/, "").trim();
    return /^\d+\.\d+\.\d+/.test(ver);
  }
  if (/^v?\d+\.\d+\.\d+/.test(t)) return true;
  // x-range: 1.x, 1.2.x
  if (/^\d+\.(x|\*)$/.test(t)) return true;
  if (/^\d+\.\d+\.(x|\*)$/.test(t)) return true;
  return false;
}

export function satisfiesRange(version: string, range: string): boolean {
  const v = parseSemver(version);
  const r = range.trim();
  if (r === "*" || r === "" || r === "latest") return true;
  if (r.startsWith("^")) {
    const base = parseSemver(r.slice(1));
    if (compareSemver(version, r.slice(1).trim()) < 0) return false;
    // ^1.2.3 => >=1.2.3 <2.0.0 ; ^0.2.3 => >=0.2.3 <0.3.0 ; ^0.0.3 => =0.0.3
    if (base[0] !== 0) return v[0] === base[0];
    if (base[1] !== 0) return v[0] === 0 && v[1] === base[1];
    return v[0] === 0 && v[1] === 0 && v[2] === base[2];
  }
  if (r.startsWith("~")) {
    const base = parseSemver(r.slice(1));
    if (compareSemver(version, r.slice(1).trim()) < 0) return false;
    return v[0] === base[0] && v[1] === base[1];
  }
  if (r.startsWith(">=")) {
    const base = r.slice(2).trim();
    return compareSemver(version, base) >= 0;
  }
  if (r.startsWith("<=")) {
    const base = r.slice(2).trim();
    return compareSemver(version, base) <= 0;
  }
  if (r.startsWith(">")) {
    const base = r.slice(1).trim();
    return compareSemver(version, base) > 0;
  }
  if (r.startsWith("<")) {
    const base = r.slice(1).trim();
    return compareSemver(version, base) < 0;
  }
  if (r.startsWith("=")) {
    const base = r.slice(1).trim();
    return compareSemver(version, base) === 0;
  }
  // exact (allow leading v)
  const norm = r.startsWith("v") ? r.slice(1) : r;
  const vnorm = version.startsWith("v") ? version.slice(1) : version;
  if (/^\d+\.\d+\.\d+/.test(norm)) return compareSemver(vnorm, norm) === 0;
  return version === r;
}

export function maxSatisfying(versions: string[], range: string): string | null {
  const sat = versions.filter((v) => satisfiesRange(v, range));
  if (sat.length === 0) return null;
  sat.sort(compareSemver);
  return sat[sat.length - 1];
}
