import { resolve } from "node:path";
import type { ApplicationsConfig } from "./applications.types";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "applications-state.json",
);

export function resolveApplicationsConfig(
  env: NodeJS.ProcessEnv,
): ApplicationsConfig {
  return {
    stateFilePath:
      env.APPLICATIONS_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
