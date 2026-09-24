import { emptySearchProject } from "@cvforge/types";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgRomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import { ROME_CODE_HOLDERS } from "../rome/rome.module";
import { PgRomeStore } from "../rome/rome.pg-store";
import { PgSearchProjectRomeStore } from "./search-project-rome.pg-store";
import { PgSearchProjectsStore } from "./search-projects.pg-store";

let testDatabase: TestDatabase;
let store: PgSearchProjectRomeStore;
let romeStore: PgRomeStore;

const ANA = "ana@example.com";
const BOB = "bob@example.com";

const FULL_STACK = {
  code: "38976",
  libelle: "Développeur / Développeuse full-stack",
  metierCode: "M1855",
  metierLibelle: "Développeur / Développeuse web",
};
const BACK_END = {
  code: "200151",
  libelle: "Développeur / Développeuse back-end",
  metierCode: "M1855",
  metierLibelle: "Développeur / Développeuse web",
};
const BAKER = {
  code: "11573",
  libelle: "Boulanger / Boulangère",
  metierCode: "D1102",
  metierLibelle: "Boulanger / Boulangère",
};

async function seedReferential() {
  await romeStore.replace({
    appellations: [
      {
        ...FULL_STACK,
        libelleCourt: "",
        libelleSearch: "developpeur / developpeuse full-stack",
      },
      {
        ...BACK_END,
        libelleCourt: "",
        libelleSearch: "developpeur / developpeuse back-end",
      },
      { ...BAKER, libelleCourt: "", libelleSearch: "boulanger / boulangere" },
      {
        code: "99",
        libelle: "Chef boulanger 100% bio",
        libelleCourt: "",
        libelleSearch: "chef boulanger 100% bio",
        metierCode: "D1102",
      },
    ],
    competences: [],
    links: [],
    metiers: [
      {
        code: "M1855",
        domaineCode: "M18",
        domaineLibelle: "",
        grandDomaineCode: "M",
        grandDomaineLibelle: "",
        libelle: "Développeur / Développeuse web",
      },
      {
        code: "D1102",
        domaineCode: "D11",
        domaineLibelle: "",
        grandDomaineCode: "D",
        grandDomaineLibelle: "",
        libelle: "Boulanger / Boulangère",
      },
    ],
    versions: { competences: null, fichesMetiers: null, metiers: null },
  });
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgSearchProjectRomeStore(testDatabase.db);
  romeStore = new PgRomeStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgSearchProjectRomeStore", () => {
  it("lists confirmed first, then suggestions by score, and hides dismissed ones", async () => {
    await store.replaceSuggestions(ANA, "p1", [
      { ...BACK_END, score: 0.6 },
      { ...FULL_STACK, score: 0.9 },
      { ...BAKER, score: 0.2 },
    ]);
    await store.confirm(ANA, "p1", BACK_END);
    await store.dismiss(ANA, "p1", BAKER.code);

    expect(await store.list(ANA, "p1")).toEqual([
      { ...BACK_END, score: 0.6, status: "confirmed" },
      { ...FULL_STACK, score: 0.9, status: "suggested" },
    ]);
    expect(await store.decidedCodes(ANA, "p1")).toEqual(
      new Set([BACK_END.code, BAKER.code]),
    );
    expect(await store.list(ANA, "p2")).toEqual([]);
    expect(await store.list(BOB, "p1")).toEqual([]);
  });

  it("replaces only pending suggestions, and never overrides a decision", async () => {
    await store.replaceSuggestions(ANA, "p1", [
      { ...FULL_STACK, score: 0.9 },
      { ...BAKER, score: 0.2 },
    ]);
    await store.confirm(ANA, "p1", FULL_STACK);

    await store.replaceSuggestions(ANA, "p1", [
      { ...FULL_STACK, score: 0.1 },
      { ...BACK_END, score: 0.5 },
    ]);

    expect(await store.list(ANA, "p1")).toEqual([
      { ...FULL_STACK, score: 0.9, status: "confirmed" },
      { ...BACK_END, score: 0.5, status: "suggested" },
    ]);

    await store.replaceSuggestions(ANA, "p1", []);
    expect((await store.list(ANA, "p1")).map((entry) => entry.status)).toEqual([
      "confirmed",
    ]);
  });

  it("confirms an appellation added by hand, or one dismissed earlier", async () => {
    await store.confirm(ANA, "p1", BAKER);
    await store.dismiss(ANA, "p1", BAKER.code);
    expect(await store.list(ANA, "p1")).toEqual([]);

    await store.confirm(ANA, "p1", BAKER);
    expect(await store.findOne(ANA, "p1", BAKER.code)).toEqual({
      ...BAKER,
      score: null,
      status: "confirmed",
    });
    expect(await store.dismiss(ANA, "p1", "unknown")).toBe(false);
  });

  it("shows the referential's labels, and the snapshot once the code is gone", async () => {
    await seedReferential();
    await store.confirm(ANA, "p1", {
      ...FULL_STACK,
      libelle: "Ancien libellé",
    });
    await store.confirm(ANA, "p1", {
      ...BAKER,
      code: "RETIRED",
      libelle: "Métier retiré",
    });

    expect(await store.list(ANA, "p1")).toEqual([
      { ...FULL_STACK, score: null, status: "confirmed" },
      {
        ...BAKER,
        code: "RETIRED",
        libelle: "Métier retiré",
        score: null,
        status: "confirmed",
      },
    ]);
  });

  it("follows a ROME substitution, declared as a code holder", async () => {
    await store.confirm(ANA, "p1", { ...FULL_STACK, code: "OLD" });
    await store.confirm(ANA, "p2", { ...FULL_STACK, code: "OLD" });
    await store.confirm(ANA, "p2", FULL_STACK);
    await romeStore.recordSubstitutions([
      { entity: "appellation", newCode: FULL_STACK.code, oldCode: "OLD" },
    ]);
    const [substitution] = await romeStore.pendingSubstitutions();

    expect(
      await romeStore.applySubstitution(substitution!, ROME_CODE_HOLDERS),
    ).toEqual({
      search_project_rome: { duplicatesRemoved: 1, rewritten: 1 },
    });
    expect((await store.list(ANA, "p1")).map((entry) => entry.code)).toEqual([
      FULL_STACK.code,
    ]);
    expect((await store.list(ANA, "p2")).map((entry) => entry.code)).toEqual([
      FULL_STACK.code,
    ]);
  });

  it("is purged with the account's search projects", async () => {
    const projects = new PgSearchProjectsStore(testDatabase.db);
    await projects.save(ANA, emptySearchProject("p1"));
    await store.confirm(ANA, "p1", BAKER);
    await store.confirm(BOB, "p1", BAKER);

    expect(await projects.deleteByUserEmail(ANA)).toBe(1);

    const result = (await testDatabase.db.execute(
      sql`select user_email from search_project_rome`,
    )) as unknown as { rows: Array<{ user_email: string }> };
    expect(result.rows).toEqual([{ user_email: BOB }]);
  });
});

