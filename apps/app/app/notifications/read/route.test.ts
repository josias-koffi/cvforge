import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { POST } from "./route";

describe("POST /notifications/read", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "cookie-token" }],
    });
    globalThis.fetch = vi.fn();
  });

  it("marks a notification as read then redirects back to the center", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const formData = new FormData();
    formData.set("notificationId", "notif-001");

    const response = await POST(
      new Request("http://localhost:3000/notifications/read", {
        body: formData,
        method: "POST",
      }),
    );

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3333/notifications/notif-001/read",
      {
        headers: {
          cookie: "cvforge_session=cookie-token",
        },
        method: "POST",
      },
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/notifications?updated=notif-001",
    );
  });

  it("stops early when the notification id is missing", async () => {
    const formData = new FormData();

    const response = await POST(
      new Request("http://localhost:3000/notifications/read", {
        body: formData,
        method: "POST",
      }),
    );

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/notifications?error=notification_missing",
    );
  });
});
