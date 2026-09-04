// cli/src/core/plugin.ts — Epoch 1e: adapter plugin system
// Dynamically load adapters, decoupled from the CLI core
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type { Adapter } from "../adapters/types.js";

export interface AdapterPlugin {
  name: string;
  adapter: Adapter;
}

/**
 * Dynamically load adapter plugins from a directory.
 * Each .ts/.js file must export a default Adapter or an `adapter` named export.
 */
export async function loadAdapterPlugins(pluginDir: string): Promise<AdapterPlugin[]> {
  if (!existsSync(pluginDir)) return [];

  const plugins: AdapterPlugin[] = [];
  const files = readdirSync(pluginDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of files) {
    try {
      const mod = await import(join(pluginDir, file));
      const adapter = mod.default ?? mod.adapter;
      if (adapter && typeof adapter.name === "string") {
        plugins.push({ name: adapter.name, adapter });
      }
    } catch (e) {
      console.warn(`[forge] failed to load adapter plugin ${file}: ${(e as Error).message}`);
    }
  }

  return plugins;
}

/**
 * Load built-in adapters (bundled with CLI)
 */
export function loadBuiltInAdapters(): Adapter[] {
  // Dynamic imports for tree-shaking
  return [];
}
