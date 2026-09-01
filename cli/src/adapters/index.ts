export interface Adapter {
  readonly name: string;
  readonly displayName: string;
  detect(): boolean;
  install(pkg: any, srcDir: string): Promise<void>;
  uninstall(pkgName: string): Promise<void>;
  list(): Promise<string[]>;
}

// v0.1 adapters — skeleton
// Implementations: claude.ts, codex.ts, opencode.ts, cursor.ts
// See docs/ADAPTERS.md
