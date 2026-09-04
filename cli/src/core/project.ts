import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { parse } from "smol-toml";
import { isValidRange } from "./semver.js";

export interface AgentRole {
  model?: string;
  system_prompt?: string;
}

export interface SkillRef {
  version?: string;
  source?: string;
  ref?: string;
}

export interface McpServerDef {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ProjectPermissions {
  allowed_paths?: string[];
  denied_paths?: string[];
  allow_network?: boolean;
}

export interface ProjectToml {
  project?: { name?: string; version?: string; description?: string };
  dependencies: Record<string, string>;
  forge?: { harnesses?: string[] };
  /** Shared agent roles: [agents.developer] = { model, system_prompt }. */
  agents?: Record<string, AgentRole>;
  /** Team skills: [skills] name = "^1.0" or { version, source, ref }. */
  skills?: Record<string, SkillRef>;
  /** MCP servers: [mcp.servers.<name>] = { command, args, env }. */
  mcp?: { servers?: Record<string, McpServerDef> };
  /** Install-time permission boundaries. */
  permissions?: ProjectPermissions;
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
    throw new Error(`Cannot read ${path}: ${(e as Error).message}`, { cause: e });
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(raw) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`${path}: invalid TOML — ${(e as Error).message}`, { cause: e });
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

  // [agents.<role>] — shared agent roles with model + system prompt
  let agents: Record<string, AgentRole> | undefined;
  if (parsed.agents !== undefined) {
    if (typeof parsed.agents !== "object" || Array.isArray(parsed.agents)) {
      throw new Error(`${path}: [agents] must be a table of roles`);
    }
    agents = {};
    for (const [role, def] of Object.entries(parsed.agents as Record<string, unknown>)) {
      if (typeof def !== "object" || def === null || Array.isArray(def)) {
        throw new Error(`${path}: [agents.${role}] must be a table`);
      }
      const d = def as Record<string, unknown>;
      if (d.model !== undefined && typeof d.model !== "string") {
        throw new Error(`${path}: [agents.${role}].model must be a string`);
      }
      if (d.system_prompt !== undefined && typeof d.system_prompt !== "string") {
        throw new Error(`${path}: [agents.${role}].system_prompt must be a string`);
      }
      agents[role] = {
        ...(typeof d.model === "string" ? { model: d.model } : {}),
        ...(typeof d.system_prompt === "string" ? { system_prompt: d.system_prompt } : {}),
      };
    }
  }

  // [skills] — name = "version" | { version, source, ref }
  let skills: Record<string, SkillRef> | undefined;
  if (parsed.skills !== undefined) {
    if (typeof parsed.skills !== "object" || Array.isArray(parsed.skills)) {
      throw new Error(`${path}: [skills] must be a table`);
    }
    skills = {};
    for (const [skillName, def] of Object.entries(parsed.skills as Record<string, unknown>)) {
      if (typeof def === "string") {
        skills[skillName] = { version: def };
      } else if (typeof def === "object" && def !== null && !Array.isArray(def)) {
        const d = def as Record<string, unknown>;
        const ref: SkillRef = {};
        if (d.version !== undefined) {
          if (typeof d.version !== "string") throw new Error(`${path}: [skills.${skillName}].version must be a string`);
          ref.version = d.version;
        }
        if (d.source !== undefined) {
          if (typeof d.source !== "string") throw new Error(`${path}: [skills.${skillName}].source must be a string`);
          ref.source = d.source;
        }
        if (d.ref !== undefined) {
          if (typeof d.ref !== "string") throw new Error(`${path}: [skills.${skillName}].ref must be a string`);
          ref.ref = d.ref;
        }
        skills[skillName] = ref;
      } else {
        throw new Error(`${path}: [skills.${skillName}] must be a version string or { version, source, ref }`);
      }
    }
  }

