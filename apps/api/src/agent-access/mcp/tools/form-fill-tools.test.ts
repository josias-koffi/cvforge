import { describe, expect, it, vi } from "vitest";
import { formFillTools } from "./form-fill-tools";

describe("start_form_fill", () => {
  it("costs two credits on the token's cap and opens the session", async () => {
    const start = vi.fn(async () => ({ creditsSpent: 2, fillSessionId: "s1" }));
    const [tool] = formFillTools({ fills: { start } as never });
    const principal = { tokenId: "t1", userEmail: "ana@example.com" };

    expect(tool!.cost?.({ applicationId: "a1" } as never)).toBe(2);
    expect(
      await tool!.run({ applicationId: "a1" }, { principal } as never),
    ).toEqual({
      creditsSpent: 2,
      fillSessionId: "s1",
    });
    expect(start).toHaveBeenCalledWith(principal, "a1");
    expect(tool!.scopes).toEqual(["documents:generate"]);
  });
});
