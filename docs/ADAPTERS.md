# Forge — Adapters

Each harness expects packages in a different place, in a different format. The adapter hides that difference.

## Support Matrix (v0.2 — Epoch 1b, 7 harnesses x 6 types)

| Harness | Skill | MCP | Plugin | Agent | Command | Hook | Detection |
|---------|-------|-----|--------|-------|---------|------|-------------|
| claude-code | `~/.claude/skills/<name>/` | `~/.claude/settings.json` | `~/.claude/skills/<name>/` | `~/.claude/skills/<name>/` | `~/.claude/skills/<name>/` | `~/.claude/skills/<name>/` | `~/.claude/` exists? |
| codex | `~/.codex/skills/<name>/` | `~/.codex/mcp.json` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/skills/<name>/` | `~/.codex/` exists? |
| opencode | `.opencode/skills/<name>/` | `opencode.json` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `.opencode/skills/<name>/` | `opencode.json` exists? |
| cursor | `.cursor/skills/<name>/` | `.cursor/mcp.json` | `.cursor/skills/<name>/` | `.cursor/skills/<name>/` | `.cursor/skills/<name>/` | `.cursor/skills/<name>/` | `.cursor/` exists? |
| dsh | `~/.dsh/skills/<name>/` | `~/.dsh/mcp.json` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/skills/<name>/` | `~/.dsh/` exists? |
| windsurf | `~/.windsurf/skills/<name>/` | `mcp_config.json` | `~/.windsurf/skills/<name>/` | `~/.windsurf/skills/<name>/` | `~/.windsurf/skills/<name>/` | `~/.windsurf/skills/<name>/` | `.windsurf/` exists? |
| generic | `./.forge/packages/<name>/` | `./.forge/mcp.json` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | `./.forge/packages/<name>/` | fallback (always) |

Note: since Phase 11, all 6 types install into each harness's skills area (single source, `forge list` stays consistent).
Code: `cli/src/adapters/<name>.ts` — 1 file = 1 harness, re-exported from `index.ts`.

## Adapter Interface (TypeScript)

```typescript
export interface Adapter {
  readonly name: string;
  readonly displayName: string;

  detect(): boolean;
  // Package install
  install(pkg: PackageMeta, srcDir: string): Promise<void>;
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

1. Create `adapters/<name>.ts`, implement `Adapter`
2. Add it to `adapters/index.ts`
3. Test with `forge doctor`
4. Open a PR

1 file = 1 harness. Easy to extend.
