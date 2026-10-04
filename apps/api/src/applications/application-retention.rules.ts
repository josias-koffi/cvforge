/**
 * How long an application is kept without activity (US-170).
 *
 * Counted from its last change (`updated_at`), not its creation: an
 * application still followed must not go. Opening it is not a change; a new
 * status, a generation or an edit is, and pushes the deadline back.
 */

const DAY_MS = 86_400_000;

/** A year after the last change. */
export const APPLICATION_RETENTION_DAYS = 365;
/** The candidate is warned this long before, and never has less. */
export const DELETION_NOTICE_DAYS = 15;

/** Untouched since before this, an application is due a warning. */
export function warnBefore(now: number): Date {
  return new Date(
    now - (APPLICATION_RETENTION_DAYS - DELETION_NOTICE_DAYS) * DAY_MS,
  );
}

/** Untouched since before this, a warned application may go. */
export function deleteBefore(now: number): Date {
  return new Date(now - APPLICATION_RETENTION_DAYS * DAY_MS);
}

/** Warned before this, the notice has run its course. */
export function noticeGivenBefore(now: number): Date {
  return new Date(now - DELETION_NOTICE_DAYS * DAY_MS);
}

/**
 * When a warned application goes: a year after its last change, and never
 * sooner than 15 days after the warning. Null when it was not warned, or was
 * changed since — which cancels the warning.
 */
export function deletionScheduledAt(application: {
  updatedAt: string;
  deletionWarnedAt: string | null;
}): string | null {
  const { deletionWarnedAt, updatedAt } = application;
  if (!deletionWarnedAt) return null;

  const warned = Date.parse(deletionWarnedAt);
  const changed = Date.parse(updatedAt);
  if (warned < changed) return null;

  return new Date(
    Math.max(
      changed + APPLICATION_RETENTION_DAYS * DAY_MS,
      warned + DELETION_NOTICE_DAYS * DAY_MS,
    ),
  ).toISOString();
}
