#!/usr/bin/env tsx
// scripts/verify-npm-mcps.ts — verify MCP entries against real upstream npm tarballs.
// Per package: npm metadata -> dist.tarball download -> sha256 compute -> pin into JSON + verified:true.
// Fail-closed: any failing step skips that package (placeholder preserved).
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";

const MAP: Array<{ slug: string; npm: string }> = [
  { slug: "mcp-postgres", npm: "@modelcontextprotocol/server-postgres" },
  { slug: "mcp-sequential-thinking", npm: "@modelcontextprotocol/server-sequential-thinking" },
];

type NpmMeta = {
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, { dist?: { tarball?: string } }>;
  time?: Record<string, string>;
};

async function main(): Promise<void> {
  let ok = 0;
  for (const { slug, npm } of MAP) {
    const path = `registry/packages/${slug}.json`;
    try {
      const metaRes = await fetch(`https://registry.npmjs.org/${encodeURIComponent(npm)}`);
      if (!metaRes.ok) throw new Error(`metadata HTTP ${metaRes.status}`);
      const meta = (await metaRes.json()) as NpmMeta;
      const version: string | undefined = meta["dist-tags"]?.latest;
      if (!version || !meta.versions?.[version]?.dist?.tarball) throw new Error("no latest dist");
      const tarball: string | undefined = meta.versions[version].dist?.tarball;
      if (!tarball) throw new Error("no latest dist");
      const publishedAt: string = meta.time?.[version] ?? new Date().toISOString();

      const dl = await fetch(tarball);
      if (!dl.ok) throw new Error(`tarball HTTP ${dl.status}`);
      const buf = Buffer.from(await dl.arrayBuffer());
      if (buf.length > 50 * 1024 * 1024) throw new Error(`tarball too big (${buf.length})`);
      const sha256 = createHash("sha256").update(buf).digest("hex");

      const detail = JSON.parse(readFileSync(path, "utf-8"));
      const oldMeta = detail.versions[detail.latest] ?? {};
      detail.versions = {
        [version]: {
          version,
          tarball,
          sha256,
          verified: true,
          engines: oldMeta.engines ?? { "*": "*" },
          dependencies: oldMeta.dependencies ?? {},
          ...(oldMeta.mcp ? { mcp: oldMeta.mcp } : {}),
          publishedAt,
        },
      };
      detail.latest = version;
      detail.repository = `https://www.npmjs.com/package/${npm}`;
      writeFileSync(path, JSON.stringify(detail, null, 2) + "\n");
      console.log(`[verify] OK ${detail.name}@${version} sha256=${sha256.slice(0, 12)}... (${buf.length}B)`);
      ok++;
    } catch (e) {
      console.log(`[verify] SKIP ${slug}: ${(e as Error).message}`);
    }
  }
  console.log(`[verify] done: ${ok}/${MAP.length} verified`);
  if (ok === 0) process.exit(1);
}

main();
