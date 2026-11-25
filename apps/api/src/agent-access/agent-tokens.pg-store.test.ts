import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { agentTokens, authAccounts } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAgentTokensStore } from "./agent-tokens.pg-store";

const EMAIL = "user@example.com";
const NOW = new Date("2026-11-25T10:00:00.000Z");
const DAY = "2026-11-25";

let testDatabase: TestDatabase;
let store: PgAgentTokensStore;

async function insertToken(
  overrides: { dailyCreditCap?: number; tokenHash?: string } = {},
) {
  return store.insert({
    dailyCreditCap: overrides.dailyCreditCap ?? 10,
    expiresAt: new Date("2026-12-25T10:00:00.000Z"),
    lastFour: "abcd",
    name: "Claude Code",
    scopes: ["profile:read"],
    tokenHash: overrides.tokenHash ?? "hash-1",
    userEmail: EMAIL,
  });
}

describe("PgAgentTokensStore", () => {
  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAgentTokensStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    await testDatabase.db
      .insert(authAccounts)
      .values({ email: EMAIL, role: "user" });
  });

  it("finds a token by its hash only", async () => {
    const token = await insertToken();

    expect((await store.findByHash("hash-1"))?.id).toBe(token.id);
    expect(await store.findByHash("other")).toBeNull();
  });

  it("revokes once, and only the owner's token", async () => {
    const token = await insertToken();

    expect(await store.revoke("someone@example.com", token.id, NOW)).toBe(
      false,
    );
    expect(await store.revoke(EMAIL, token.id, NOW)).toBe(true);
    expect(await store.revoke(EMAIL, token.id, NOW)).toBe(false);
    expect(await store.countActive(EMAIL, NOW)).toBe(0);
  });

  it("never lets reservations exceed the daily cap, even concurrently", async () => {
    const token = await insertToken({ dailyCreditCap: 10 });

    const results = await Promise.all(
      Array.from({ length: 5 }, () => store.reserveCredits(token.id, 3, DAY)),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    const [row] = await testDatabase.db
      .select()
      .from(agentTokens)
      .where(eq(agentTokens.id, token.id));
    expect(row.creditsSpent).toBe(9);
  });

  it("starts a new day from zero and refunds within the same day", async () => {
    const token = await insertToken({ dailyCreditCap: 3 });

    expect(await store.reserveCredits(token.id, 3, DAY)).toBe(true);
    expect(await store.reserveCredits(token.id, 1, DAY)).toBe(false);
    await store.refundCredits(token.id, 3, DAY);
    expect(await store.reserveCredits(token.id, 3, DAY)).toBe(true);
    expect(await store.reserveCredits(token.id, 3, "2026-11-26")).toBe(true);
  });

  it("purges only the calls older than the cut-off", async () => {
    const token = await insertToken();
    const call = {
      creditsSpent: 0,
      durationMs: 5,
      outcome: "ok" as const,
      tokenId: token.id,
      userEmail: EMAIL,
    };
    await store.recordCall({ ...call, tool: "old" });
    await testDatabase.db.execute(
      sql`update agent_tool_calls set created_at = now() - interval '91 days'`,
    );
    await store.recordCall({ ...call, tool: "recent" });

    expect(
      await store.purgeCallsBefore(new Date(Date.now() - 90 * 86_400_000)),
    ).toBe(1);
    expect((await store.listCalls(EMAIL, 10)).map((c) => c.tool)).toEqual([
      "recent",
    ]);
  });

  it("logs calls with the token name and drops them with the account", async () => {
    const token = await insertToken();
    await store.recordCall({
      creditsSpent: 3,
      durationMs: 120,
      outcome: "ok",
      tokenId: token.id,
      tool: "generate_cv",
      userEmail: EMAIL,
    });

    const calls = await store.listCalls(EMAIL, 10);
    expect(calls).toMatchObject([
      { tokenName: "Claude Code", tool: "generate_cv" },
    ]);

    await testDatabase.db
      .delete(authAccounts)
      .where(eq(authAccounts.email, EMAIL));
    expect(await store.listByUserEmail(EMAIL)).toEqual([]);
    expect(await store.listCalls(EMAIL, 10)).toEqual([]);
  });
});
