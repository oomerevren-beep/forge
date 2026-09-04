#!/usr/bin/env tsx
// scripts/build-registry.ts — packages/*.json → index.json + search.json + stats.json
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PACKAGES_DIR = "registry/packages";
const INDEX_FILE = "registry/index.json";
const SEARCH_FILE = "registry/search.json";
const STATS_FILE = "registry/stats.json";

type PackageDetail = {
  name: string;
  type: string;
  description: string;
  keywords?: string[];
  latest: string;
  versions: Record<string, { publishedAt?: string; sha256?: string; verified?: boolean }>;
};

function isCheckMode(): boolean {
  return process.argv.includes("--check");
}

function loadAll(): { slug: string; detail: PackageDetail }[] {
  if (!existsSync(PACKAGES_DIR)) return [];
  const files = readdirSync(PACKAGES_DIR).filter((f) => f.endsWith(".json"));
  const out: { slug: string; detail: PackageDetail }[] = [];
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    const raw = readFileSync(join(PACKAGES_DIR, file), "utf-8");
    try {
      const detail = JSON.parse(raw) as PackageDetail;
      // validate minimal
      if (!detail.name || !detail.type || !detail.description || !detail.latest || !detail.versions) {
        console.warn(`[build] skip invalid ${file}: missing required fields`);
        continue;
      }
      if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(detail.name)) {
        console.warn(`[build] skip ${file}: invalid name ${detail.name}`);
        continue;
      }
      if (detail.description.length < 10 || detail.description.length > 200) {
        console.warn(`[build] skip ${file}: description length ${detail.description.length} not in 10-200`);
        continue;
      }
      if (!detail.versions[detail.latest]) {
        console.warn(`[build] skip ${file}: latest ${detail.latest} not in versions`);
        continue;
      }
      out.push({ slug, detail });
    } catch (e) {
      console.warn(`[build] skip ${file}: JSON error ${(e as Error).message}`);
    }
  }
  return out;
}

function build(): void {
  const all = loadAll();
  // sort by name for deterministic output
  all.sort((a, b) => a.detail.name.localeCompare(b.detail.name));

  const now = new Date().toISOString();
  let placeholderCount = 0;
  let verifiedCount = 0;

  // index.json
  const packages: Record<string, { name: string; type: string; description: string; latest: string; versions: string[]; keywords?: string[]; updatedAt: string; verified: boolean }> = {};
  for (const { detail } of all) {
    const versions = Object.keys(detail.versions).sort((a, b) => {
      // semver desc
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
      }
      return 0;
    });
    // check placeholder sha
    for (const v of Object.values(detail.versions) as Array<{ sha256?: string }>) {
      if (v.sha256?.startsWith("placeholder")) placeholderCount++;
    }
    const latestMeta = detail.versions[detail.latest] as { publishedAt?: string; verified?: boolean };
    const latestVerified = latestMeta?.verified === true;
    if (latestVerified) verifiedCount++;
    packages[detail.name] = {
      name: detail.name,
      type: detail.type,
      description: detail.description,
      latest: detail.latest,
      versions,
      ...(detail.keywords ? { keywords: detail.keywords } : {}),
      updatedAt: latestMeta?.publishedAt ?? now,
      verified: latestVerified,
    };
  }

  const index = {
    generatedAt: now,
    count: all.length,
    packages,
  };

  // search.json — flat array for offline search
  const search = all.map(({ detail }) => ({
    name: detail.name,
    type: detail.type,
    description: detail.description,
    keywords: detail.keywords ?? [],
    latest: detail.latest,
    verified: detail.versions[detail.latest]?.verified === true,
  }));

  // stats.json
  const byType: Record<string, number> = {};
  for (const { detail } of all) {
    byType[detail.type] = (byType[detail.type] ?? 0) + 1;
  }
  const stats = {
    generatedAt: now,
    totalPackages: all.length,
    byType,
    placeholderSha: placeholderCount,
    verifiedCount,
    communityCount: all.length - verifiedCount,
  };

  if (isCheckMode()) {
    // compare with existing index.json
    if (!existsSync(INDEX_FILE)) {
      console.error(`[build --check] ${INDEX_FILE} not found`);
      process.exit(1);
    }
    const existing = JSON.parse(readFileSync(INDEX_FILE, "utf-8"));
    // compare count and package keys (ignore generatedAt)
    const existingCount = existing.count;
    const expectedCount = index.count;
    if (existingCount !== expectedCount || JSON.stringify(Object.keys(existing.packages).sort()) !== JSON.stringify(Object.keys(packages).sort())) {
      console.error(`[build --check] index.json drift: existing count=${existingCount} expected=${expectedCount}`);
      console.error(`[build --check] run 'npm run registry:build' to fix`);
      process.exit(1);
    }
    console.log(`[build --check] OK — index.json in sync (count=${existingCount})`);
    if (placeholderCount > 0) console.warn(`[build --check] warn: ${placeholderCount} placeholder sha256 (expected in Phase 2)`);
    return;
  }

  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");
  writeFileSync(SEARCH_FILE, JSON.stringify(search, null, 2) + "\n");
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2) + "\n");
  console.log(`[build] wrote ${INDEX_FILE} (${all.length} packages)`);
  console.log(`[build] wrote ${SEARCH_FILE} (${search.length} entries)`);
  console.log(`[build] wrote ${STATS_FILE} ${JSON.stringify(byType)}`);
  if (placeholderCount > 0) console.warn(`[build] warn: ${placeholderCount} placeholder sha256 (Phase 2 mock, Phase 3 real)`);
}

build();
