import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgProfileCompetencesStore } from "../profiles/profile-competences.pg-store";
import { PgRomeStore } from "../rome/rome.pg-store";
import type { StoredJob } from "./jobs.types";
import { PgRomeMatchingReader } from "./rome-matching.pg-reader";

let testDatabase: TestDatabase;
let reader: PgRomeMatchingReader;

const ANA = "ana@example.com";

function job(romeCode: string | null) {
  return { romeCode } as StoredJob;
}

/** 101 métiers share "rigueur": past a hundred, a competence is generic. */
async function seedReferential() {
  const metiers = Array.from({ length: 101 }, (_, index) => ({
    code: `X${String(index).padStart(4, "0")}`,
    domaineCode: "X00",
    domaineLibelle: "",
    grandDomaineCode: "X",
    grandDomaineLibelle: "",
    libelle: `Métier ${index}`,
  }));

  await new PgRomeStore(testDatabase.db).replace({
    appellations: [],
    competences: [
      {
        code: "PETRIR",
        libelle: "Pétrir des pâtes",
        type: "COMPETENCE-DETAILLEE",
      },
      { code: "RIGUEUR", libelle: "Faire preuve de rigueur", type: "SAVOIR" },
      { code: "CODER", libelle: "Programmer", type: "SAVOIR" },
    ],
    links: [
      { competenceCode: "PETRIR", metierCode: "X0000" },
      { competenceCode: "CODER", metierCode: "X0001" },
      ...metiers.map((metier) => ({
        competenceCode: "RIGUEUR",
        metierCode: metier.code,
      })),
    ],
    metiers,
    versions: { competences: null, fichesMetiers: null, metiers: null },
  });
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  reader = new PgRomeMatchingReader(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgRomeMatchingReader", () => {
  it("reads the CV's competences, the pool's métiers and the generic ones", async () => {
    await seedReferential();
    const competences = new PgProfileCompetencesStore(testDatabase.db);
    await competences.replaceInferred(ANA, "p1", "f", [
      { code: "PETRIR", libelle: "Pétrir", score: 0.9, type: "SAVOIR" },
      { code: "GONE", libelle: "Retirée depuis", score: 0.8, type: "SAVOIR" },
      { code: "NOPE", libelle: "Fausse", score: 0.8, type: "SAVOIR" },
    ]);
    await competences.dismiss(ANA, "p1", "NOPE");

    const context = await reader.forRun().contextFor({
      jobs: [job("X0000"), job("X0000"), job(null), job("UNKNOWN")],
      profileId: "p1",
      projectCodes: ["X0001"],
      userEmail: ANA,
    });

    expect(context.projectCodes).toEqual(["X0001"]);
    expect(context.genericCodes).toEqual(new Set(["RIGUEUR"]));
    expect(
      [...context.profileCompetences].sort((a, b) =>
        a.code.localeCompare(b.code),
      ),
    ).toEqual([
      { code: "GONE", label: "Retirée depuis" },
      { code: "PETRIR", label: "Pétrir des pâtes" },
    ]);
    expect(
      [...(context.metierCompetences.get("X0000") ?? [])].sort((a, b) =>
        a.code.localeCompare(b.code),
      ),
    ).toEqual([
      { code: "PETRIR", label: "Pétrir des pâtes" },
      { code: "RIGUEUR", label: "Faire preuve de rigueur" },
    ]);
    expect(context.metierCompetences.get("UNKNOWN")).toEqual([]);
  });

  it("reads each métier once per run, whoever needs it next", async () => {
    await seedReferential();
    const run = reader.forRun();

    await run.contextFor({
      jobs: [job("X0000")],
      profileId: "p1",
      projectCodes: [],
      userEmail: ANA,
    });
    const second = await run.contextFor({
      jobs: [job("X0001")],
      profileId: "p2",
      projectCodes: [],
      userEmail: ANA,
    });

    expect([...second.metierCompetences.keys()].sort()).toEqual([
      "X0000",
      "X0001",
    ]);
    expect(second.profileCompetences).toEqual([]);
  });
});
