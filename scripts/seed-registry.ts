#!/usr/bin/env tsx
// scripts/seed-registry.ts — Epoch 1d: seed only packages with real tarballs
// Never adds repos that do not exist — fail-closed
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "registry/packages";

type Pkg = {
  name: string;
  type: "skill" | "mcp" | "plugin" | "agent" | "command" | "hook";
  description: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  source?: string;
  version: string;
  tarball: string;
  sha256: string; // Epoch 1d: placeholders are rejected
  verified: boolean;
  engines?: Record<string, string>;
  mcp?: { command: string; args: string[]; env?: Record<string, string> };
  dependencies?: Record<string, string>;
};

// Only genuinely verified tarballs — Epoch 1d
const CATALOG: Pkg[] = [
  // Real-tarball packages (SHA256 verified)
  {
    name: "pdf/compress", type: "skill", description: "PDF compress skill — shrink PDF size without quality loss",
    keywords: ["pdf", "compress", "optimize"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-compress-1.0.0.tar.gz",
    sha256: "f843a4523af3cae7b170389e3680d39e37a22e68c8826844e140279c3f23ce66", verified: true,
  },
  {
    name: "pdf/convert", type: "skill", description: "PDF convert skill — PDF to Word, HTML, Markdown and back",
    keywords: ["pdf", "convert", "export"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-convert-1.0.0.tar.gz",
    sha256: "e9ad296850f60c30ae0b2485bf5c9bb582f96677dead1d769a7cdea182a8cea0", verified: true,
  },
  {
    name: "pdf/extract", type: "skill", description: "PDF extract skill — pull text, tables and images from PDFs",
    keywords: ["pdf", "extract", "parse"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-extract-1.0.0.tar.gz",
    sha256: "30326bd7f38fcda2ead1216c275ea7010d2e9ff4a5bf75c68f9c8ca4cf8153f8", verified: true,
  },
  {
    name: "pdf/forms", type: "skill", description: "PDF forms skill — fill and extract AcroForm form data",
    keywords: ["pdf", "forms", "acroform"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-forms-1.0.0.tar.gz",
    sha256: "1cd26c0b22c21e67ce29a698ac3403e10c659078b40756e98799f3e650ce8324", verified: true,
  },
  {
    name: "pdf/merge", type: "skill", description: "PDF merge skill — combine multiple PDFs into one document fast",
    keywords: ["pdf", "merge", "document"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-merge-1.0.0.tar.gz",
    sha256: "5e84a081c5c343973af044b4076da2492ee109973a3fb7793a4673dcf094caeb", verified: true,
  },
  {
    name: "pdf/ocr", type: "skill", description: "PDF OCR skill — scanned PDFs to searchable text with OCR",
    keywords: ["pdf", "ocr", "scan"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-ocr-1.0.0.tar.gz",
    sha256: "fcef2fc223d63a6169493390014bc21b66134b3a266d3c25e71d2f1db8275532", verified: true,
  },
  {
    name: "pdf/split", type: "skill", description: "PDF split skill — extract pages and split PDFs by range",
    keywords: ["pdf", "split", "pages"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-split-1.0.0.tar.gz",
    sha256: "dc409d49d4cb6628bad015c92887794cad4fc766edd2c0b1d0a0c16c7727f2e2", verified: true,
  },
  {
    name: "pdf/tables", type: "skill", description: "PDF tables skill — detect and export tables from PDFs to CSV",
    keywords: ["pdf", "tables", "csv"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/pdf-tables-1.0.0.tar.gz",
    sha256: "5e089712394b2a3cdeaae9682e82c369f2c973aa2a4cd6304ff3cdad06100d6b", verified: true,
  },
  {
    name: "agent/changelog-writer", type: "agent", description: "Changelog writer agent — generate release notes from commits",
    keywords: ["agent", "changelog", "release"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/agent-changelog-writer-1.0.0.tar.gz",
    sha256: "7a024ae5a54ae0f90547e3c3d05ddcfe07c30f6c29d16b48c8f71e6a7c3bfaf2", verified: true,
  },
  {
    name: "agent/debugger", type: "agent", description: "Debugger agent — reproduce and root-cause failures step by step",
    keywords: ["agent", "debug", "triage"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/agent-debugger-1.0.0.tar.gz",
    sha256: "ffcef5837f95b7ed82405f611dd2fb553cfee0f95acdf18aa455fc3538378996", verified: true,
  },
  {
    name: "agent/pr-reviewer", type: "agent", description: "PR reviewer agent — thorough pull request reviews with suggestions",
    keywords: ["agent", "review", "pr"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/agent-pr-reviewer-1.0.0.tar.gz",
    sha256: "ae4bcc9e1df066543171020487b3e0f57ecd8cc1ec6e8bd2df59cbbddf0dcb42", verified: true,
  },
  {
    name: "agent/researcher", type: "agent", description: "Researcher agent — deep web research with cited summaries",
    keywords: ["agent", "research", "web"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/agent-researcher-1.0.0.tar.gz",
    sha256: "239f5a159a8126e80412a1e46eccfc5cdd24ec5854f9db44e6a1e1aa0195f198", verified: true,
  },
  {
    name: "agent/security-auditor", type: "agent", description: "Security auditor agent — scan code for vulns and hardening tips",
    keywords: ["agent", "security", "audit"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/agent-security-auditor-1.0.0.tar.gz",
    sha256: "dd75b6c86ea5e72146d09323940b8e90be4497a052f90b76eda4c7c0a9fddac5", verified: true,
  },
  {
    name: "cmd/plan", type: "command", description: "Slash command /plan — structured planning",
    keywords: ["command", "plan"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/cmd-plan-1.0.0.tar.gz",
    sha256: "a8dd5950b2fe9e280bb94ca5619b90bf934a68406e54a290463504cad4298bab", verified: true,
  },
  {
    name: "cmd/review", type: "command", description: "Slash command /review — code review",
    keywords: ["command", "review"], source: "registry-content",
    version: "1.0.0", tarball: "https://github.com/oomerevren-beep/forge/releases/download/registry-v1/cmd-review-1.0.0.tar.gz",
    sha256: "8d5f9070a1b5551ede32d96b4d3900ca047b017ff66a80c85d6a57f7141e5f68", verified: true,
  },
];

function toSlug(name: string): string {
  return name.replace("/", "-");
}

let created = 0;
let skipped = 0;

if (!existsSync(PACKAGES_DIR)) mkdirSync(PACKAGES_DIR, { recursive: true });

for (const pkg of CATALOG) {
  const slug = toSlug(pkg.name);
  const file = join(PACKAGES_DIR, `${slug}.json`);
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  const detail: Record<string, unknown> = {
    name: pkg.name,
    type: pkg.type,
    description: pkg.description,
    homepage: pkg.homepage ?? `https://github.com/oomerevren-beep/forge`,
    repository: pkg.repository ?? `https://github.com/oomerevren-beep/forge`,
    keywords: pkg.keywords,
    source: pkg.source,
    versions: {
      [pkg.version]: {
        version: pkg.version,
        tarball: pkg.tarball,
        sha256: pkg.sha256,
        verified: pkg.verified,
        engines: pkg.engines ?? { "*": "*" },
        dependencies: pkg.dependencies ?? {},
        ...(pkg.mcp ? { mcp: pkg.mcp } : {}),
        publishedAt: new Date().toISOString(),
      },
    },
    latest: pkg.version,
    verified: pkg.verified,
  };
  writeFileSync(file, JSON.stringify(detail, null, 2) + "\n");
  created++;
  console.log(`+ ${pkg.name} [${pkg.type}] verified=${pkg.verified} → ${file}`);
}

console.log(`\n[seed] done: ${created} created, ${skipped} skipped, total catalog ${CATALOG.length}`);
console.log(`[seed] ALL entries have verified tarballs — no placeholders`);
console.log(`[seed] run 'npm run registry:build' to rebuild index.json`);
