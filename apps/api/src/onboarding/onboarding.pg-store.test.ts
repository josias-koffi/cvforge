import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authAccounts, profileRegistries, profiles } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgOnboardingStore } from "./onboarding.pg-store";

const EMAIL = "jane@example.com";
const FIRST = new Date("2026-09-25T10:00:00.000Z");
const LATER = new Date("2026-09-26T10:00:00.000Z");
const MIGRATION = resolve(__dirname, "../../drizzle/0045_onboarding.sql");

describe("PgOnboardingStore", () => {
  let testDatabase: TestDatabase;
  let store: PgOnboardingStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgOnboardingStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  const addAccount = (email = EMAIL) =>
    testDatabase.db.insert(authAccounts).values({ email, role: "user" });

  it("reads an unknown account as not started", async () => {
    await expect(store.read(EMAIL)).resolves.toEqual({
      completedAt: null,
      gettingStartedDismissedAt: null,
    });
  });

  it("keeps the first completion and dismissal instants", async () => {
    await addAccount();

    await store.markCompleted(EMAIL, FIRST);
    await store.markCompleted(EMAIL, LATER);
    await store.markGettingStartedDismissed(EMAIL, LATER);

    await expect(store.read(EMAIL)).resolves.toEqual({
      completedAt: FIRST,
      gettingStartedDismissedAt: LATER,
    });
  });

  it("marks only accounts whose profile is ready when the migration runs", async () => {
    await addAccount("ready@example.com");
    await addAccount("empty@example.com");
    await addAccount("nameless@example.com");
    await addProfile("ready@example.com", "Jane", ["TypeScript"]);
    await addProfile("empty@example.com", "Jo", []);
    await addProfile("nameless@example.com", "  ", ["SQL"]);

    await runBackfill();

    const completed = async (email: string) =>
      (await store.read(email)).completedAt !== null;

    await expect(completed("ready@example.com")).resolves.toBe(true);
    await expect(completed("empty@example.com")).resolves.toBe(false);
    await expect(completed("nameless@example.com")).resolves.toBe(false);
  });

  async function addProfile(email: string, firstName: string, skills: string[]) {
    await testDatabase.db
      .insert(profileRegistries)
      .values({ activeProfileId: `${email}-p`, userEmail: email });
    await testDatabase.db.insert(profiles).values({
      id: `${email}-p`,
      identity: { firstName } as never,
      meta: {} as never,
      position: 0,
      preferences: {} as never,
      sections: { experiences: [], softSkills: [], technicalSkills: skills } as never,
      userEmail: email,
    });
  }

  /** The migration's last statement, replayed on rows written after it ran. */
  async function runBackfill() {
    const statements = readFileSync(MIGRATION, "utf8").split(
      "--> statement-breakpoint",
    );

    await testDatabase.db.execute(sql.raw(statements.at(-1) ?? ""));
  }
});
