import { describe, expect, it } from "vitest";
import type { InAppNotification } from "@cvforge/types";
import { groupNotificationsByDay } from "./notification-groups";

const NOW = new Date("2026-07-10T09:00:00.000Z");

function makeNotification(
  overrides: Partial<InAppNotification>,
): InAppNotification {
  return {
    createdAt: "2026-07-10T08:00:00.000Z",
    id: "notif-default",
    linkHref: "/candidatures",
    message: "message",
    metadata: {},
    readAt: null,
    title: "title",
    type: "application_follow_up",
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("groupNotificationsByDay", () => {
  it("buckets notifications into today, yesterday, and older", () => {
    const today = makeNotification({
      createdAt: "2026-07-10T07:00:00.000Z",
      id: "today",
    });
    const yesterday = makeNotification({
      createdAt: "2026-07-09T07:00:00.000Z",
      id: "yesterday",
    });
    const older = makeNotification({
      createdAt: "2026-07-01T07:00:00.000Z",
      id: "older",
    });

    const sections = groupNotificationsByDay([older, yesterday, today], NOW);

    expect(sections.map((section) => section.bucket)).toEqual([
      "today",
      "yesterday",
      "older",
    ]);
    expect(sections[0].notifications.map((n) => n.id)).toEqual(["today"]);
    expect(sections[1].notifications.map((n) => n.id)).toEqual(["yesterday"]);
    expect(sections[2].notifications.map((n) => n.id)).toEqual(["older"]);
  });

  it("omits empty buckets", () => {
    const today = makeNotification({
      createdAt: "2026-07-10T07:00:00.000Z",
      id: "today",
    });

    const sections = groupNotificationsByDay([today], NOW);

    expect(sections).toHaveLength(1);
    expect(sections[0].bucket).toBe("today");
  });

  it("sorts unread first, then by most recent, within a bucket", () => {
    const readRecent = makeNotification({
      createdAt: "2026-07-10T08:00:00.000Z",
      id: "read-recent",
      readAt: "2026-07-10T08:30:00.000Z",
    });
    const unreadOlder = makeNotification({
      createdAt: "2026-07-10T06:00:00.000Z",
      id: "unread-older",
      readAt: null,
    });
    const unreadNewer = makeNotification({
      createdAt: "2026-07-10T07:30:00.000Z",
      id: "unread-newer",
      readAt: null,
    });

    const sections = groupNotificationsByDay(
      [readRecent, unreadOlder, unreadNewer],
      NOW,
    );

    expect(sections[0].notifications.map((n) => n.id)).toEqual([
      "unread-newer",
      "unread-older",
      "read-recent",
    ]);
  });

  it("returns no sections for an empty notification list", () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });
});
