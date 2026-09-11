// cli/src/commands/publish.ts — Opinionated publish pipeline for Forge packages.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { validatePackage } from "./validate.js";
import { packPackage, type PackResult } from "./pack.js";
import { loadPackageToml } from "../core/project.js";
import { loadConfig } from "../core/config.js";
import { toSlug } from "../core/store.js";
import type { PackageDetail, PackageVersion } from "../core/registry.js";

export interface PublishOptions {
  dryRun?: boolean;
  token?: string;
  registry?: string;
  tag?: string;
  access?: string;
  json?: boolean;
}

export interface PublishResult {
  ok: boolean;
  name: string;
  version: string;
  tier: string;
  sha256: string;
  tarball: string;
  fileCount: number;
  sizeBytes: number;
  registry: string;
  dryRun: boolean;
}

function resolveRegistryUrl(cliRegistry?: string): string {
  if (cliRegistry) return cliRegistry;
  try {
    const cfg = loadConfig();
    if (cfg.registry) return cfg.registry;
  } catch {
    /* fallback */
  }
  return "https://registry.forge.sh";
}

function resolveAuthToken(cliToken?: string): string | null {
  return (
    cliToken ??
    process.env.FORGE_TOKEN ??
    process.env.NPM_TOKEN ??
    null
  );
}

export async function publishPackage(
  targetDir: string,
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const dir = resolve(targetDir);

  // 1. Validation pipeline step
  const validation = validatePackage(dir);
  if (!validation.ok) {
    const errList = validation.errors.map((e) => `  - ${e}`).join("\n");
    throw new Error(`Publish aborted: package failed pre-publish validation:\n${errList}`);
  }

  // 2. Load manifest details
  const tomlPath = join(dir, "forge.toml");
  const parsed = loadPackageToml(tomlPath);
  const pkgMeta = parsed.package;
  const name = pkgMeta.name;
  const version = pkgMeta.version;
  const tier = pkgMeta.tier ?? "community";
  const desc = pkgMeta.description ?? "";
  const author = pkgMeta.author;
  const homepage = pkgMeta.homepage;
  const repository = pkgMeta.repository;
  const keywords = pkgMeta.keywords;

  // 3. Pack pipeline step
  const packResult: PackResult = await packPackage(dir);

  // 4. Destination & Authentication
  const registryUrl = resolveRegistryUrl(opts.registry);
  const token = resolveAuthToken(opts.token);
  const isRemote = /^https?:\/\//i.test(registryUrl);

  if (isRemote && !opts.dryRun && !token) {
    throw new Error(
      `Publishing to remote registry ${registryUrl} requires an authentication token.\n` +
      `Provide a token using --token <token> or set FORGE_TOKEN environment variable.`,
    );
  }

  // 5. Stage / Publish
  if (opts.dryRun) {
    return {
      ok: true,
      name,
      version,
      tier,
      sha256: packResult.sha256,
      tarball: packResult.tarballPath,
      fileCount: packResult.fileCount,
      sizeBytes: packResult.sizeBytes,
      registry: registryUrl,
      dryRun: true,
    };
  }

  if (isRemote) {
    // Remote HTTP publish
    const slug = toSlug(name);
    const endpoint = `${registryUrl.replace(/\/$/, "")}/packages/${slug}`;
    const payload = {
      name,
      version,
      tier,
      description: desc,
      author,
      homepage,
      repository,
      keywords,
      sha256: packResult.sha256,
      tarball: packResult.tarballPath,
      tag: opts.tag ?? "latest",
      access: opts.access ?? "public",
      engines: parsed.engines,
      compatibility: parsed.compatibility,
      permissions: parsed.permissions,
      dependencies: parsed.dependencies,
      mcp: parsed.mcp,
    };

    let retries = 2;
    while (retries >= 0) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          break;
        } else if (res.status >= 500 && retries > 0) {
          retries--;
          await new Promise((r) => setTimeout(r, 500));
          continue;
        } else {
          const errText = await res.text();
          throw new Error(`Remote publish failed with status ${res.status}: ${errText}`);
        }
      } catch (e) {
        if (retries > 0 && !(e as Error).message.includes("Remote publish failed")) {
          retries--;
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        throw new Error(`Publish request failed: ${(e as Error).message}`, { cause: e });
      }
    }
  } else {
    // Local registry metadata staging
    const slug = toSlug(name);
    let regDir = resolve(process.cwd(), "registry");
    if (opts.registry && !isRemote) {
      regDir = resolve(opts.registry);
    } else {
      const localRegCandidate = resolve(dir, "registry");
      const repoRegCandidate = resolve(process.cwd(), "registry");
      if (existsSync(join(localRegCandidate, "packages"))) {
        regDir = localRegCandidate;
      } else if (existsSync(join(repoRegCandidate, "packages"))) {
        regDir = repoRegCandidate;
      }
    }

    const packagesDir = join(regDir, "packages");
    if (!existsSync(packagesDir)) {
      mkdirSync(packagesDir, { recursive: true });
    }

    const pkgFile = join(packagesDir, `${slug}.json`);
    let existingDetail: PackageDetail;

    if (existsSync(pkgFile)) {
      existingDetail = JSON.parse(readFileSync(pkgFile, "utf-8")) as PackageDetail;
    } else {
      existingDetail = {
        name,
        type: pkgMeta.type as string,
        description: desc,
        homepage,
        repository,
        author,
        keywords,
        tier: tier as "community" | "verified" | "trusted",
        versions: {},
        latest: version,
      };
    }

    // Add / update version metadata
    const versionMeta: PackageVersion = {
      version,
      tarball: `https://registry.forge.sh/tarballs/${slug}-${version}.tgz`,
      sha256: packResult.sha256,
      tier: tier as "community" | "verified" | "trusted",
      publishedAt: new Date().toISOString(),
      engines: parsed.engines,
      compatibility: parsed.compatibility,
      permissions: parsed.permissions,
      dependencies: parsed.dependencies,
      mcp: parsed.mcp as PackageVersion["mcp"] | undefined,
      verified: tier === "verified" || tier === "trusted",
    };

    existingDetail.versions[version] = versionMeta;
    existingDetail.latest = version;
    existingDetail.tier = tier as "community" | "verified" | "trusted";
    if (author) existingDetail.author = author;
    if (homepage) existingDetail.homepage = homepage;
    if (repository) existingDetail.repository = repository;
    if (keywords) existingDetail.keywords = keywords;

    writeFileSync(pkgFile, JSON.stringify(existingDetail, null, 2) + "\n", "utf-8");

    // Update local registry index.json if present
    const indexPath = join(regDir, "index.json");
    if (existsSync(indexPath)) {
      try {
        const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
        if (indexData.packages && typeof indexData.packages === "object") {
          const existingPkg = indexData.packages[name];
          const allVersions = existingPkg?.versions
            ? Array.from(new Set([...existingPkg.versions, version]))
            : [version];
          indexData.packages[name] = {
            name,
            type: pkgMeta.type as string,
            description: desc,
            latest: version,
            versions: allVersions,
            ...(keywords ? { keywords } : existingPkg?.keywords ? { keywords: existingPkg.keywords } : {}),
            updatedAt: new Date().toISOString(),
            verified: tier === "verified" || tier === "trusted",
            tier,
            ...(author ? { author } : {}),
            harnesses: parsed.compatibility?.harnesses ?? existingPkg?.harnesses,
          };
          indexData.count = Object.keys(indexData.packages).length;
          writeFileSync(indexPath, JSON.stringify(indexData, null, 2) + "\n", "utf-8");
        }
      } catch {
        /* best-effort index update */
      }
    }

    // Update local registry search.json if present
    const searchPath = join(regDir, "search.json");
    if (existsSync(searchPath)) {
      try {
        let searchList = JSON.parse(readFileSync(searchPath, "utf-8"));
        if (Array.isArray(searchList)) {
          searchList = searchList.filter((item: { name: string }) => item.name !== name);
          searchList.push({
            name,
            type: pkgMeta.type as string,
            description: desc,
            keywords: keywords ?? [],
            latest: version,
            verified: tier === "verified" || tier === "trusted",
            tier,
            ...(author ? { author } : {}),
            harnesses: parsed.compatibility?.harnesses,
          });
          writeFileSync(searchPath, JSON.stringify(searchList, null, 2) + "\n", "utf-8");
        }
      } catch {
        /* best-effort search update */
      }
    }
  }

  return {
    ok: true,
    name,
    version,
    tier,
    sha256: packResult.sha256,
    tarball: packResult.tarballPath,
    fileCount: packResult.fileCount,
    sizeBytes: packResult.sizeBytes,
    registry: registryUrl,
    dryRun: false,
  };
}

