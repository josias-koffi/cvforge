import { resolve } from "node:path";
import type { NotificationsConfig } from "./notifications.types";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "notifications-state.json",
);
const DEFAULT_FOLLOW_UP_DELAY_DAYS = 7;

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function resolveNotificationsConfig(
  env: NodeJS.ProcessEnv,
): NotificationsConfig {
  return {
    followUpDelayDays: parsePositiveInt(
      env.NOTIFICATIONS_FOLLOW_UP_DELAY_DAYS,
      DEFAULT_FOLLOW_UP_DELAY_DAYS,
    ),
    stateFilePath: env.NOTIFICATIONS_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
