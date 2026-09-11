// cli/src/commands/create.ts — Canonical package scaffolding for Forge packages.

import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, basename } from "path";
import { PACKAGE_TYPES, type PackageType, DEP_NAME_RE } from "../core/project.js";

export interface CreatePackageOptions {
  type?: string;
  author?: string;
  description?: string;
  license?: string;
  force?: boolean;
  cwd?: string;
}

export interface CreatePackageResult {
  dir: string;
  name: string;
  type: PackageType;
  files: string[];
}

function normalizePackageName(raw: string): { normalized: string; dirName: string; shortName: string } {
  const trimmed = raw.trim().toLowerCase().replace(/\\/g, "/");
  let normalized: string;
  let dirName: string;

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length !== 2) {
      throw new Error(`Invalid package name "${raw}". Expected format: scope/name or name`);
    }
    normalized = `${parts[0]}/${parts[1]}`;
    dirName = parts[1];
  } else {
    // If single name, use community scope or name
    normalized = `community/${trimmed}`;
    dirName = trimmed;
  }

  if (!DEP_NAME_RE.test(normalized)) {
    throw new Error(`Invalid package name "${normalized}". Must match lowercase letters, digits, and hyphens (e.g. org/pkg-name)`);
  }

  const shortName = normalized.split("/")[1];
  return { normalized, dirName, shortName };
}

