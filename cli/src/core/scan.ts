// cli/src/core/scan.ts — Static security scanner (Phase 3).
//
// AI agents execute third-party skills/prompts, so every package is scanned
// BEFORE install and BY audit afterwards. Three rule families:
//
//   shell-danger  — destructive/remote-code shell in scripts
//                   (rm -rf /, curl|bash, fork bombs, cred theft)
//   prompt-inject — hidden instruction overrides + exfiltration in prompts
//                   (ignore-previous, send secrets to http, embedded keys)
//   perm-violation — package content touching project [permissions].denied_paths
//
// Severity: high blocks installs (fail-closed, exit 1); medium/low warn.
// Scanners are regex-based, dependency-free, and deterministic.

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname, basename } from "path";
import type { ProjectPermissions } from "./project.js";

export type Severity = "high" | "medium" | "low";

export interface ScanFinding {
  rule: string;
  family: "shell-danger" | "prompt-inject" | "perm-violation";
  severity: Severity;
  file: string;
  line: number;
  match: string;
  message: string;
}

interface Rule {
  id: string;
  family: ScanFinding["family"];
  severity: Severity;
  pattern: RegExp;
  message: string;
  /** File extensions this rule applies to (lowercase, with dot). Empty = all text files. */
  exts: string[];
}

const PROMPT_EXTS = [".md", ".mdc", ".txt", ".json", ".yaml", ".yml", ".toml"];

const RULES: Rule[] = [
  // --- shell-danger (high) ---
  { id: "rm-rf-root", family: "shell-danger", severity: "high", pattern: /\brm\s+(-[a-z]*r[a-z]*f|--recursive\s+--force)\s+\/( |$)/, message: "recursive delete rooted at /", exts: [] },
  { id: "curl-pipe-shell", family: "shell-danger", severity: "high", pattern: /\bcurl\b[^\n|]*\|\s*(bash|sh)(\s|$)/, message: "curl piped into a shell (remote code execution)", exts: [] },
  { id: "wget-pipe-shell", family: "shell-danger", severity: "high", pattern: /\bwget\b[^\n|]*\|\s*(bash|sh)(\s|$)/, message: "wget piped into a shell (remote code execution)", exts: [] },
  { id: "fork-bomb", family: "shell-danger", severity: "high", pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&?\s*\}\s*;?/, message: "shell fork bomb", exts: [] },
  { id: "disk-wipe", family: "shell-danger", severity: "high", pattern: /\b(mkfs|dd\s+[^\n]*of=\/dev\/)/, message: "disk wipe / raw device write", exts: [] },
  { id: "chmod-777-root", family: "shell-danger", severity: "high", pattern: /\bchmod\s+(-R\s+)?777\s+\//, message: "chmod 777 on a system path", exts: [] },
  { id: "reverse-shell", family: "shell-danger", severity: "high", pattern: /\bnc(\.exe)?\s+[^\n]*-e\s+\S|bash\s+-i\s+>&\s*\/dev\/tcp\//, message: "reverse shell", exts: [] },
  { id: "ssh-key-theft", family: "shell-danger", severity: "high", pattern: /\b(cat|type|Get-Content)\s+[^\n]*(id_rsa|id_ed25519|\.ssh\/)/, message: "reads private SSH keys", exts: [] },
  { id: "powershell-encoded", family: "shell-danger", severity: "high", pattern: /powershell[^\n]*-(e(nc(odedcommand)?)?)\b/i, message: "encoded PowerShell payload", exts: [] },
  // --- shell-danger (medium) ---
  { id: "sudo-curl", family: "shell-danger", severity: "medium", pattern: /\bsudo\s+(curl|wget)\b/, message: "privileged download", exts: [] },
  { id: "env-exfil-curl", family: "shell-danger", severity: "medium", pattern: /\bcurl\b[^\n]*\$(?:\{(?:AWS_|GITHUB_|OPENAI_|ANTHROPIC_|API_KEY|TOKEN|SECRET))/, message: "curl sends a secret-looking env var", exts: [] },
  // --- prompt-inject (high) ---
  { id: "ignore-instructions", family: "prompt-inject", severity: "high", pattern: /\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+instructions\b/i, message: "instruction override (prompt injection)", exts: PROMPT_EXTS },
  { id: "system-role-hijack", family: "prompt-inject", severity: "high", pattern: /you are now (a|an|the)\b.{0,80}?(assistant|agent|system|root|admin)/i, message: "role hijack (prompt injection)", exts: PROMPT_EXTS },
  { id: "send-secrets-http", family: "prompt-inject", severity: "high", pattern: /\b(send|post|upload|exfiltrat\w*)\b[^\n]{0,120}?(api[\s_-]?key|secret|token|password|private[\s_-]?key)[^\n]{0,80}?\bhttps?:\/\//i, message: "instructs secret exfiltration over http", exts: PROMPT_EXTS },
  // --- prompt-inject (medium) ---
  { id: "embedded-aws-key", family: "prompt-inject", severity: "medium", pattern: /\bAKIA[0-9A-Z]{16}\b/, message: "embedded AWS access key", exts: [] },
  { id: "embedded-github-token", family: "prompt-inject", severity: "medium", pattern: /\bghp_[a-zA-Z0-9]{20,}\b/, message: "embedded GitHub token", exts: [] },
  { id: "embedded-private-key", family: "prompt-inject", severity: "medium", pattern: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/, message: "embedded private key", exts: [] },
  { id: "read-env-file", family: "prompt-inject", severity: "medium", pattern: /\b(cat|type|Get-Content|read)\s+[^\n]*\.env\b/i, message: "reads .env secrets file", exts: PROMPT_EXTS },
];

const MAX_FILE_BYTES = 512 * 1024;
const SKIP_DIRS = new Set(["node_modules", ".git", ".hg", ".svn", "__pycache__", "dist", "build", ".cache"]);

function listTextFiles(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".forge-")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) listTextFiles(full, out);
    } else if (e.isFile()) {
      try {
        if (statSync(full).size <= MAX_FILE_BYTES) out.push(full);
      } catch {
        /* unreadable — skip */
      }
    }
  }
  return out;
}