  // [mcp.servers.<name>] — MCP server definitions
  let mcp: { servers?: Record<string, McpServerDef> } | undefined;
  const rawMcp = parsed.mcp as Record<string, unknown> | undefined;
  if (rawMcp !== undefined) {
    if (typeof rawMcp !== "object" || Array.isArray(rawMcp)) {
      throw new Error(`${path}: [mcp] must be a table`);
    }
    const servers: Record<string, McpServerDef> = {};
    const rawServers = (rawMcp.servers ?? {}) as Record<string, unknown>;
    if (typeof rawServers !== "object" || Array.isArray(rawServers)) {
      throw new Error(`${path}: [mcp.servers] must be a table`);
    }
    for (const [serverName, def] of Object.entries(rawServers)) {
      if (typeof def !== "object" || def === null || Array.isArray(def)) {
        throw new Error(`${path}: [mcp.servers.${serverName}] must be a table`);
      }
      const d = def as Record<string, unknown>;
      if (typeof d.command !== "string" || d.command.length === 0) {
        throw new Error(`${path}: [mcp.servers.${serverName}].command is required`);
      }
      if (d.args !== undefined && (!Array.isArray(d.args) || !d.args.every((a) => typeof a === "string"))) {
        throw new Error(`${path}: [mcp.servers.${serverName}].args must be string[]`);
      }
      if (d.env !== undefined && (typeof d.env !== "object" || d.env === null || Array.isArray(d.env))) {
        throw new Error(`${path}: [mcp.servers.${serverName}].env must be a table`);
      }
      servers[serverName] = {
        command: d.command,
        ...(Array.isArray(d.args) ? { args: d.args as string[] } : {}),
        ...(typeof d.env === "object" && d.env !== null ? { env: d.env as Record<string, string> } : {}),
      };
    }
    mcp = { servers };
  }

  // [permissions] — install-time boundaries
  let permissions: ProjectPermissions | undefined;
  if (parsed.permissions !== undefined) {
    if (typeof parsed.permissions !== "object" || Array.isArray(parsed.permissions)) {
      throw new Error(`${path}: [permissions] must be a table`);
    }
    const p = parsed.permissions as Record<string, unknown>;
    for (const key of ["allowed_paths", "denied_paths"]) {
      const v = p[key];
      if (v !== undefined && (!Array.isArray(v) || !v.every((a) => typeof a === "string"))) {
        throw new Error(`${path}: [permissions].${key} must be string[]`);
      }
    }
    if (p.allow_network !== undefined && typeof p.allow_network !== "boolean") {
      throw new Error(`${path}: [permissions].allow_network must be a boolean`);
    }
    permissions = {
      ...(Array.isArray(p.allowed_paths) ? { allowed_paths: p.allowed_paths as string[] } : {}),
      ...(Array.isArray(p.denied_paths) ? { denied_paths: p.denied_paths as string[] } : {}),
      ...(typeof p.allow_network === "boolean" ? { allow_network: p.allow_network } : {}),
    };
  }

  return { project, dependencies, forge, agents, skills, mcp, permissions, package: parsed.package as Record<string, unknown> | undefined };
}

export function validateProjectToml(p: ProjectToml): string[] {
  const errs: string[] = [];
  for (const [name, range] of Object.entries(p.dependencies)) {
    if (!DEP_NAME_RE.test(name)) errs.push(`Invalid dependency name "${name}" — expected scope/name (e.g. anthropics/plan)`);
    if (!range || typeof range !== "string") errs.push(`Invalid range for "${name}": ${String(range)}`);
    else if (!isValidRange(range)) errs.push(`Invalid semver range for "${name}": "${range}"`);
  }
  if (p.forge?.harnesses !== undefined && !Array.isArray(p.forge.harnesses)) {
    errs.push(`[forge].harnesses must be an array`);
  }
  if (p.skills) {
    for (const [skillName, ref] of Object.entries(p.skills)) {
      if (ref.version && !ref.source && !isValidRange(ref.version)) {
        errs.push(`Invalid semver range for skill "${skillName}": "${ref.version}"`);
      }
      if (ref.source !== undefined && ref.source.length === 0) {
        errs.push(`Empty source for skill "${skillName}"`);
      }
    }
  }
  if (p.mcp?.servers) {
    for (const [serverName, def] of Object.entries(p.mcp.servers)) {
      if (!def.command) errs.push(`[mcp.servers.${serverName}].command is required`);
    }
  }
  return errs;
}
