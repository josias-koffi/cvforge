import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { profileRomeCompetences, searchProjectRome } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgProfileCompetencesStore } from "../profiles/profile-competences.pg-store";
import { PgSearchProjectRomeStore } from "../search-projects/search-project-rome.pg-store";
import { PrivacyService } from "./privacy.service";

const ANA = "ana@example.com";
const AT = new Date("2026-09-24T10:00:00.000Z");

let testDatabase: TestDatabase;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
});

afterAll(async () => {
  await testDatabase.close();
});

/** Only the ROME stores are real: the rest of the export has its own tests. */
function service() {
  const empty = async () => [];
  const none = new Proxy({}, { get: () => empty });

  return new PrivacyService(
    { exportUserData: async () => ({ account: { email: ANA } }) } as never,
    none as never,
    none as never,
    none as never,
    { findByUserEmail: async () => null } as never,
    none as never,
    none as never,
    none as never,
    none as never,
    none as never,
    new PgSearchProjectRomeStore(testDatabase.db),
    new PgProfileCompetencesStore(testDatabase.db),
  );
}

describe("PrivacyService.exportUserData, ROME choices (US-118)", () => {
  it("gives back every appellation and competence of the account, dismissed ones included", async () => {
    await testDatabase.reset();
    const appellation = {
      libelle: "Développeur / Développeuse web",
      metierCode: "M1855",
      metierLibelle: "Développeur / Développeuse web",
      profileId: "p1",
      updatedAt: AT,
    };
    await testDatabase.db.insert(searchProjectRome).values([
      { ...appellation, appellationCode: "38976", score: 0.9, source: "romeo", status: "confirmed", userEmail: ANA },
      { ...appellation, appellationCode: "11574", score: 0.8, source: "romeo", status: "dismissed", userEmail: ANA },
      { ...appellation, appellationCode: "38976", score: null, source: "manual", status: "confirmed", userEmail: "bob@example.com" },
    ]);
    await testDatabase.db.insert(profileRomeCompetences).values([
      { competenceCode: "100001", libelle: "Concevoir une API", profileId: "p1", score: 0.7, status: "inferred", type: "SAVOIR_FAIRE", updatedAt: AT, userEmail: ANA },
      { competenceCode: "100002", libelle: "Animer une équipe", profileId: "p1", score: 0.4, status: "dismissed", type: "SAVOIR_FAIRE", updatedAt: AT, userEmail: ANA },
      { competenceCode: "100001", libelle: "Concevoir une API", profileId: "p9", score: 0.7, status: "inferred", type: "SAVOIR_FAIRE", updatedAt: AT, userEmail: "bob@example.com" },
    ]);

    const exported = await service().exportUserData(ANA);

    expect(exported.ownedSearchJobs).toEqual([
      { ...appellation, appellationCode: "11574", score: 0.8, source: "romeo", status: "dismissed" },
      { ...appellation, appellationCode: "38976", score: 0.9, source: "romeo", status: "confirmed" },
    ]);
    expect(exported.ownedProfileCompetences.map((row) => [row.competenceCode, row.status])).toEqual([
      ["100001", "inferred"],
      ["100002", "dismissed"],
    ]);
    // The owner's address is the export's own key, not repeated per row.
    expect(JSON.stringify(exported.ownedSearchJobs)).not.toContain("example.com");
  });
});
