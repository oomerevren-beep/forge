import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { parse } from "smol-toml";
import { isValidRange } from "./semver.js";

export interface ProjectToml {
  project?: { name?: string; version?: string; description?: string };
  dependencies: Record<string, string>;
  forge?: { harnesses?: string[] };
  // allow [package] form too (published package) — treated as not a project file
  package?: Record<string, unknown>;
}

export const DEP_NAME_RE = /^[a-z0-9-]+\/[a-z0-9-]+$/;

export function findProjectToml(cwd: string): string | null {
  const candidate = join(resolve(cwd), "forge.toml");
  if (existsSync(candidate)) return candidate;
  return null;
}

export function loadProjectToml(path: string): ProjectToml {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    throw new Error(`Cannot read ${path}: ${(e as Error).message}`);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(raw) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`${path}: invalid TOML — ${(e as Error).message}`);
  }

  // detect author [package] file (not a project install target)
  if (parsed.package && !parsed.dependencies && !parsed.project) {
    throw new Error(
      `${path} looks like a package manifest ([package]), not a project file. ` +
        `Use 'forge add <pkg>' or create a project forge.toml with [dependencies].`
    );
  }

  const deps = (parsed.dependencies ?? {}) as Record<string, unknown>;
  if (typeof deps !== "object" || Array.isArray(deps)) {
    throw new Error(`${path}: [dependencies] must be a table`);
  }
  const dependencies: Record<string, string> = {};
  for (const [k, v] of Object.entries(deps)) {
    if (typeof v !== "string") throw new Error(`${path}: dependency "${k}" must be a version string, got ${typeof v}`);
    dependencies[k] = v;
  }

  const forge = parsed.forge as { harnesses?: string[] } | undefined;
  const project = parsed.project as ProjectToml["project"] | undefined;

  return { project, dependencies, forge, package: parsed.package as Record<string, unknown> | undefined };
}

export function validateProjectToml(p: ProjectToml, pathForMsg = "forge.toml"): string[] {
  const errs: string[] = [];
  for (const [name, range] of Object.entries(p.dependencies)) {
    if (!DEP_NAME_RE.test(name)) errs.push(`Invalid dependency name "${name}" — expected scope/name (e.g. anthropics/plan)`);
    if (!range || typeof range !== "string") errs.push(`Invalid range for "${name}": ${String(range)}`);
    else if (!isValidRange(range)) errs.push(`Invalid semver range for "${name}": "${range}"`);
  }
  if (p.forge?.harnesses !== undefined && !Array.isArray(p.forge.harnesses)) {
    errs.push(`[forge].harnesses must be an array`);
  }
  return errs;
}
