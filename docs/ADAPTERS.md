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

## Doctor Command

`forge doctor` checks per adapter:

- Is the harness installed?
- Which version?
- Which packages are installed?
- Any broken packages? (missing SKILL.md, invalid mcp.json)

```
$ forge doctor
✓ claude-code  1.2.3  (~/.claude) — 12 packages
✓ opencode     0.8.1  (./opencode.json) — 8 packages
✗ cursor       not found
✓ codex        0.3.0  (~/.codex) — 3 packages
```

## Adding a New Harness

1. Create `cli/src/adapters/<name>.ts`, implement `Adapter` (reuse `base.ts`
   helpers: `sharedInstall`/`sharedUninstall`/`sharedList`/`sharedIsInstalled`)
2. Add it to `cli/src/adapters/index.ts` (`allAdapters`)
3. Add rule sync if the harness reads project rule files (see `agents-md.ts`)
4. Test with `forge doctor` + `tests/adapters-matrix.test.ts`
5. Open a PR

1 file = 1 harness. Easy to extend.
