import { z } from "zod";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authAccounts, formFillOutcomes } from "../../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../database/testing/test-database";
import { formMapTools } from "../mcp/tools/form-map-tools";
import {
  FormMapsService,
  PgFormMapStore,
  servedRules,
} from "./form-maps.service";

const USERS = [
  "ana@example.com",
  "ben@example.com",
  "cle@example.com",
  "dan@example.com",
];
const EMAIL_FIELD = { fieldKey: "email", signature: "input:email:email:email" };
const NAME_FIELD = {
  fieldKey: "fullName",
  signature: "input:text:name:full name",
};

let db: TestDatabase;
let maps: FormMapsService;

const report = (
  user: string,
  over: Partial<Parameters<FormMapsService["report"]>[1]> = {},
) =>
  maps.report(user, {
    aiUsed: false,
    confirmed: [EMAIL_FIELD],
    missed: [],
    site: "Lever.co",
    ...over,
  });

describe("FormMapsService (US-205)", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
    await db.db
      .insert(authAccounts)
      .values(USERS.map((email) => ({ email, role: "user" as const })));
    maps = new FormMapsService(new PgFormMapStore(db.db));
  });

  it("serves a rule only once two different candidates confirmed it", async () => {
    await report(USERS[0]!);
    await report(USERS[0]!); // the same candidate again counts once
    expect(await maps.rules("lever.co")).toEqual([]);
    await report(USERS[1]!);
    expect(await maps.rules("lever.co")).toEqual([EMAIL_FIELD]);
    expect(await maps.rules("greenhouse.io")).toEqual([]);
  });

  it("withdraws a rule that keeps failing, and counts each fill without a value", async () => {
    await report(USERS[0]!, {
      aiUsed: true,
      confirmed: [EMAIL_FIELD, NAME_FIELD],
    });
    await report(USERS[1]!, { confirmed: [EMAIL_FIELD, NAME_FIELD] });
    expect(await maps.rules("lever.co")).toHaveLength(2);
    await report(USERS[2]!, { confirmed: [EMAIL_FIELD], missed: [NAME_FIELD] });
    await report(USERS[3]!, { confirmed: [EMAIL_FIELD], missed: [NAME_FIELD] });
    // 2 confirmations, 2 misses: no longer trusted.
    expect(await maps.rules("lever.co")).toEqual([EMAIL_FIELD]);

    const outcomes = await db.db.select().from(formFillOutcomes);
    expect(outcomes).toHaveLength(4);
    expect(outcomes.filter((o) => o.aiUsed)).toHaveLength(1);
    expect(Object.keys(outcomes[0]!).sort()).toEqual([
      "aiUsed",
      "createdAt",
      "id",
      "site",
    ]);
  });

  it("goes with an account deleted", async () => {
    await report(USERS[0]!);
    await report(USERS[1]!);
    await db.db.delete(authAccounts);
    expect(await maps.rules("lever.co")).toEqual([]);
  });
});

describe("servedRules", () => {
  it("serves nothing when two data tie for one field", () => {
    expect(
      servedRules([
        { fieldKey: "email", misses: 0, oks: 3, signature: "s" },
        { fieldKey: "phone", misses: 0, oks: 3, signature: "s" },
        { fieldKey: "city", misses: 0, oks: 2, signature: "t" },
        { fieldKey: "phone", misses: 0, oks: 4, signature: "t" },
      ]),
    ).toEqual([{ fieldKey: "phone", signature: "t" }]);
  });
});

describe("formMapTools", () => {
  it("refuses an address in place of a site name", () => {
    const [read] = formMapTools({
      maps: { report: async () => undefined, rules: async () => [] },
    });
    const schema = z.object(read!.inputSchema);
    expect(schema.safeParse({ site: "lever.co" }).success).toBe(true);
    expect(schema.safeParse({ site: "https://lever.co/x" }).success).toBe(
      false,
    );
  });
});
