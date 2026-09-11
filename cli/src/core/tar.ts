// cli/src/core/tar.ts — Pure-Node deterministic tarball generator & extractor.
// Cross-platform, dependency-free, bit-for-bit reproducible packaging.

import { createHash } from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, normalize, resolve } from "path";

export interface TarEntry {
  name: string;
  data: Buffer;
  mode?: number;
}

/** Formats an octal number string with null/space termination. */
function toOctal(val: number, length: number): string {
  const s = val.toString(8);
  return s.padStart(length - 1, "0") + "\0";
}

/** Creates a 512-byte USTAR tar header. */
function createHeader(entry: TarEntry): Buffer {
  const header = Buffer.alloc(512, 0);

  let name = entry.name.replace(/\\/g, "/");
  if (name.startsWith("/")) name = name.slice(1);
  let prefix = "";

  if (Buffer.byteLength(name) > 100) {
    const lastSlash = name.lastIndexOf("/", 154);
    if (lastSlash > 0 && lastSlash <= 155) {
      prefix = name.slice(0, lastSlash);
      name = name.slice(lastSlash + 1);
    }
  }

  // 0..99: filename
  header.write(name.slice(0, 100), 0, 100, "utf-8");

  // 100..107: mode (default 0o644)
  const mode = entry.mode ?? 0o644;
  header.write(toOctal(mode, 8), 100, 8, "ascii");

  // 108..115: uid (0)
  header.write(toOctal(0, 8), 108, 8, "ascii");

  // 116..123: gid (0)
  header.write(toOctal(0, 8), 116, 8, "ascii");

  // 124..135: size
  header.write(toOctal(entry.data.length, 12), 124, 12, "ascii");

  // 136..147: mtime (0 for determinism)
  header.write(toOctal(0, 12), 136, 12, "ascii");

  // 148..155: chksum placeholder (spaces)
  header.fill(0x20, 148, 156);

  // 156: typeflag ('0' for normal file)
  header.write("0", 156, 1, "ascii");

  // 157..256: linkname (empty)

  // 257..262: magic ("ustar\0")
  header.write("ustar\0", 257, 6, "ascii");

  // 263..264: version ("00")
  header.write("00", 263, 2, "ascii");

  // 265..296: uname
  header.write("forge\0", 265, 32, "ascii");

  // 297..328: gname
  header.write("forge\0", 297, 32, "ascii");

  // 345..499: prefix
  if (prefix) {
    header.write(prefix, 345, 155, "utf-8");
  }

  // Compute checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += header[i];
  }

  // Write checksum: 6 octal digits, null byte, space
  const chkStr = sum.toString(8).padStart(6, "0") + "\0 ";
  header.write(chkStr, 148, 8, "ascii");

  return header;
}

function createLongLinkHeader(nameLength: number): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write("././@LongLink", 0, 13, "ascii");
  header.write(toOctal(0o644, 8), 100, 8, "ascii");
  header.write(toOctal(0, 8), 108, 8, "ascii");
  header.write(toOctal(0, 8), 116, 8, "ascii");
  header.write(toOctal(nameLength, 12), 124, 12, "ascii");
  header.write(toOctal(0, 12), 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header.write("L", 156, 1, "ascii");
  header.write("ustar  \0", 257, 8, "ascii");
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}

/** Creates uncompressed tar buffer from sorted entries. */
export function createTar(entries: TarEntry[]): Buffer {
  // Deterministic order: sort entries alphabetically by name
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const chunks: Buffer[] = [];

  for (const entry of sorted) {
    let name = entry.name.replace(/\\/g, "/");
    if (name.startsWith("/")) name = name.slice(1);

    const byteLen = Buffer.byteLength(name);
    // If name > 100 bytes, emit LongLink for complete cross-implementation compatibility
    if (byteLen > 100) {
      const nameBuf = Buffer.from(name + "\0", "utf-8");
      const llHeader = createLongLinkHeader(nameBuf.length);
      chunks.push(llHeader);
      chunks.push(nameBuf);
      const rem = nameBuf.length % 512;
      if (rem !== 0) chunks.push(Buffer.alloc(512 - rem, 0));
    }

    const header = createHeader({
      ...entry,
      name: byteLen > 100 ? name.slice(0, 100) : name,
    });
    chunks.push(header);
    chunks.push(entry.data);

    // Pad file contents to 512-byte boundary
    const remainder = entry.data.length % 512;
    if (remainder !== 0) {
      chunks.push(Buffer.alloc(512 - remainder, 0));
    }
  }

  // End of archive: two 512-byte blocks of zeroes
  chunks.push(Buffer.alloc(1024, 0));

  return Buffer.concat(chunks);
}

