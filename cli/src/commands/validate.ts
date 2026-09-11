// cli/src/commands/validate.ts — Strict pre-publish validation for Forge packages.

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, relative, extname, dirname } from "path";
import { parse } from "smol-toml";
import { DEP_NAME_RE, PACKAGE_TYPES, QUALITY_TIERS, type PackageType } from "../core/project.js";
import { scanPackageDir, countBySeverity } from "../core/scan.js";

export interface ValidationCheck {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
}

export interface ValidationResult {
  ok: boolean;
  dir: string;
  name: string;
  version: string;
  type: string;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

const SECRET_PATTERNS = [
  { name: "Private Key", pattern: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: "AWS Access Key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub Token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: "OpenAI API Key", pattern: /\bsk-(?:proj-|live-)?[A-Za-z0-9_-]{32,}\b/ },
  { name: "Anthropic API Key", pattern: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/ },
  { name: "Slack Token", pattern: /\bxox[baprs]-[0-9]{9,}-[A-Za-z0-9_-]{10,}\b/ },
  { name: "JWT Token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: "Hardcoded Secret Assignment", pattern: /(?:api[_-]?key|secret|password|access[_-]?token)\s*=\s*["'][A-Za-z0-9+/=_-]{20,}["']/i },
];

const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm",
  ".pdf", ".mp3", ".mp4", ".mov", ".avi",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  ".cache",
  ".forge",
]);

