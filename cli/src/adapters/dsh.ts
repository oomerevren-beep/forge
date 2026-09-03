// cli/src/adapters/dsh.ts — DeepSeek harness
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { type Adapter, installSkillFiles, uninstallSkillFiles, listDirNames } from "./types.js";

// Epoch 1c: DSH adapter artık deprecated/legacy olarak işaretlenmiş.
// DeepSeek Harness'ında "skills" kavramı yok; cordis.yml + TS plugin modeli kullanılır.
// Adapter'ı tutuyoruz (geriye uyumluluk) ama "community-maintained, untested" olarak gösteriyoruz.
export const dshAdapter: Adapter = {
  name: "dsh",
  displayName: "DeepSeek (DSH, community/untested)",
  detect: () => existsSync(join(homedir(), ".dsh")) || existsSync(join(process.cwd(), ".dsh")),
  skillDir: (slug) => {
    if (existsSync(join(process.cwd(), ".dsh"))) return join(process.cwd(), ".dsh", "skills", slug);
    return join(homedir(), ".dsh", "skills", slug);
  },
  mcpConfigPath: () => {
    if (existsSync(join(process.cwd(), ".dsh"))) return join(process.cwd(), ".dsh", "mcp.json");
    return join(homedir(), ".dsh", "mcp.json");
  },
  async install(pkgSlug, srcDir, type) {
    void type;
    const base = existsSync(join(process.cwd(), ".dsh")) ? join(process.cwd(), ".dsh", "skills") : join(homedir(), ".dsh", "skills");
    installSkillFiles("dsh", pkgSlug, srcDir, base);
  },
  async uninstall(pkgSlug, _type) {
    const bases = [join(process.cwd(), ".dsh", "skills"), join(homedir(), ".dsh", "skills")];
    for (const b of bases) uninstallSkillFiles(pkgSlug, b);
  },
  async list() {
    const bases = [join(process.cwd(), ".dsh", "skills"), join(homedir(), ".dsh", "skills")];
    for (const b of bases) {
      if (existsSync(b)) return listDirNames(b);
    }
    return [];
  },
  async isInstalled(pkgSlug) {
    const bases = [join(process.cwd(), ".dsh", "skills"), join(homedir(), ".dsh", "skills")];
    return bases.some((b) => existsSync(join(b, pkgSlug)));
  },
};
