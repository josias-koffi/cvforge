import { resolve } from "node:path";
import type { CreditsConfig } from "./credits.types";

const DEFAULT_STATE_FILE = resolve(process.cwd(), ".data", "credits-state.json");
const DEFAULT_LOW_BALANCE_THRESHOLD = 20;

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function resolveCreditsConfig(env: NodeJS.ProcessEnv): CreditsConfig {
  return {
    lowBalanceThreshold: parsePositiveInt(
      env.CREDITS_LOW_BALANCE_THRESHOLD,
      DEFAULT_LOW_BALANCE_THRESHOLD,
    ),
    stateFilePath: env.CREDITS_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
