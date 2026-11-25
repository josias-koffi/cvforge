import { describe, expect, it } from "vitest";
import { MemoryRateLimitStore } from "../../shared/rate-limit/rate-limit.memory-store";
import {
  MCP_CALLS_PER_MINUTE,
  McpRequestGate,
  resolveMcpAllowedOrigins,
} from "./mcp-request-gate";

const EXTENSION = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
const principal = {
  scopes: new Set<never>(),
  tokenId: "t1",
  userEmail: "u@example.com",
};
const tokens = {
  authenticate: async (token?: string) =>
    token === "jsk_good" ? principal : null,
};

function gate(now = 0) {
  return new McpRequestGate(
    tokens,
    new MemoryRateLimitStore(),
    [EXTENSION],
    () => now,
  );
}

const auth = { authorization: "Bearer jsk_good" };

describe("McpRequestGate", () => {
  it("admits a request without Origin (Claude Code) and a listed extension", async () => {
    await expect(gate().admit(auth)).resolves.toBe(principal);
    await expect(gate().admit({ ...auth, origin: EXTENSION })).resolves.toBe(
      principal,
    );
  });

  it("refuses any other Origin with 403", async () => {
    await expect(
      gate().admit({ ...auth, origin: "https://evil.example" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      gate().admit({ ...auth, origin: "chrome-extension://another" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("refuses a missing or bad token with 401 and a large body with 413", async () => {
    await expect(gate().admit({})).rejects.toMatchObject({ status: 401 });
    await expect(
      gate().admit({ authorization: "Bearer jsk_bad" }),
    ).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      gate().admit({ ...auth, "content-length": String(2 * 1024 * 1024) }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("limits calls per token per minute", async () => {
    const limited = gate(1_000);

    for (let call = 0; call < MCP_CALLS_PER_MINUTE; call += 1) {
      await limited.admit(auth);
    }

    await expect(limited.admit(auth)).rejects.toMatchObject({ status: 429 });
  });

  it("reads the allowed origins from the environment", () => {
    expect(
      resolveMcpAllowedOrigins({ MCP_ALLOWED_ORIGINS: ` ${EXTENSION} , ,x ` }),
    ).toEqual([EXTENSION, "x"]);
  });
});