export async function runPublish(
  dirArg?: string,
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const dir = dirArg ? resolve(dirArg) : process.cwd();

  try {
    const result = await publishPackage(dir, opts);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    const tierBadge =
      result.tier === "trusted"
        ? "[trusted ★]"
        : result.tier === "verified"
        ? "[verified ✓]"
        : "[community]";

    if (result.dryRun) {
      console.log(`[forge] (dry-run) package ${result.name}@${result.version} is valid and ready to publish.`);
      console.log(`  Tier:      ${tierBadge}`);
      console.log(`  SHA-256:   ${result.sha256}`);
      console.log(`  Tarball:   ${result.tarball} (${result.sizeBytes} bytes, ${result.fileCount} files)`);
      console.log(`  Target:    ${result.registry}`);
      console.log(`\n(dry-run complete: no changes were published)`);
      return result;
    }

    console.log(`\n[forge] ✓ published ${result.name}@${result.version}`);
    console.log(`  Quality Tier:  ${tierBadge}`);
    console.log(`  Integrity:     sha256:${result.sha256}`);
    console.log(`  Package size:  ${result.sizeBytes} bytes (${result.fileCount} files)`);
    console.log(`  Registry:      ${result.registry}`);
    return result;
  } catch (e) {
    console.error(`[forge] Publish failed: ${(e as Error).message}`);
    process.exit(1);
  }
}
