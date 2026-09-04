// tests/sign.test.ts — Epoch 1e: package signing tests
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { generateKeyPair, signData, verifySignature, signPackage, verifyPackage } from "../cli/src/core/sign.js";

describe("forge sign — package signing", () => {
  it("generates an RSA key pair", () => {
    const dir = join(tmpdir(), `forge-test-sign-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { privateKey, publicKey } = generateKeyPair("test");
    assert.ok(privateKey.includes("BEGIN PRIVATE KEY"));
    assert.ok(publicKey.includes("BEGIN PUBLIC KEY"));
    rmSync(dir, { recursive: true, force: true });
  });

  it("signature verification succeeds", () => {
    const { privateKey, publicKey } = generateKeyPair("test");
    const data = "test data for signing";
    const sig = signData(data, privateKey);
    assert.ok(typeof sig === "string");
    assert.ok(sig.length > 0);
    const valid = verifySignature(data, sig, publicKey);
    assert.equal(valid, true);
  });

  it("signature verification fails (tampered data)", () => {
    const { privateKey, publicKey } = generateKeyPair("test");
    const data = "test data for signing";
    const sig = signData(data, privateKey);
    const valid = verifySignature("completely different data", sig, publicKey);
    assert.equal(valid, false);
  });

  it("signs and verifies a package", () => {
    const dir = join(tmpdir(), `forge-test-pkgsign-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const pkgPath = join(dir, "package.tar.gz");
    writeFileSync(pkgPath, "fake package content for testing");
    const sig = signPackage(pkgPath);
    assert.ok(sig.sha256.length === 64); // hex sha256
    assert.ok(sig.signature.length > 0);
    assert.ok(sig.publicKey.includes("PUBLIC KEY"));
    const valid = verifyPackage(pkgPath, sig);
    assert.equal(valid, true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("package verification fails (tampered package)", () => {
    const dir = join(tmpdir(), `forge-test-pkgsign2-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const pkgPath = join(dir, "package.tar.gz");
    writeFileSync(pkgPath, "original content");
    const sig = signPackage(pkgPath);
    writeFileSync(pkgPath, "modified content");
    const valid = verifyPackage(pkgPath, sig);
    assert.equal(valid, false);
    rmSync(dir, { recursive: true, force: true });
  });
});
