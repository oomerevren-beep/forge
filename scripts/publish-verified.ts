#!/usr/bin/env tsx
// scripts/publish-verified.ts — pack forge-authored content into tarballs, upload
// them to the registry-v1 release, then pin sha256 + mark verified:true.
// Idempotent (--clobber upload). Entries carrying fake-SHA values are demoted
// to the community tier (demote list).
// Tarballs are built in .cache/forge-publish/ (gitignored temp dir) and removed
// after upload — prebuilt archives must never live in the git tree.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";

const OWNER_REPO = "oomerevren-beep/forge";
const RELEASE = "registry-v1";
// Scratch dir for tarball staging (gitignored via .cache/). Created on demand,
// cleaned per-asset after upload.
const STAGE_DIR = ".cache/forge-publish";

// registry slug -> registry-content dir (same name)
const VERIFY: string[] = [
  "pdf-merge", "pdf-split", "pdf-ocr", "pdf-extract",
  "pdf-compress", "pdf-convert", "pdf-forms", "pdf-tables",
  "agent-pr-reviewer", "agent-debugger", "agent-security-auditor",
  "agent-changelog-writer", "agent-researcher",
  "cmd-plan", "cmd-review",
];

// Fake hex + 404 URL carriers: demote to community tier (honesty).
const DEMOTE: string[] = ["anthropics-plan", "skill-pdf"];

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
}

async function main(): Promise<void> {
  // release var mi?
  try {
    sh(`gh release view ${RELEASE} --repo ${OWNER_REPO}`);
    console.log(`[publish] release ${RELEASE} exists`);
  } catch {
    sh(`gh release create ${RELEASE} --repo ${OWNER_REPO} --title "Forge verified registry content v1" --notes "Seed-verified package tarballs (pre-Phase-6). Each asset sha256-pinned in registry/packages/*.json."`);
    console.log(`[publish] release ${RELEASE} created`);
  }

  let ok = 0;
  for (const slug of VERIFY) {
    const pkgPath = `registry/packages/${slug}.json`;
    const srcDir = `registry-content/${slug}`;
    if (!existsSync(pkgPath) || !existsSync(srcDir)) {
      console.log(`[publish] SKIP ${slug}: missing json or content dir`);
      continue;
    }
    const detail = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const version: string = detail.latest;
    // generate forge.toml manifest (package declaration)
    const manifest = `[package]\nname = "${detail.name}"\nversion = "${version}"\ntype = "${detail.type}"\ndescription = "${detail.description.replace(/"/g, "'")}"\nlicense = "MIT"\nrepository = "https://github.com/${OWNER_REPO}"\n`;
    writeFileSync(`${srcDir}/forge.toml`, manifest);

    const asset = `${slug}-${version}.tar.gz`;
    // Stage the tarball under the gitignored scratch dir — never in the repo tree.
    mkdirSync(STAGE_DIR, { recursive: true });
    const tmp = `${STAGE_DIR}/${asset}`;
    sh(`tar -czf ${tmp} -C ${srcDir} .`);
    const buf = readFileSync(tmp);
    const sha256 = createHash("sha256").update(buf).digest("hex");
    sh(`gh release upload ${RELEASE} ${tmp} --repo ${OWNER_REPO} --clobber`);
    rmSync(tmp);

    const meta = detail.versions[version];
    meta.tarball = `https://github.com/${OWNER_REPO}/releases/download/${RELEASE}/${asset}`;
    meta.sha256 = sha256;
    meta.verified = true;
    detail.repository = `https://github.com/${OWNER_REPO}`;
    writeFileSync(pkgPath, JSON.stringify(detail, null, 2) + "\n");
    console.log(`[publish] OK ${detail.name}@${version} sha256=${sha256.slice(0, 12)}...`);
    ok++;
  }

  for (const slug of DEMOTE) {
    const pkgPath = `registry/packages/${slug}.json`;
    if (!existsSync(pkgPath)) continue;
    const detail = JSON.parse(readFileSync(pkgPath, "utf-8"));
    let touched = false;
    for (const meta of Object.values(detail.versions) as Array<Record<string, unknown>>) {
      if (typeof meta.sha256 === "string" && !meta.sha256.startsWith("placeholder")) {
        meta.sha256 = `placeholder-unverified-${slug}`;
        delete meta.verified;
        touched = true;
      }
    }
    if (touched) {
      writeFileSync(pkgPath, JSON.stringify(detail, null, 2) + "\n");
      console.log(`[publish] DEMOTE ${detail.name} -> community tier`);
    }
  }
  console.log(`[publish] done: ${ok}/${VERIFY.length} verified`);
}

main();
