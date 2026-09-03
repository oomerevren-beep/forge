#!/usr/bin/env tsx
// scripts/publish-verified.ts — forge-authored icerigi tarball yap, registry-v1 release'ine
// yukle, sha256 pinle + verified:true isaretle. Idempotent (--clobber upload).
// Ayrica sahte-SHA'li girdileri community katmanina dusurur (demote listesi).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";

const OWNER_REPO = "oomerevren-beep/forge";
const RELEASE = "registry-v1";

// registry slug -> registry-content dir (ayni ad)
const VERIFY: string[] = [
  "pdf-merge", "pdf-split", "pdf-ocr", "pdf-extract",
  "pdf-compress", "pdf-convert", "pdf-forms", "pdf-tables",
  "agent-pr-reviewer", "agent-debugger", "agent-security-auditor",
  "agent-changelog-writer", "agent-researcher",
  "cmd-plan", "cmd-review",
];

// Sahte hex + 404 URL tasiyanlar: community katmanina dusur (durustluk).
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
    sh(`gh release create ${RELEASE} --repo ${OWNER_REPO} --title "Forge verified registry content v1" --notes "Seed-verified package tarballs (Faz 6-oncesi). Each asset sha256-pinned in registry/packages/*.json."`);
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
    // forge.toml manifest uret (paket bildirimi)
    const manifest = `[package]\nname = "${detail.name}"\nversion = "${version}"\ntype = "${detail.type}"\ndescription = "${detail.description.replace(/"/g, "'")}"\nlicense = "MIT"\nrepository = "https://github.com/${OWNER_REPO}"\n`;
    writeFileSync(`${srcDir}/forge.toml`, manifest);

    const asset = `${slug}-${version}.tar.gz`;
    const tmp = `registry-content/${asset}`;
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
