import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";

export function forgeHome(): string {
  return join(homedir(), ".forge");
}

export function packagesDir(): string {
  return join(forgeHome(), "packages");
}

export function cacheDir(): string {
  return join(forgeHome(), "cache");
}

export function tarballsDir(): string {
  return join(cacheDir(), "tarballs");
}

export function linksFile(): string {
  return join(forgeHome(), "links.json");
}

export interface LinkRecord {
  pkg: string;
  version: string;
  slug: string;
  type?: string;
  adapters: string[];
  installedAt: string;
}

export function ensureForgeDirs(): void {
  for (const dir of [forgeHome(), packagesDir(), cacheDir(), tarballsDir()]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(linksFile())) {
    writeFileSync(linksFile(), JSON.stringify({}, null, 2));
  }
}

export function readLinks(): Record<string, LinkRecord> {
  ensureForgeDirs();
  try {
    return JSON.parse(readFileSync(linksFile(), "utf-8"));
  } catch {
    return {};
  }
}

export function writeLinks(links: Record<string, LinkRecord>): void {
  ensureForgeDirs();
  writeFileSync(linksFile(), JSON.stringify(links, null, 2));
}

export function packageDir(slug: string, version: string): string {
  return join(packagesDir(), `${slug}@${version}`);
}

export function isPackageInstalled(slug: string, version: string): boolean {
  return existsSync(packageDir(slug, version));
}

export function listInstalledPackages(): { slug: string; version: string; dir: string }[] {
  ensureForgeDirs();
  if (!existsSync(packagesDir())) return [];
  const entries = readdirSync(packagesDir(), { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const at = e.name.lastIndexOf("@");
      if (at === -1) return null;
      return { slug: e.name.slice(0, at), version: e.name.slice(at + 1), dir: join(packagesDir(), e.name) };
    })
    .filter(Boolean) as { slug: string; version: string; dir: string }[];
}

export function toSlug(pkg: string): string {
  return pkg.replace("/", "-");
}

export function fromSlug(slug: string): string {
  // anthropics-plan -> anthropics/plan (first dash is slash)
  const idx = slug.indexOf("-");
  if (idx === -1) return slug;
  return slug.slice(0, idx) + "/" + slug.slice(idx + 1);
}
