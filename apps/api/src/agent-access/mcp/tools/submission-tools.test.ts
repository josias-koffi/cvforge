import { describe, expect, it, vi } from "vitest";
import { submissionTools } from "./submission-tools";

describe("record_submission", () => {
  it("records the proof for the token's user, under applications:write", async () => {
    const record = vi.fn(async () => ({
      confirmed: true,
      id: "s1",
      submittedAt: "2026-11-26T11:00:00.000Z",
    }));
    const [tool] = submissionTools({ submissions: { record } as never });
    const args = {
      applicationId: "a1",
      confirmed: true,
      documents: [],
      fields: [],
      formUrl: "https://jobs.example.com/apply",
    };

    expect(
      await tool!.run(args, {
        principal: { userEmail: "ana@example.com" },
      } as never),
    ).toEqual({
      confirmed: true,
      submissionId: "s1",
      submittedAt: "2026-11-26T11:00:00.000Z",
    });
    expect(record).toHaveBeenCalledWith("ana@example.com", args);
    expect(tool!.scopes).toEqual(["applications:write"]);
  });
});
