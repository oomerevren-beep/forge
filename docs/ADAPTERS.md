# Forge — Adapters

Each harness expects packages in a different place, in a different format. The adapter hides that difference.

One file per harness (`cli/src/adapters/<name>.ts`), shared mechanics in
`cli/src/adapters/base.ts` (project-or-home scope resolution, list/isInstalled
loops, rule-file sync) and `cli/src/adapters/agents-md.ts` (shared AGENTS.md
blocks for OpenCode/Codex/DSH). Non-destructive text merging lives in
`cli/src/core/merge.ts`: forge-owned sections are wrapped in
`<!-- FORGE:START id="..." version="..." -->` / `<!-- FORGE:END ... -->`
markers — user content outside markers is byte-preserved, reinstalls replace
only the block, uninstall removes only the block.

Test hook: `FORGE_TEST_HOME` redirects home-dir resolution so tests never
touch the real `~/.cursor`, `~/.claude`, etc.

## Support Matrix (v0.2 — 7 harnesses x 6 types + 2026 rule formats)

| Harness | Skill | MCP | Plugin | Agent | Command | Hook | Detection | Rules |
|---------|-------|-----|--------|-------|---------|------|-------------|-------|
| claude-code | `~/.claude/skills/<name>/` | `~/.claude.json` | `~/.claude/skills/<name>/` | `~/.claude/agents/<name>/` | `~/.claude/skills/<name>/` | `~/.claude/skills/<name>/` | `~/.claude/` exists? | `<project>/CLAUDE.md` (merged block) |
| codex | `~/.codex/skills/<name>/` | `~/.codex/mcp.json` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/` exists? | `<project>/AGENTS.md` (merged block) |
| opencode | `.opencode/skills/<name>/` | `opencode.json` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `opencode.json` exists? | `<project>/AGENTS.md` (merged block) |
| cursor | `<scope>/skills/<name>/` (legacy) | `<scope>/mcp.json` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `.cursor/` exists? | `<scope>/rules/<name>.mdc` (frontmatter) |
| dsh | `~/.dsh/skills/<name>/` | `~/.dsh/mcp.json` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/` exists? | `<project>/AGENTS.md` (merged block) |
| windsurf | `<scope>/skills/<name>/` | `<scope>/mcp_config.json` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `<scope>/skills/<name>/` | `.windsurf/` exists? | `<project>/.windsurfrules` (merged block) |
| generic | `./.forge/packages/<name>/` | `./.forge/mcp.json` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | fallback (always) | — |

Note: since Phase 11, all 6 types install into each harness's skills area (single source, `forge list` stays consistent).
Code: `cli/src/adapters/<name>.ts` — 1 file = 1 harness, re-exported from `index.ts`.

## Adapter Interface (TypeScript)

```typescript
export interface Adapter {
  readonly name: string;
  readonly displayName: string;

  detect(): boolean;
  // Package install (meta carries version/description for rule-file sync)
  install(pkg: string, srcDir: string, type: string, meta?: PackageMeta): Promise<void>;
  uninstall(pkgName: string): Promise<void>;
  list(): Promise<string[]>;
  isInstalled(pkgName: string): Promise<boolean>;

  // MCP-specific
  mcpConfigPath(): string | null;
  addMcpServer(name: string, config: McpConfig): Promise<void>;
  removeMcpServer(name: string): Promise<void>;
}
```

## Example: Claude Adapter

```typescript
export const claudeAdapter: Adapter = {
  name: "claude-code",
  displayName: "Claude Code",
  detect: () => existsSync(join(homedir(), ".claude")),
  mcpConfigPath: () => join(homedir(), ".claude", "settings.json"),
  async install(pkg, srcDir) {
    if (pkg.type === "skill") {
      const dest = join(homedir(), ".claude", "skills", pkg.slug);
      await copy(srcDir, dest);
    }
    if (pkg.type === "mcp") {
      await addMcpServer(pkg.name, pkg.mcp);
    }
  },
  // ...
};
```

## Install Strategy

- **Preferred:** Symlink (`~/.forge/packages/<name>` -> `~/.claude/skills/<name>`) — easy updates, single source
- **Fallback:** Copy (no Windows symlink privilege)
- **Project level:** also copy into project folders like `.opencode/skills/` (when detected)

## Doctor Command & Diagnostics (Phase P1)

`forge doctor` provides comprehensive diagnostics across your system, environment, and adapters:

- **Node.js runtime**: Verifies version (>= 18.0.0 required)
- **Host OS & Arch**: Verifies environment support
- **Configuration**: Validates `~/.forge/config.toml` and project `forge.toml`
- **Lockfile integrity**: Validates `forge.lock` pinned hashes
- **Writable directories**: Checks permissions for `~/.forge`, packages, and cache
- **Adapter health**: Detects all harnesses (Claude Code, Cursor, Windsurf, OpenCode, Codex, DSH, Generic), checks package counts and validates MCP configurations
- **Registry**: Tests accessibility and index parsing
- **Broken links**: Detects missing directories or MCP entries with optional `--fix`
- **Machine-readable JSON**: Pass `--json` for automation and CI/CD integration

```bash
$ forge doctor
[forge] doctor — System & Harness Diagnostics

  ✓ Node.js runtime          Node.js v22.12.0 (>= 18.0.0 required)
  ✓ Operating System         win32 (x64)
  ✓ Global Configuration     Valid (~/.forge/config.toml)
  ✓ Project Manifest         Valid forge.toml (3 dep(s))
  ✓ Lockfile Integrity       forge.lock verified (3 package(s) pinned)
  ✓ Writable Directories     ~/.forge, packages, cache, cwd all writable
  ✓ Registry Accessibility   Accessible (250 packages available)
  ✓ Adapters                 5/7 harness(es) detected

Harnesses:
  ✓ Claude Code      (3 package(s))
  ✓ Cursor           (3 package(s))
  ✓ Windsurf         (2 package(s))
```

## Adding a New Harness

1. Create `cli/src/adapters/<name>.ts`, implement `Adapter` (reuse `base.ts`
   helpers: `sharedInstall`/`sharedUninstall`/`sharedList`/`sharedIsInstalled`)
2. Add it to `cli/src/adapters/index.ts` (`allAdapters`)
3. Add rule sync if the harness reads project rule files (see `agents-md.ts`)
4. Test with `forge doctor` + `tests/adapters-matrix.test.ts`
5. Open a PR

1 file = 1 harness. Easy to extend.
