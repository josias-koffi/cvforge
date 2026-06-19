import { resolve } from "node:path";
import type { ProfilesConfig } from "./profiles.types";

const DEFAULT_STATE_FILE = resolve(process.cwd(), ".data", "profiles-state.json");

export function resolveProfilesConfig(env: NodeJS.ProcessEnv): ProfilesConfig {
  return {
    stateFilePath: env.PROFILES_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
