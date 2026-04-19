import { describe, expect, it, vi } from "vitest";
import { fetchSession } from "./session-client";

describe("fetchSession", () => {
  it("should return the decoded session payload", async () => {
    const payload = {
      session: {
        email: "user@example.com",
        expiresAt: "2026-04-26T20:19:09.000Z",
        role: "user",
      },
    };

    const result = await fetchSession(
      vi.fn().mockResolvedValue({
        json: async () => payload,
        ok: true,
      }) as never,
    );

    expect(result).toEqual(payload);
  });

  it("should reject when no valid session is available", async () => {
    await expect(
      fetchSession(
        vi.fn().mockResolvedValue({
          ok: false,
        }) as never,
      ),
    ).rejects.toThrow("Session introuvable.");
  });
});
