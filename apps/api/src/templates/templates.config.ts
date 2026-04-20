import { resolve } from "node:path";
import type { TemplatesConfig } from "./templates.types";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "templates-state.json",
);

export function resolveTemplatesConfig(
  env: NodeJS.ProcessEnv,
): TemplatesConfig {
  return {
    stateFilePath: env.TEMPLATES_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