function listFilesForScanning(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".forge-")) continue;
    const full = join(dir, e.name);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        listFilesForScanning(full, out);
      } else if (st.isFile()) {
        const ext = extname(full).toLowerCase();
        if (BINARY_EXTS.has(ext) || st.size > 2 * 1024 * 1024) {
          continue;
        }
        out.push(full);
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

export function validatePackage(dirArg: string): ValidationResult {
  let dir = resolve(dirArg);
  if (existsSync(dir)) {
    try {
      if (statSync(dir).isFile()) {
        dir = dirname(dir);
      }
    } catch {
      /* ignore */
    }
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: ValidationCheck[] = [];

  let name = "unknown";
  let version = "0.0.0";
  let type = "skill";

  // 1. Manifest Presence and TOML Validity
  const tomlPath = join(dir, "forge.toml");
  if (!existsSync(tomlPath)) {
    const msg = `forge.toml not found in ${dir}`;
    errors.push(msg);
    checks.push({ id: "manifest", name: "Manifest file (forge.toml)", passed: false, message: msg });
    return { ok: false, dir, name, version, type, checks, errors, warnings };
  }

  let parsed: Record<string, unknown>;
  try {
    const raw = readFileSync(tomlPath, "utf-8");
    parsed = parse(raw) as Record<string, unknown>;
    checks.push({ id: "manifest", name: "Manifest file (forge.toml)", passed: true });
  } catch (e) {
    const msg = `forge.toml parse error: ${(e as Error).message}`;
    errors.push(msg);
    checks.push({ id: "manifest", name: "Manifest file (forge.toml)", passed: false, message: msg });
    return { ok: false, dir, name, version, type, checks, errors, warnings };
  }

  // 2. [package] Table Validation
  const pkgTable = parsed.package as Record<string, unknown> | undefined;
  if (!pkgTable || typeof pkgTable !== "object" || Array.isArray(pkgTable)) {
    errors.push("Missing [package] table in forge.toml");
    checks.push({ id: "package_table", name: "[package] table", passed: false, message: "Missing [package] table" });
  } else {
    name = (pkgTable.name as string) ?? "";
    version = (pkgTable.version as string) ?? "";
    type = (pkgTable.type as string) ?? "";
    const description = (pkgTable.description as string) ?? "";
    const license = (pkgTable.license as string) ?? "";
    const tier = (pkgTable.tier as string) ?? "community";

    let pkgValid = true;
    if (!name || !DEP_NAME_RE.test(name)) {
      errors.push(`Invalid package name "${name}". Must be in format scope/name (e.g. org/pkg-name)`);
      pkgValid = false;
    }

    if (!type || !PACKAGE_TYPES.includes(type as PackageType)) {
      errors.push(`Invalid package type "${type}". Must be one of: ${PACKAGE_TYPES.join(", ")}`);
      pkgValid = false;
    }

    if (!description || description.length < 10 || description.length > 300) {
      errors.push(`Package description must be between 10 and 300 characters (got ${description.length})`);
      pkgValid = false;
    }

    if (!license) {
      errors.push("Missing license in [package] table");
      pkgValid = false;
    }

    if (tier && !QUALITY_TIERS.includes(tier as "community" | "verified" | "trusted")) {
      errors.push(`Invalid tier "${tier}". Must be one of: ${QUALITY_TIERS.join(", ")}`);
      pkgValid = false;
    }

    checks.push({
      id: "package_table",
      name: "[package] table schema",
      passed: pkgValid,
      message: pkgValid ? undefined : "Invalid [package] table fields",
    });
  }

  // 3. SemVer Check
  const SEMVER_STRICT_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  if (!version || !SEMVER_STRICT_RE.test(version)) {
    const msg = `Invalid semver format "${version}". Expected format: MAJOR.MINOR.PATCH (e.g. 1.0.0)`;
    errors.push(msg);
    checks.push({ id: "semver", name: "Semantic versioning", passed: false, message: msg });
  } else {
    checks.push({ id: "semver", name: "Semantic versioning", passed: true });
  }

  // 4. License File Check
  const licenseFileCandidates = ["LICENSE", "LICENSE.md", "LICENSE.txt"];
  const licenseFound = licenseFileCandidates.find((f) => existsSync(join(dir, f)));
  if (!licenseFound) {
    const msg = "Missing LICENSE file in package root";
    errors.push(msg);
    checks.push({ id: "license_file", name: "LICENSE file", passed: false, message: msg });
  } else {
    const content = readFileSync(join(dir, licenseFound), "utf-8").trim();
    if (content.length < 10) {
      const msg = `LICENSE file (${licenseFound}) is empty or too short`;
      errors.push(msg);
      checks.push({ id: "license_file", name: "LICENSE file", passed: false, message: msg });
    } else {
      checks.push({ id: "license_file", name: "LICENSE file", passed: true });
    }
  }

  // 5. README Check
  const readmeCandidates = ["README.md", "README.txt", "README"];
  const readmeFound = readmeCandidates.find((f) => existsSync(join(dir, f)));
  if (!readmeFound) {
    const msg = "Missing README.md in package root";
    errors.push(msg);
    checks.push({ id: "readme_file", name: "README.md documentation", passed: false, message: msg });
  } else {
    const content = readFileSync(join(dir, readmeFound), "utf-8").trim();
    if (content.length < 20) {
      const msg = "README.md is empty or lacks sufficient documentation";
      errors.push(msg);
      checks.push({ id: "readme_file", name: "README.md documentation", passed: false, message: msg });
    } else {
      checks.push({ id: "readme_file", name: "README.md documentation", passed: true });
    }
  }

  // 6. Compatibility Declaration Check
  const compat = parsed.compatibility as { harnesses?: string[] } | undefined;
  const engines = parsed.engines as Record<string, string> | undefined;
  const hasCompat = (compat?.harnesses && Array.isArray(compat.harnesses) && compat.harnesses.length > 0) ||
    (engines && typeof engines === "object" && Object.keys(engines).length > 0);

  if (!hasCompat) {
    const msg = "Missing [compatibility] or [engines] declaration in forge.toml";
    errors.push(msg);
    checks.push({ id: "compatibility", name: "Compatibility declaration", passed: false, message: msg });
  } else {
    checks.push({ id: "compatibility", name: "Compatibility declaration", passed: true });
  }

  // 7. File Permissions Declaration Check
  const permissions = parsed.permissions as Record<string, unknown> | undefined;
  if (!permissions) {
    warnings.push("No [permissions] table specified in forge.toml (sandbox defaults apply)");
    checks.push({
      id: "permissions",
      name: "Permission boundary declaration",
      passed: true,
      message: "No explicit permissions (sandbox defaults)",
    });
  } else {
    let permValid = true;
    if (permissions.allowed_paths) {
      if (!Array.isArray(permissions.allowed_paths) || !permissions.allowed_paths.every((p) => typeof p === "string")) {
        errors.push("[permissions].allowed_paths must be string[]");
        permValid = false;
      } else if (permissions.allowed_paths.some((p) => p === "/" || p === "*")) {
        warnings.push("[permissions].allowed_paths contains unconstrained root or wildcard path");
      }
    }
    if (permissions.denied_paths && (!Array.isArray(permissions.denied_paths) || !permissions.denied_paths.every((p) => typeof p === "string"))) {
      errors.push("[permissions].denied_paths must be string[]");
      permValid = false;
    }
    for (const boolKey of ["allow_network", "allow_env", "allow_shell", "allow_exec"] as const) {
      if (permissions[boolKey] !== undefined && typeof permissions[boolKey] !== "boolean") {
        errors.push(`[permissions].${boolKey} must be a boolean`);
        permValid = false;
      }
    }

    const filesToScan = listFilesForScanning(dir);
    if (permissions.denied_paths && Array.isArray(permissions.denied_paths)) {
      for (const file of filesToScan) {
        const rel = relative(dir, file).replace(/\\/g, "/");
        const fileBase = rel.split("/").pop() || "";
        for (const denied of permissions.denied_paths) {
          if (typeof denied !== "string") continue;
          const cleanPattern = denied.replace(/^\.\//, "");
          const matches =
            (cleanPattern.endsWith("*") && (rel.startsWith(cleanPattern.slice(0, -1)) || fileBase.startsWith(cleanPattern.slice(0, -1)))) ||
            (cleanPattern.startsWith("*") && (rel.endsWith(cleanPattern.slice(1)) || fileBase.endsWith(cleanPattern.slice(1)))) ||
            rel === cleanPattern || fileBase === cleanPattern;
          if (matches) {
            errors.push(`Packaged file "${rel}" violates declared [permissions].denied_paths policy ("${denied}")`);
            permValid = false;
          }
        }
      }
    }
    checks.push({
      id: "permissions",
      name: "Permission boundary declaration",
      passed: permValid,
      message: permValid ? undefined : "Invalid permissions specification",
    });
  }

  // 8. Secret Detection
  const filesToScan = listFilesForScanning(dir);
  const detectedSecrets: string[] = [];

  for (const file of filesToScan) {
    let raw: string;
    try {
      raw = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    const rel = relative(dir, file).replace(/\\/g, "/");
    for (const sec of SECRET_PATTERNS) {
      if (sec.pattern.test(raw)) {
        detectedSecrets.push(`${sec.name} detected in ${rel}`);
      }
    }
  }

  if (detectedSecrets.length > 0) {
    for (const s of detectedSecrets) {
      errors.push(`Secret detected: ${s}`);
    }
    checks.push({
      id: "secrets",
      name: "Secret and credential detection",
      passed: false,
      message: `${detectedSecrets.length} hardcoded secret(s) found`,
    });
  } else {
    checks.push({ id: "secrets", name: "Secret and credential detection", passed: true });
  }

  // 9. Security Scan Pass
  const findings = scanPackageDir(dir);
  const counts = countBySeverity(findings);
  if (counts.high > 0) {
    for (const f of findings.filter((x) => x.severity === "high")) {
      errors.push(`Security scan violation [${f.rule}] in ${f.file}: ${f.message}`);
    }
    checks.push({
      id: "security_scan",
      name: "Security vulnerability scan",
      passed: false,
      message: `${counts.high} high-severity finding(s)`,
    });
  } else {
    if (counts.medium > 0) {
      warnings.push(`Security scan found ${counts.medium} medium-severity warning(s)`);
    }
    checks.push({ id: "security_scan", name: "Security vulnerability scan", passed: true });
  }

  // 10. Canonical Entrypoint Check
  let entrypointFound: boolean;
  if (type === "skill") {
    entrypointFound = existsSync(join(dir, "SKILL.md")) || existsSync(join(dir, "src"));
  } else if (type === "agent") {
    entrypointFound = existsSync(join(dir, "agent.md")) || existsSync(join(dir, "src"));
  } else if (type === "mcp") {
    entrypointFound = existsSync(join(dir, "mcp.json")) ||
      existsSync(join(dir, "src/index.ts")) ||
      existsSync(join(dir, "src/index.js")) ||
      Boolean((parsed.mcp as Record<string, unknown> | undefined)?.command);
  } else if (type === "rule") {
    entrypointFound =
      existsSync(join(dir, "rules")) ||
      existsSync(join(dir, "rule.md")) ||
      existsSync(join(dir, "rules.md"));
  } else if (type === "command") {
    entrypointFound = existsSync(join(dir, "command.md")) || existsSync(join(dir, "commands"));
  } else if (type === "instruction") {
    entrypointFound = existsSync(join(dir, "instruction.md")) || existsSync(join(dir, "instructions"));
  } else if (type === "workflow") {
    entrypointFound =
      existsSync(join(dir, "workflow.yaml")) ||
      existsSync(join(dir, "workflow.yml")) ||
      existsSync(join(dir, "workflows")) ||
      existsSync(join(dir, "workflow.md"));
  } else if (type === "prompt") {
    entrypointFound = existsSync(join(dir, "prompt.md")) || existsSync(join(dir, "prompts"));
  } else if (type === "config") {
    entrypointFound =
      existsSync(join(dir, "config.json")) ||
      existsSync(join(dir, "config.yaml")) ||
      existsSync(join(dir, "config.toml"));
  } else {
    // Other types
    entrypointFound = true;
  }

  if (!entrypointFound) {
    errors.push(`Missing canonical entrypoint for package type "${type}"`);
    checks.push({
      id: "entrypoint",
      name: "Canonical payload entrypoint",
      passed: false,
      message: `No entrypoint found for ${type}`,
    });
  } else {
    checks.push({ id: "entrypoint", name: "Canonical payload entrypoint", passed: true });
  }

  const ok = errors.length === 0;
  return {
    ok,
    dir,
    name,
    version,
    type,
    checks,
    errors,
    warnings,
  };
}

export async function runValidate(
  dirArg?: string,
  opts: { json?: boolean } = {},
): Promise<ValidationResult> {
  const dir = dirArg ? resolve(dirArg) : process.cwd();
  const result = validatePackage(dir);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return result;
  }

  console.log(`[forge] validating ${result.name}@${result.version} [${result.type}] at ${dir}...\n`);

  for (const check of result.checks) {
    const symbol = check.passed ? "✓" : "✗";
    const status = check.passed ? "PASS" : "FAIL";
    const detail = check.message ? ` — ${check.message}` : "";
    console.log(`  ${symbol} [${status}] ${check.name}${detail}`);
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings:`);
    for (const w of result.warnings) {
      console.log(`  ! ${w}`);
    }
  }

  if (!result.ok) {
    console.log(`\n[forge] ✗ Validation FAILED (${result.errors.length} error(s)):`);
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`\n[forge] ✓ Validation PASSED — package is ready to pack and publish.`);
  return result;
}
