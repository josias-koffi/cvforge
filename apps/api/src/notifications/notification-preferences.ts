import {
  DEFAULT_JOB_ALERT_PREFERENCES,
  jobAlertRhythms,
  jobAlertThresholds,
  type JobAlertPreferences,
  type NotificationEmailPreferences,
  type NotificationPreferences,
} from "@cvforge/types";

/** What a candidate who never opened the page receives. */
export function createDefaultPreferences(): NotificationPreferences {
  return {
    email: {
      applicationDeletionWarning: true,
      applicationFollowUp: true,
      creditPurchaseConfirmed: true,
      jobDigest: true,
    },
    jobAlerts: { ...DEFAULT_JOB_ALERT_PREFERENCES },
  };
}

/**
 * Stored e-mail switches, completed with the defaults: a row written before a
 * switch existed (US-170's warning) has no value for it, which means "on".
 */
export function readEmailPreferences(stored: unknown): NotificationEmailPreferences {
  const value = (stored ?? {}) as Partial<Record<keyof NotificationEmailPreferences, unknown>>;
  const email = createDefaultPreferences().email;

  for (const key of Object.keys(email) as Array<keyof NotificationEmailPreferences>) {
    if (typeof value[key] === "boolean") email[key] = value[key] as boolean;
  }

  return email;
}

/**
 * Stored alert preferences, completed with the defaults: a row written before
 * US-166 has none, and a value the code no longer knows must not reach the
 * dispatcher.
 */
export function readJobAlertPreferences(stored: unknown): JobAlertPreferences {
  const value = (stored ?? {}) as Partial<
    Record<keyof JobAlertPreferences, unknown>
  >;

  const flag = (key: "aiAnalysis" | "aiFilter" | "enabled") =>
    typeof value[key] === "boolean"
      ? (value[key] as boolean)
      : DEFAULT_JOB_ALERT_PREFERENCES[key];

  return {
    aiAnalysis: flag("aiAnalysis"),
    aiFilter: flag("aiFilter"),
    enabled: flag("enabled"),
    rhythm: (jobAlertRhythms as readonly unknown[]).includes(value.rhythm)
      ? (value.rhythm as JobAlertPreferences["rhythm"])
      : DEFAULT_JOB_ALERT_PREFERENCES.rhythm,
    threshold: (jobAlertThresholds as readonly unknown[]).includes(
      value.threshold,
    )
      ? (value.threshold as JobAlertPreferences["threshold"])
      : DEFAULT_JOB_ALERT_PREFERENCES.threshold,
  };
}

/** A partial update; anything missing or invalid keeps its current value. */
export type PreferencesUpdate = {
  email?: Partial<NotificationEmailPreferences>;
  jobAlerts?: Partial<Record<keyof JobAlertPreferences, unknown>>;
};

export function mergePreferences(
  current: NotificationPreferences,
  update: PreferencesUpdate,
): NotificationPreferences {
  const email = { ...current.email };

  for (const key of Object.keys(email) as Array<
    keyof NotificationEmailPreferences
  >) {
    const value = update.email?.[key];
    if (typeof value === "boolean") email[key] = value;
  }

  return {
    email,
    jobAlerts: readJobAlertPreferences({
      ...current.jobAlerts,
      ...stripUndefined(update.jobAlerts),
    }),
  };
}

function stripUndefined(value: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined),
  );
}
