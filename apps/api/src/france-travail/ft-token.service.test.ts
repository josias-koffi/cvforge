import { describe, expect, it, vi } from "vitest";
import { SourceRateLimiter } from "../shared/rate-limit/source-rate-limiter";
import { FtTokenError, FtTokenService } from "./ft-token.service";

const CREDENTIALS = { clientId: "id", clientSecret: "secret", timeoutMs: 1000 };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function createService(
  fetchImpl: ReturnType<typeof vi.fn>,
  clock = { now: 0 },
) {
  return new FtTokenService(
    CREDENTIALS,
    fetchImpl as unknown as typeof globalThis.fetch,
    () => clock.now,
    new SourceRateLimiter({
      now: () => clock.now,
      requestsPerSecond: 1000,
      sleep: async () => {},
    }),
  );
}

function scopeOf(call: unknown[]): string | null {
  return new URLSearchParams(String((call[1] as RequestInit).body)).get(
    "scope",
  );
}

describe("FtTokenService", () => {
  it("keeps one token per scope", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(async (_url: string, init: RequestInit) =>
        jsonResponse({
          access_token: `t-${new URLSearchParams(String(init.body)).get("scope")}`,
          expires_in: 1499,
        }),
      );
    const service = createService(fetchImpl);

    expect(await service.accessToken("api_romeov2")).toBe("t-api_romeov2");
    expect(await service.accessToken("api_offresdemploiv2 o2dsoffre")).toBe(
      "t-api_offresdemploiv2 o2dsoffre",
    );
    expect(await service.accessToken("api_romeov2")).toBe("t-api_romeov2");
    expect(fetchImpl.mock.calls.map(scopeOf)).toEqual([
      "api_romeov2",
      "api_offresdemploiv2 o2dsoffre",
    ]);
  });

  it("shares one request between concurrent callers of a scope", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ access_token: "t", expires_in: 1499 }));
    const service = createService(fetchImpl);

    const tokens = await Promise.all([
      service.accessToken("api_romeov2"),
      service.accessToken("api_romeov2"),
      service.accessToken("api_romeov2"),
    ]);

    expect(tokens).toEqual(["t", "t", "t"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refreshes a token a minute before it expires", async () => {
    const clock = { now: 0 };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "first", expires_in: 1499 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "second", expires_in: 1499 }),
      );
    const service = createService(fetchImpl, clock);

    await service.accessToken("s");
    clock.now = (1499 - 60) * 1000 - 1;
    expect(await service.accessToken("s")).toBe("first");
    clock.now += 1;
    expect(await service.accessToken("s")).toBe("second");
  });

  it("caches a token whose lifetime the server left out", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ access_token: "t" }));
    const service = createService(fetchImpl);

    await service.accessToken("s");
    await service.accessToken("s");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("asks again after a token is invalidated", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () =>
        jsonResponse({ access_token: "t", expires_in: 1499 }),
      );
    const service = createService(fetchImpl);

    await service.accessToken("s");
    service.invalidate("s");
    await service.accessToken("s");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps the OAuth error, so invalid_scope is told apart from a bad secret", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: "invalid_scope",
            error_description: "Unknown/invalid scope(s)",
          },
          400,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "invalid_client" }, 401));
    const service = createService(fetchImpl);

    const scopeError = await service
      .accessToken("api_romeov2")
      .catch((error: unknown) => error);
    expect(scopeError).toBeInstanceOf(FtTokenError);
    expect((scopeError as FtTokenError).isInvalidScope).toBe(true);
    expect((scopeError as FtTokenError).detail).toContain(
      "Unknown/invalid scope",
    );

    const clientError = await service
      .accessToken("api_romeov2")
      .catch((error: unknown) => error);
    expect((clientError as FtTokenError).code).toBe("invalid_client");
    expect((clientError as FtTokenError).isInvalidScope).toBe(false);
  });

  it("does not cache a failure: the next call asks again", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream down", { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "t", expires_in: 1499 }),
      );
    const service = createService(fetchImpl);

    const error = await service
      .accessToken("s")
      .catch((failure: unknown) => failure);
    expect((error as FtTokenError).code).toBeNull();
    expect((error as FtTokenError).detail).toBe("upstream down");
    expect(await service.accessToken("s")).toBe("t");
  });

  it("refuses a success without a token", async () => {
    const service = createService(vi.fn().mockResolvedValue(jsonResponse({})));

    await expect(service.accessToken("s")).rejects.toThrow(/No access token/);
  });
});