function getMitLicense(author: string): string {
  const year = new Date().getFullYear();
  return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function getChangelog(name: string, type: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - ${date}

### Added
- Initial scaffold of ${name} as a Forge ${type} package.
`;
}

function getTestTemplate(name: string, type: string): string {
  return `// Automated test verifying Forge package structure
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("${name} package integrity", () => {
  it("has a valid forge.toml manifest", () => {
    const tomlPath = join(process.cwd(), "forge.toml");
    assert.ok(existsSync(tomlPath), "forge.toml must exist");
    const content = readFileSync(tomlPath, "utf-8");
    assert.ok(content.includes('name = "${name}"'), "package name must match");
    assert.ok(content.includes('type = "${type}"'), "package type must match");
  });

  it("has required documentation and license", () => {
    assert.ok(existsSync(join(process.cwd(), "README.md")), "README.md must exist");
    assert.ok(existsSync(join(process.cwd(), "LICENSE")), "LICENSE must exist");
    assert.ok(existsSync(join(process.cwd(), "CHANGELOG.md")), "CHANGELOG.md must exist");
  });
});
`;
}

export async function createPackage(
  nameArg: string,
  opts: CreatePackageOptions = {},
): Promise<CreatePackageResult> {
  const { normalized: name, dirName, shortName } = normalizePackageName(nameArg);
  const typeStr = (opts.type ?? "skill").toLowerCase();
  if (!PACKAGE_TYPES.includes(typeStr as PackageType)) {
    throw new Error(
      `Unknown package type "${typeStr}". Supported types: ${PACKAGE_TYPES.join(", ")}`,
    );
  }
  const type = typeStr as PackageType;

  const baseCwd = resolve(opts.cwd ?? process.cwd());
  const targetDir = basename(baseCwd) === dirName ? baseCwd : join(baseCwd, dirName);

  if (existsSync(join(targetDir, "forge.toml")) && !opts.force) {
    throw new Error(
      `Package manifest already exists in ${targetDir}. Use --force to overwrite.`,
    );
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const author = opts.author || process.env.FORGE_AUTHOR || "Forge Developer";
  const license = opts.license || "MIT";
  const desc = opts.description || `Forge ${type} package for ${shortName}`;

  const filesWritten: string[] = [];

  function writeFile(relPath: string, content: string): void {
    const absPath = join(targetDir, relPath);
    const parentDir = join(targetDir, ...relPath.split("/").slice(0, -1));
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    writeFileSync(absPath, content, "utf-8");
    filesWritten.push(relPath);
  }

  // 1. forge.toml
  let typeSection = "";
  if (type === "skill") {
    typeSection = `\n[skill]\nname = "${shortName}"\ninvocation = "/${shortName}"\nallowed-tools = ["Read", "Write", "Bash"]\n`;
  } else if (type === "agent") {
    typeSection = `\n[agent]\nmodel = "claude-sonnet-4"\nsystem_prompt = "agent.md"\ntools = ["Read", "Write", "Bash"]\n`;
  } else if (type === "mcp") {
    typeSection = `\n[mcp]\ncommand = "node"\nargs = ["./dist/index.js"]\nenv = {}\n`;
  } else if (type === "rule") {
    typeSection = `\n[rule]\nseverity = "error"\ntargets = ["**/*"]\n`;
  } else if (type === "command") {
    typeSection = `\n[command]\nname = "${shortName}"\ninvocation = "/${shortName}"\n`;
  } else if (type === "instruction") {
    typeSection = `\n[instruction]\ntargets = ["**/*"]\n`;
  } else if (type === "workflow") {
    typeSection = `\n[workflow]\nentrypoint = "workflow.yaml"\n`;
  } else if (type === "prompt") {
    typeSection = `\n[prompt]\ntemplate = "prompt.md"\n`;
  } else if (type === "config") {
    typeSection = `\n[config]\nschema = "config.json"\n`;
  }

  const forgeToml = `[package]
name = "${name}"
version = "0.1.0"
type = "${type}"
description = "${desc}"
license = "${license}"
author = "${author}"
tier = "community"

[compatibility]
harnesses = ["claude-code", "cursor", "codex", "windsurf", "opencode"]

[permissions]
allowed_paths = ["./"]
denied_paths = [".env*", "id_rsa*", "./secrets"]
allow_network = ${type === "mcp" ? "true" : "false"}
${typeSection}`;

  writeFile("forge.toml", forgeToml);

  // 2. README.md
  const readme = `# ${name}

[![Forge Package](https://img.shields.io/badge/forge-${type}-blue.svg)](https://github.com/oomerevren-beep/forge)
[![License: ${license}](https://img.shields.io/badge/License-${license}-green.svg)](LICENSE)

${desc}

## Installation

Install using Forge:

\`\`\`bash
forge add ${name}
\`\`\`

## Usage

This is a **${type}** package. Load this package into your AI agent environment to extend context and capabilities.

## Permissions

Declared permission boundaries:
- \`allowed_paths\`: \`["./"]\`
- \`denied_paths\`: \`[".env*", "id_rsa*", "./secrets"]\`
- \`allow_network\`: \`${type === "mcp" ? "true" : "false"}\`

## Development & Testing

Run verification tests:

\`\`\`bash
forge validate .
forge pack .
\`\`\`
`;
  writeFile("README.md", readme);

  // 3. LICENSE
  writeFile("LICENSE", getMitLicense(author));

  // 4. CHANGELOG.md
  writeFile("CHANGELOG.md", getChangelog(name, type));

  // 5. Canonical type-specific entrypoint
  if (type === "skill") {
    writeFile(
      "SKILL.md",
      `# ${shortName} Skill

Describe what this skill enables the agent to do.

## Instructions

1. Identify when the user requires this capability.
2. Execute the procedure step-by-step.
3. Validate output before responding.

## Examples

\`\`\`markdown
User: Run /${shortName}
Agent: Executing skill ${shortName}...
\`\`\`
`,
    );
  } else if (type === "agent") {
    writeFile(
      "agent.md",
      `# ${shortName} Agent Persona

You are an expert AI subagent specialized in ${shortName}.

## Responsibilities
- Execute domain-specific tasks with high precision.
- Follow test-driven development and fail-closed security.
- Maintain transparent reasoning and structured outputs.
`,
    );
  } else if (type === "mcp") {
    writeFile(
      "src/index.ts",
      `#!/usr/bin/env node
// ${name} — Model Context Protocol Server

console.log("[mcp] ${shortName} server initialized");
`,
    );
    writeFile(
      "mcp.json",
      JSON.stringify(
        {
          mcpServers: {
            [shortName]: {
              command: "node",
              args: ["./dist/index.js"],
            },
          },
        },
        null,
        2,
      ) + "\n",
    );
  } else if (type === "rule") {
    writeFile(
      "rules/main.md",
      `# Rules for ${shortName}

- Rule 1: Never commit unencrypted secrets or credentials.
- Rule 2: Follow strict type checking and fail-closed error handling.
- Rule 3: Maintain 100% test coverage for critical paths.
`,
    );
  } else if (type === "command") {
    writeFile(
      "command.md",
      `# /${shortName} Command

Triggered when the user invokes /${shortName}.
`,
    );
  } else if (type === "instruction") {
    writeFile(
      "instruction.md",
      `# Instructions: ${shortName}

Context instructions applied across harnesses.
`,
    );
  } else if (type === "workflow") {
    writeFile(
      "workflow.yaml",
      `name: ${shortName}
steps:
  - name: step-1
    action: validate
  - name: step-2
    action: execute
`,
    );
  } else if (type === "prompt") {
    writeFile(
      "prompt.md",
      `# Prompt Template: ${shortName}

You are an expert assistant. Task: {{task}}
`,
    );
  } else if (type === "config") {
    writeFile(
      "config.json",
      JSON.stringify({ name, version: "0.1.0", settings: {} }, null, 2) + "\n",
    );
  }

  // 6. Test template
  writeFile("tests/package.test.js", getTestTemplate(name, type));

  return {
    dir: targetDir,
    name,
    type,
    files: filesWritten,
  };
}

export async function runCreate(
  nameArg: string,
  opts: CreatePackageOptions = {},
): Promise<CreatePackageResult> {
  try {
    const result = await createPackage(nameArg, opts);
    console.log(`[forge] ✓ created package ${result.name} [${result.type}] at ${result.dir}`);
    for (const f of result.files) {
      console.log(`  + ${f}`);
    }
    console.log(`\nNext steps:`);
    console.log(`  1. cd ${result.dir}`);
    console.log(`  2. forge validate .`);
    console.log(`  3. forge publish . --dry-run`);
    return result;
  } catch (e) {
    console.error(`[forge] ${(e as Error).message}`);
    process.exit(1);
  }
}
