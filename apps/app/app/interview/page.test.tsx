import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireSession: requireSessionMock,
}));

import InterviewPage from "./page";

describe("InterviewPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the protected interview streaming workspace", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await InterviewPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Interview vocal");
    expect(markup).toContain("Streaming STT progressif");
    expect(markup).toContain("Demarrer l&#x27;entretien");
    expect(markup).toContain("Transcription partielle");
  });
});
