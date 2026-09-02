import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parse, stringify } from "smol-toml";
import { forgeHome } from "./store.js";

export interface ForgeConfig {
  registry: string;
  defaultHarnesses: string[];
  autoUpdate: boolean;
  telemetry: boolean;
}

const DEFAULT_CONFIG: ForgeConfig = {
  registry: "registry/index.json",
  defaultHarnesses: [],
  autoUpdate: false,
  telemetry: false,
};

export function configPath(): string {
  return join(forgeHome(), "config.toml");
}

export function loadConfig(): ForgeConfig {
  const p = configPath();
  if (!existsSync(p)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = parse(raw) as Record<string, unknown>;
    return {
      registry: typeof parsed.registry === "string" ? parsed.registry : DEFAULT_CONFIG.registry,
      defaultHarnesses: Array.isArray(parsed.defaultHarnesses) ? (parsed.defaultHarnesses as string[]) : [],
      autoUpdate: typeof parsed.autoUpdate === "boolean" ? parsed.autoUpdate : false,
      telemetry: typeof parsed.telemetry === "boolean" ? parsed.telemetry : false,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg: ForgeConfig): void {
  const dir = forgeHome();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const content = stringify(cfg as unknown as Record<string, unknown>);
  writeFileSync(configPath(), content);
}

export function ensureConfig(): ForgeConfig {
  const p = configPath();
  if (!existsSync(p)) {
    const cfg = { ...DEFAULT_CONFIG };
    saveConfig(cfg);
    return cfg;
  }
  return loadConfig();
}
