import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  agentToolCalls,
  authAccounts,
  formFillSessions,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAgentTokensStore } from "../agent-access/agent-tokens.pg-store";
import {
  FormMapsService,
  PgFormMapStore,
} from "../agent-access/form-maps/form-maps.service";
import { PgAgentAccessExportStore } from "./agent-access-export.pg-store";

const ANA = "ana@example.com";
const BEN = "ben@example.com";
let db: TestDatabase;

async function tokenFor(userEmail: string) {
  return new PgAgentTokensStore(db.db).insert({
    dailyCreditCap: 20,
    expiresAt: new Date("2027-01-01"),
    lastFour: "abcd",
    name: "Extension JobSpark",
    scopes: ["jobs:read"],
    tokenHash: `${userEmail[0]}`.repeat(64),
    userEmail,
  });
}

describe("PgAgentAccessExportStore (RGPD export, E32/E33)", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
    await db.db.insert(authAccounts).values([
      { email: ANA, role: "user" },
      { email: BEN, role: "user" },
    ]);
  });

  it("exports the candidate's tokens, actions, fills and form map votes, never a token fingerprint", async () => {
    const token = await tokenFor(ANA);
    await tokenFor(BEN);
    await db.db.insert(agentToolCalls).values({
      creditsSpent: 2,
      durationMs: 40,
      outcome: "ok",
      tokenId: token.id,
      tool: "start_form_fill",
      userEmail: ANA,
    });
    await db.db.insert(formFillSessions).values({
      applicationId: "app-1",
      expiresAt: new Date("2026-11-27T12:15:00Z"),
      tokenId: token.id,
      userEmail: ANA,
    });
    await new FormMapsService(new PgFormMapStore(db.db)).report(ANA, {
      aiUsed: true,
      confirmed: [{ fieldKey: "email", signature: "input:email:email:email" }],
      missed: [],
      site: "lever.co",
    });

    const exported = await new PgAgentAccessExportStore(
      db.db,
    ).exportByUserEmail(ANA);
    expect(exported.tokens).toEqual([
      expect.objectContaining({ lastFour: "abcd", name: "Extension JobSpark" }),
    ]);
    expect(JSON.stringify(exported)).not.toContain("a".repeat(64));
    expect(exported.toolCalls).toEqual([
      expect.objectContaining({ creditsSpent: 2, tool: "start_form_fill" }),
    ]);
    expect(exported.formFillSessions).toEqual([
      expect.objectContaining({ applicationId: "app-1", calls: 0 }),
    ]);
    expect(exported.formMapVotes).toEqual([
      expect.objectContaining({
        fieldKey: "email",
        ok: true,
        site: "lever.co",
      }),
    ]);

    const other = await new PgAgentAccessExportStore(db.db).exportByUserEmail(
      BEN,
    );
    expect(other.toolCalls).toEqual([]);
    expect(other.formMapVotes).toEqual([]);
  });
});
