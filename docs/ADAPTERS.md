# Forge — Adapters

Her harness farkli yerde, farkli formatta paket bekler. Adapter bu farki gizler.

## Destek Matrisi (v0.1)

| Harness | Skill | MCP | Plugin | Agent | Tespit Yolu |
|---------|-------|-----|--------|-------|-------------|
| claude-code | `~/.claude/skills/<name>/` | `~/.claude/settings.json` | - | `~/.claude/agents/` | `~/.claude/` var mi |
| codex | `~/.codex/skills/<name>/` | `~/.codex/mcp.json` | - | `~/.codex/agents/` | `codex --version` |
| opencode | `.opencode/skills/<name>/` | `opencode.json` | `.opencode/plugins/` | `.opencode/agents/` | `opencode.json` var mi |
| cursor | `.cursor/skills/<name>/` | `.cursor/mcp.json` | - | `.cursor/agents/` | `.cursor/` var mi |
| dsh | `~/.dsh/plugins/<name>/` | `~/.dsh/mcp.json` | `~/.dsh/plugins/` | - | `dsh --version` |
| generic | `./.forge/packages/<name>/` | `./.forge/mcp.json` | - | - | fallback |

## Adapter Interface (TypeScript)

```typescript
export interface Adapter {
  readonly name: string;
  readonly displayName: string;

  detect(): boolean;
  // Paket kurulumu
  install(pkg: PackageMeta, srcDir: string): Promise<void>;
  uninstall(pkgName: string): Promise<void>;
  list(): Promise<string[]>;
  isInstalled(pkgName: string): Promise<boolean>;

  // MCP ozel
  mcpConfigPath(): string | null;
  addMcpServer(name: string, config: McpConfig): Promise<void>;
  removeMcpServer(name: string): Promise<void>;
}
```

## Ornek: Claude Adapter

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

## Kurulum Stratejisi

- **Tercih:** Symlink (`~/.forge/packages/<name>` -> `~/.claude/skills/<name>`) — guncelleme kolay, tek kaynak
- **Fallback:** Copy (Windows symlink yetkisi yoksa)
- **Proje seviyesi:** `.opencode/skills/` gibi proje klasorlerine de kopyala (detect edilirse)

## Doctor Komutu

`forge doctor` her adapter icin:

- Harness kurulu mu?
- Versiyon ne?
- Kurulu paketler neler?
- Bozuk paket var mi? (eksik SKILL.md, hatali mcp.json)

```
$ forge doctor
✓ claude-code  1.2.3  (~/.claude) — 12 packages
✓ opencode     0.8.1  (./opencode.json) — 8 packages
✗ cursor       not found
✓ codex        0.3.0  (~/.codex) — 3 packages
```

## Yeni Harness Eklemek

1. `adapters/<name>.ts` olustur, `Adapter` implemente et
2. `adapters/index.ts`'e ekle
3. `forge doctor` ile test et
4. PR ac

1 dosya = 1 harness. Kolay genisler.