/**
 * Creates a deterministic, byte-identical .tgz buffer from files.
 * Normalizes timestamps to 0 and uses fixed compression level.
 */
export function createDeterministicTarGz(files: { relPath: string; absPath: string }[]): {
  tarball: Buffer;
  sha256: string;
  fileCount: number;
} {
  const entries: TarEntry[] = [];
  for (const file of files) {
    const data = readFileSync(file.absPath);
    const normalizedRel = file.relPath.replace(/\\/g, "/");
    entries.push({
      name: normalizedRel,
      data,
      mode: 0o644,
    });
  }

  const tarBuffer = createTar(entries);
  // Deterministic gzip: level = 9, normalize mtime and OS byte in gzip header
  const tarball = gzipSync(tarBuffer, { level: 9 });
  if (tarball.length >= 10 && tarball[0] === 0x1f && tarball[1] === 0x8b) {
    tarball.fill(0, 4, 8); // mtime = 0
    tarball[9] = 0x03; // OS = Unix
  }
  const sha256 = createHash("sha256").update(tarball).digest("hex");

  return {
    tarball,
    sha256,
    fileCount: entries.length,
  };
}

export interface ExtractedTarEntry {
  name: string;
  data: Buffer;
}

/** Parses uncompressed tar buffer into entries. */
export function parseTar(tarBuf: Buffer): ExtractedTarEntry[] {
  const entries: ExtractedTarEntry[] = [];
  let offset = 0;
  let pendingLongName: string | null = null;

  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);

    // Check for empty block (end of archive)
    const isZero = header.every((b) => b === 0);
    if (isZero) {
      break;
    }

    const typeflag = String.fromCharCode(header[156]);

    // Read name
    const rawName = header.subarray(0, 100).toString("utf-8").replace(/\0.*$/, "");
    const rawPrefix = header.subarray(345, 500).toString("utf-8").replace(/\0.*$/, "");
    const fullName = pendingLongName ?? (rawPrefix ? `${rawPrefix}/${rawName}` : rawName);

    // Read size (octal string)
    const rawSize = header.subarray(124, 136).toString("ascii").trim().replace(/\0.*$/, "");
    const size = parseInt(rawSize, 8) || 0;

    offset += 512;
    if (offset + size > tarBuf.length) {
      throw new Error(`Corrupt tar: unexpected EOF for ${fullName}`);
    }

    const data = Buffer.from(tarBuf.subarray(offset, offset + size));

    // Skip padding to 512-byte boundary
    const remainder = size % 512;
    const padding = remainder === 0 ? 0 : 512 - remainder;
    offset += size + padding;

    if (typeflag === "L") {
      pendingLongName = data.toString("utf-8").replace(/\0.*$/, "");
      continue;
    }

    pendingLongName = null;
    entries.push({ name: fullName, data });
  }

  return entries;
}

/** Extracts a .tar.gz buffer safely into a directory. */
export function extractTarGz(tarGzBuffer: Buffer, destDir: string): string[] {
  const tarBuf = gunzipSync(tarGzBuffer);
  const entries = parseTar(tarBuf);
  const writtenFiles: string[] = [];
  const resolvedDest = resolve(destDir);

  for (const entry of entries) {
    // Sanitize path against directory traversal
    const safeRel = normalize(entry.name)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^[/\\]+/, "");
    if (!safeRel || safeRel === ".") continue;

    const fullPath = resolve(destDir, safeRel);
    if (
      !fullPath.startsWith(resolvedDest + "/") &&
      !fullPath.startsWith(resolvedDest + "\\") &&
      fullPath !== resolvedDest
    ) {
      throw new Error(`Tar slip traversal blocked: ${entry.name}`);
    }

    if (entry.name.endsWith("/")) {
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
      continue;
    }

    const parent = dirname(fullPath);
    if (!existsSync(parent)) {
      mkdirSync(parent, { recursive: true });
    }

    writeFileSync(fullPath, entry.data);
    writtenFiles.push(fullPath);
  }

  return writtenFiles;
}