function snippet(line: string): string {
  const t = line.trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

/** Scan one package content dir. Deterministic: files sorted, rules ordered. */
export function scanPackageDir(
  dir: string,
  opts: { permissions?: ProjectPermissions } = {},
): ScanFinding[] {
  const findings: ScanFinding[] = [];
  if (!existsSync(dir)) return findings;
  const files = listTextFiles(dir).sort();
  for (const file of files) {
    const rel = relative(dir, file).replace(/\\/g, "/");
    const ext = extname(file).toLowerCase();
    let raw: string;
    try {
      raw = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    if (raw.indexOf("\0") !== -1) continue; // binary
    const lines = raw.split("\n");
    for (const rule of RULES) {
      if (rule.exts.length > 0 && !rule.exts.includes(ext) && basename(file) !== "Dockerfile") continue;
      for (let i = 0; i < lines.length; i++) {
        // reset stateful regexes
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(lines[i])) {
          findings.push({
            rule: rule.id,
            family: rule.family,
            severity: rule.severity,
            file: rel,
            line: i + 1,
            match: snippet(lines[i]),
            message: rule.message,
          });
          break; // one hit per rule per file keeps output stable
        }
      }
    }
  }
  findings.push(...checkPermissions(dir, files, opts.permissions));
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return findings;
}

function globToRegExp(glob: string): RegExp {
  // Minimal glob: * matches any run except /, **/ matches any depth.
  const token = "FORGEGLOBSTAR";
  const esc = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, token)
    .replace(/\*/g, "[^/]*")
    .split(token)
    .join(".*");
  return new RegExp(`(^|/)${esc}$`, "i");
}

/** Flag package content touching project [permissions].denied_paths. */
export function checkPermissions(
  dir: string,
  files: string[],
  permissions?: ProjectPermissions,
): ScanFinding[] {
  const denied = permissions?.denied_paths ?? [];
  if (denied.length === 0) return [];
  const patterns = denied.map(globToRegExp);
  const out: ScanFinding[] = [];
  for (const file of files) {
    const rel = relative(dir, file).replace(/\\/g, "/");
    const base = basename(file);
    if (patterns.some((p) => p.test(rel) || p.test(base))) {
      out.push({
        rule: "denied-path-content",
        family: "perm-violation",
        severity: "high",
        file: rel,
        line: 0,
        match: rel,
        message: `package ships content matching project denied_paths (${rel})`,
      });
    }
  }
  return out;
}

export function countBySeverity(findings: ScanFinding[]): { high: number; medium: number; low: number } {
  const out = { high: 0, medium: 0, low: 0 };
  for (const f of findings) out[f.severity]++;
  return out;
}
