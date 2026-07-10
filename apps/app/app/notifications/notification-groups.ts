import type { InAppNotification } from "@cvforge/types";

export type NotificationDayBucket = "today" | "yesterday" | "older";

export type NotificationDaySection = {
  bucket: NotificationDayBucket;
  label: string;
  notifications: InAppNotification[];
};

const BUCKET_LABELS: Record<NotificationDayBucket, string> = {
  older: "Plus ancien",
  today: "Aujourd'hui",
  yesterday: "Hier",
};

function toCalendarDayKey(value: string) {
  return value.slice(0, 10);
}

function resolveBucket(
  notificationDayKey: string,
  todayKey: string,
  yesterdayKey: string,
): NotificationDayBucket {
  if (notificationDayKey === todayKey) return "today";
  if (notificationDayKey === yesterdayKey) return "yesterday";
  return "older";
}

function sortUnreadFirstThenRecent(
  a: InAppNotification,
  b: InAppNotification,
) {
  const aUnread = a.readAt == null;
  const bUnread = b.readAt == null;
  if (aUnread !== bUnread) return aUnread ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function groupNotificationsByDay(
  notifications: InAppNotification[],
  now: Date,
): NotificationDaySection[] {
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const byBucket = new Map<NotificationDayBucket, InAppNotification[]>();
  for (const notification of notifications) {
    const bucket = resolveBucket(
      toCalendarDayKey(notification.createdAt),
      todayKey,
      yesterdayKey,
    );
    const bucketItems = byBucket.get(bucket) ?? [];
    bucketItems.push(notification);
    byBucket.set(bucket, bucketItems);
  }

  const order: NotificationDayBucket[] = ["today", "yesterday", "older"];
  return order
    .filter((bucket) => byBucket.has(bucket))
    .map((bucket) => ({
      bucket,
      label: BUCKET_LABELS[bucket],
      notifications: [...(byBucket.get(bucket) ?? [])].sort(
        sortUnreadFirstThenRecent,
      ),
    }));
}
