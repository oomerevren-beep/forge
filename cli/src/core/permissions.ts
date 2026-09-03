// cli/src/core/permissions.ts — Epoch 1e: sandbox izin manifestosu
export interface PermissionManifest {
  network?: boolean; // İnternet erişimi
  filesystem?: "read" | "write" | "none"; // Dosya sistemi erişimi
  exec?: boolean; // Komut çalıştırma
  env?: string[]; // Erişilecek env değişkenleri
}

export const DEFAULT_PERMISSIONS: PermissionManifest = {
  network: false,
  filesystem: "read",
  exec: false,
  env: [],
};

export function validatePermissions(manifest: PermissionManifest): string[] {
  const errors: string[] = [];
  if (manifest.network && typeof manifest.network !== "boolean") {
    errors.push("network must be boolean");
  }
  if (manifest.filesystem && !["read", "write", "none"].includes(manifest.filesystem)) {
    errors.push("filesystem must be 'read', 'write', or 'none'");
  }
  if (manifest.exec && typeof manifest.exec !== "boolean") {
    errors.push("exec must be boolean");
  }
  return errors;
}

export function formatPermissions(manifest: PermissionManifest): string {
  const parts: string[] = [];
  parts.push(`Network: ${manifest.network ? "allowed" : "denied"}`);
  parts.push(`Filesystem: ${manifest.filesystem ?? "read"}`);
  parts.push(`Exec: ${manifest.exec ? "allowed" : "denied"}`);
  if (manifest.env && manifest.env.length > 0) {
    parts.push(`Env: ${manifest.env.join(", ")}`);
  }
  return parts.join(" | ");
}