describe("PgRomeAppellationsReader", () => {
  it("finds appellations without accents, starting matches first", async () => {
    await seedReferential();
    const reader = new PgRomeAppellationsReader(testDatabase.db);

    expect(
      (await reader.search("BOULANGÈRE", 10)).map((entry) => entry.code),
    ).toEqual([BAKER.code]);
    expect(
      (await reader.search("boulanger", 10)).map((entry) => entry.code),
    ).toEqual([BAKER.code, "99"]);
    expect(await reader.search("développeur", 1)).toHaveLength(1);
    expect(await reader.search("d", 10)).toEqual([]);
  });

  it("treats % and _ as characters, not wildcards", async () => {
    await seedReferential();
    const reader = new PgRomeAppellationsReader(testDatabase.db);

    expect(
      (await reader.search("100%", 10)).map((entry) => entry.code),
    ).toEqual(["99"]);
    expect(await reader.search("d_v", 10)).toEqual([]);
  });

  it("finds one appellation with its métier", async () => {
    await seedReferential();
    const reader = new PgRomeAppellationsReader(testDatabase.db);

    expect(await reader.find(BAKER.code)).toEqual(BAKER);
    expect(await reader.find("nope")).toBeNull();
  });
});

describe("PgSearchProjectsStore.listAll with ROME jobs (US-124)", () => {
  it("gives each search the métiers of its confirmed appellations only", async () => {
    await seedReferential();
    const projects = new PgSearchProjectsStore(testDatabase.db);
    await projects.save(ANA, emptySearchProject("p1"));
    await projects.save(BOB, emptySearchProject("p1"));
    await store.confirm(ANA, "p1", FULL_STACK);
    await store.confirm(ANA, "p1", BACK_END);
    await store.replaceSuggestions(ANA, "p1", [{ ...BAKER, score: 0.9 }]);
    // A snapshot pointing at a stale métier: the referential's current one wins.
    await store.confirm(BOB, "p1", { ...BAKER, metierCode: "OLD" });

    const all = await projects.listAll();

    expect(
      all.map((entry) => [entry.userEmail, entry.romeCodes]).sort(),
    ).toEqual([
      [ANA, ["M1855"]],
      [BOB, ["D1102"]],
    ]);
  });

  it("gives an empty list to a search without confirmed jobs", async () => {
    const projects = new PgSearchProjectsStore(testDatabase.db);
    await projects.save(ANA, emptySearchProject("p1"));

    expect((await projects.listAll())[0]?.romeCodes).toEqual([]);
  });
});
