// cli/src/core/sign.ts — Epoch 1e: paket imzalama/doğrulama
// RSA key pair ile paket imzalama, verified publisher sistemi
import { createHash, createSign, createVerify, generateKeyPairSync } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const KEY_DIR = join(homedir(), ".forge", "keys");
const PRIVATE_KEY_PATH = join(KEY_DIR, "forge.key");
const PUBLIC_KEY_PATH = join(KEY_DIR, "forge.pub");

export interface Signature {
  sha256: string;
  signature: string;
  publicKey: string;
  signedAt: string;
  signer: string;
}

export interface PublicKey {
  id: string;
  publicKey: string;
  name: string;
  addedAt: string;
}

/** Generate a new RSA key pair for signing */
export function generateKeyPair(name: string): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  if (!existsSync(KEY_DIR)) mkdirSync(KEY_DIR, { recursive: true });

  writeFileSync(PRIVATE_KEY_PATH, privateKey);
  writeFileSync(PUBLIC_KEY_PATH, publicKey);

  console.log(`[forge] key pair generated for "${name}"`);
  console.log(`[forge] private: ${PRIVATE_KEY_PATH}`);
  console.log(`[forge] public:  ${PUBLIC_KEY_PATH}`);

  return { privateKey, publicKey };
}

/** Get or generate key pair */
export function getKeyPair(): { privateKey: string; publicKey: string } {
  if (existsSync(PRIVATE_KEY_PATH) && existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: readFileSync(PRIVATE_KEY_PATH, "utf-8"),
      publicKey: readFileSync(PUBLIC_KEY_PATH, "utf-8"),
    };
  }
  return generateKeyPair("forge-user");
}

/** Sign a buffer and return base64 signature */
export function signData(data: Buffer | string, privateKey: string): string {
  const sign = createSign("SHA256");
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, "base64");
}

/** Verify a signature */
export function verifySignature(data: Buffer | string, signature: string, publicKey: string): boolean {
  const verify = createVerify("SHA256");
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, "base64");
}

/** Sign a package tarball */
export function signPackage(tarballPath: string): Signature {
  const { privateKey, publicKey } = getKeyPair();
  const data = readFileSync(tarballPath);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const signature = signData(data, privateKey);

  return {
    sha256,
    signature,
    publicKey,
    signedAt: new Date().toISOString(),
    signer: "forge-user",
  };
}

/** Verify a package signature */
export function verifyPackage(tarballPath: string, sig: Signature): boolean {
  const data = readFileSync(tarballPath);
  const sha256 = createHash("sha256").update(data).digest("hex");

  if (sha256 !== sig.sha256) {
    return false;
  }

  return verifySignature(data, sig.signature, sig.publicKey);
}

/** Sign registry index */
export function signIndex(indexData: string): Signature {
  const { privateKey, publicKey } = getKeyPair();
  const sha256 = createHash("sha256").update(indexData).digest("hex");
  const signature = signData(indexData, privateKey);

  return {
    sha256,
    signature,
    publicKey,
    signedAt: new Date().toISOString(),
    signer: "forge-user",
  };
}

/** Verify registry index signature */
export function verifyIndex(indexData: string, sig: Signature): boolean {
  const sha256 = createHash("sha256").update(indexData).digest("hex");
  if (sha256 !== sig.sha256) return false;
  return verifySignature(indexData, sig.signature, sig.publicKey);
}
