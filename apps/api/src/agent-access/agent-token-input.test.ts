import { describe, expect, it } from "vitest";
import { readAgentTokenCreateRequest } from "./agent-token-input";

describe("readAgentTokenCreateRequest", () => {
  it("applies the defaults and removes duplicate scopes", () => {
    expect(
      readAgentTokenCreateRequest({
        name: "  Claude Code ",
        scopes: ["jobs:read", "jobs:read"],
      }),
    ).toEqual({
      dailyCreditCap: 20,
      name: "Claude Code",
      scopes: ["jobs:read"],
      ttlDays: 30,
    });
  });

  it.each([
    [{ scopes: ["jobs:read"] }, /nom/],
    [{ name: "x", scopes: [] }, /permission/],
    [{ name: "x", scopes: ["admin"] }, /permission/],
    [{ name: "x", scopes: ["jobs:read"], ttlDays: 91 }, /90 jours/],
    [{ name: "x", scopes: ["jobs:read"], ttlDays: 1.5 }, /90 jours/],
    [{ name: "x", scopes: ["jobs:read"], dailyCreditCap: -1 }, /plafond/],
    [{ name: "x", scopes: ["jobs:read"], dailyCreditCap: 201 }, /plafond/],
  ])("rejects %j", (body, message) => {
    expect(readAgentTokenCreateRequest(body)).toMatch(message);
  });
});
