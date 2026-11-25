import { ACCOUNT_STATUS_SUSPENDED } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type {
  AgentTokenRecord,
  AgentTokensStore,
} from "./agent-tokens.pg-store";
import { AgentTokensService, hashAgentToken } from "./agent-tokens.service";

const NOW = new Date("2026-11-25T10:00:00.000Z");
const EMAIL = "user@example.com";

function makeRecord(
  overrides: Partial<AgentTokenRecord> = {},
): AgentTokenRecord {
  return {
    createdAt: new Date("2026-11-20T10:00:00.000Z"),
    creditsSpent: 0,
    dailyCreditCap: 20,
    expiresAt: new Date("2026-12-20T10:00:00.000Z"),
    id: "token-1",
    lastFour: "abcd",
    lastUsedAt: null,
    name: "Claude Code",
    revokedAt: null,
    scopes: ["profile:read"],
    spentDay: null,
    tokenHash: "hash",
    userEmail: EMAIL,
    accessExpiresAt: null,
    oauthClientId: null,
    previousRefreshHash: null,
    refreshHash: null,
    resource: null,
    ...overrides,
  };
}

function setup(
  record: AgentTokenRecord | null = makeRecord(),
  state: { status: string; sessionsValidFrom: string | null } | null = {
    sessionsValidFrom: null,
    status: "active",
  },
) {
  const store = {
    countActive: vi.fn(async () => 0),
    findByHash: vi.fn(async () => record),
    insert: vi.fn(async (token) => makeRecord({ ...token, id: "new" })),
    touch: vi.fn(async () => undefined),
  } as unknown as AgentTokensStore;
  const authService = { readAccountState: vi.fn(async () => state) };
  const service = new AgentTokensService(
    store,
    authService as never,
    () => NOW,
  );

  return { authService, service, store };
}

const RAW = `jsk_${"a".repeat(43)}`;

describe("AgentTokensService", () => {
  it("creates a jsk_ token, stores only its hash and returns it once", async () => {
    const { service, store } = setup();

    const { token, summary } = await service.create(EMAIL, {
      dailyCreditCap: 20,
      name: "Claude Code",
      scopes: ["profile:read"],
      ttlDays: 30,
    });

    expect(token).toMatch(/^jsk_[A-Za-z0-9_-]{43}$/);
    const inserted = vi.mocked(store.insert).mock.calls[0][0];
    expect(inserted.tokenHash).toBe(hashAgentToken(token));
    expect(JSON.stringify(inserted)).not.toContain(token);
    expect(inserted.expiresAt.toISOString()).toBe("2026-12-25T10:00:00.000Z");
    expect(summary).not.toHaveProperty("tokenHash");
  });

  it("refuses an 11th active token", async () => {
    const { service, store } = setup();
    vi.mocked(store.countActive).mockResolvedValue(10);

    await expect(
      service.create(EMAIL, {
        dailyCreditCap: 0,
        name: "x",
        scopes: ["jobs:read"],
        ttlDays: 1,
      }),
    ).rejects.toThrow(/10 jetons/);
  });

  it("resolves a valid token to a plain user principal", async () => {
    const { service } = setup();

    const principal = await service.authenticate(RAW);

    expect(principal?.userEmail).toBe(EMAIL);
    expect(principal?.scopes.has("profile:read")).toBe(true);
  });

  it.each([
    ["malformed", undefined, makeRecord(), "jsk_short"],
    ["unknown", undefined, null, RAW],
    ["revoked", undefined, makeRecord({ revokedAt: NOW }), RAW],
    ["expired", undefined, makeRecord({ expiresAt: NOW }), RAW],
    [
      "suspended",
      { sessionsValidFrom: null, status: ACCOUNT_STATUS_SUSPENDED },
      makeRecord(),
      RAW,
    ],
    [
      "logged out everywhere",
      { sessionsValidFrom: "2026-11-21T00:00:00.000Z", status: "active" },
      makeRecord(),
      RAW,
    ],
    ["account gone", null, makeRecord(), RAW],
  ] as const)("refuses a %s token", async (_label, state, record, raw) => {
    const { service } = setup(
      record,
      state === undefined
        ? { sessionsValidFrom: null, status: "active" }
        : state,
    );

    expect(await service.authenticate(raw)).toBeNull();
  });

  it("records last use at most once a minute", async () => {
    const { service, store } = setup(
      makeRecord({ lastUsedAt: new Date(NOW.getTime() - 30_000) }),
    );

    await service.authenticate(RAW);

    expect(store.touch).not.toHaveBeenCalled();
  });
});
