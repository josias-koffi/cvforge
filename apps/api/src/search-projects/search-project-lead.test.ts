import { emptySearchProject } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createInMemoryAccountStore } from "../auth/testing/in-memory-account-store";
import { searchProjects as searchProjectsTable } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PublicCompanyCheckController } from "../company-check/company-check.controller";
import { CompanyCheckService } from "../company-check/company-check.service";
import { PublicJobMarketController } from "../job-market/job-market.controller";
import { JobMarketService } from "../job-market/job-market.service";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { emptyProfileRegistry } from "../profiles/empty-profile";
import { PgProfilesStore } from "../profiles/profiles.pg-store";
import { PgRomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import type { RomeoClient } from "../rome/romeo.client";
import { PgRomeStore } from "../rome/rome.pg-store";
import { LeadJobSearchListener } from "./lead-job-search.listener";
import { SearchProjectLeadService, withJobSearch } from "./search-project-lead.service";
import { PgSearchProjectRomeStore } from "./search-project-rome.pg-store";
import { SearchProjectRomeService } from "./search-project-rome.service";
import { PgSearchProjectsStore } from "./search-projects.pg-store";

const LEAD = "lead@example.com";
const WEB_DEV = {
  code: "38874",
  libelle: "Développeur / Développeuse web",
  metierCode: "M1855",
  metierLibelle: "Développement web",
};

let testDatabase: TestDatabase;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
  await new PgRomeStore(testDatabase.db).replace({
    appellations: [
      {
        ...WEB_DEV,
        libelleCourt: "",
        libelleSearch: "developpeur / developpeuse web",
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
        libelle: WEB_DEV.metierLibelle,
      },
    ],
    versions: { competences: null, fichesMetiers: null, metiers: null },
  });
});

/**
 * The whole way from "Receive this job's offers every morning" to the search
 * the morning digest reads, with the real classes and the real tables: the
 * lead route, the magic link, its redemption and the listener (US-137).
 */
function createHarness() {
  const { db } = testDatabase;
  const auth = new AuthService(
    {
      apiUrl: "http://localhost:3333",
      appUrl: "http://localhost:3000",
      cookieDomain: undefined,
      cookieName: "cvforge_session",
      magicLinkTtlMinutes: 15,
      secureCookies: false,
      sessionSecret: "test-secret",
      sessionTtlDays: 7,
    },
    createInMemoryAccountStore(),
  );
  const sent: string[] = [];
  const appellations = new PgRomeAppellationsReader(db);
  const leadCapture = new LeadCaptureService(auth, {
    sendMagicLinkEmail: async ({ magicLink }: { magicLink: string }) => {
      sent.push(magicLink);
    },
  } as never);
  const controller = new PublicJobMarketController(
    new JobMarketService(appellations, { lookup: async () => null }),
    leadCapture,
  );
  const companyCheck = new PublicCompanyCheckController(
    new CompanyCheckService(
      { egaproScore: vi.fn(), search: vi.fn() },
      { findMany: vi.fn() },
    ),
    leadCapture,
  );
  const romeo = { predict: vi.fn() };
  const searchProjects = new PgSearchProjectsStore(db);
  const profiles = new PgProfilesStore(db);
  const leads = new SearchProjectLeadService(
    searchProjects,
    profiles,
    new SearchProjectRomeService(
      new PgSearchProjectRomeStore(db),
      romeo as unknown as RomeoClient,
      appellations,
    ),
    () => new Date("2026-09-24T12:00:00.000Z").getTime(),
  );
  new LeadJobSearchListener(auth, leads).onModuleInit();

  async function signUp(department = "44") {
    await controller.lead({
      appellation: WEB_DEV.code,
      consentAccepted: true,
      department,
      email: LEAD,
    });

    return redeem();
  }

  async function signUpFromCompanyCheck() {
    await companyCheck.lead({
      consentAccepted: true,
      email: LEAD,
      siren: "381983568",
    });

    return redeem();
  }

  /** Clicks the last link sent; answers the screen the app opens on. */
  async function redeem() {
    const link = new URL(sent.at(-1)!);

    await auth.consumeMagicLink(link.searchParams.get("token")!);

    return new URL(link.searchParams.get("redirectTo")!).searchParams.get(
      "next",
    );
  }

  return { profiles, romeo, searchProjects, signUp, signUpFromCompanyCheck };
}

describe("job market lead → search, end to end", () => {
  it("gives a new account a profile and a search the digest reads", async () => {
    const harness = createHarness();

    expect(await harness.signUp()).toBe("/ma-recherche");

    const registry = await harness.profiles.findByUserEmail(LEAD);
    expect(registry?.profiles).toHaveLength(1);
    const profileId = registry!.activeProfileId;

    expect(await harness.searchProjects.findByProfileId(LEAD, profileId)).toMatchObject({
      digestEnabled: true,
      emailEnabled: true,
      locations: [
        {
          department: "44",
          inseeCode: "",
          label: "Loire-Atlantique (44)",
          latitude: null,
          longitude: null,
        },
      ],
      targetRoles: [WEB_DEV.libelle],
    });
    // What the E19 morning run iterates over, métier code included.
    expect(await harness.searchProjects.listDigestEnabled()).toEqual([
      expect.objectContaining({ romeCodes: ["M1855"], userEmail: LEAD }),
    ]);
    // ROMEO is asked nothing: the visitor already named the job.
    expect(harness.romeo.predict).not.toHaveBeenCalled();

    const [row] = await testDatabase.db
      .select({ leadOrigin: searchProjectsTable.leadOrigin })
      .from(searchProjectsTable);
    expect(row?.leadOrigin).toBe("job_market");
  });

  it("adds to an existing search without undoing what its owner set", async () => {
    const harness = createHarness();
    const registry = emptyProfileRegistry(LEAD, "profile-1");
    await harness.profiles.save(LEAD, registry);
    await harness.searchProjects.save(LEAD, {
      ...emptySearchProject("profile-1"),
      contractTypes: ["cdi"],
      locations: [
        {
          department: "69",
          inseeCode: "69123",
          label: "Lyon",
          latitude: 45.76,
          longitude: 4.83,
          radiusKm: 20,
        },
      ],
      targetRoles: ["Développeur / développeuse web"],
    });

    await harness.signUp("44");
    await harness.signUp("44");

    const project = await harness.searchProjects.findByProfileId(LEAD, "profile-1");
    expect(project?.contractTypes).toEqual(["cdi"]);
    expect(project?.locations.map((location) => location.department)).toEqual([
      "69",
      "44",
    ]);
    // Same title, other case: not repeated.
    expect(project?.targetRoles).toEqual(["Développeur / développeuse web"]);
    expect(project?.digestEnabled).toBe(true);
    expect((await harness.profiles.findByUserEmail(LEAD))?.profiles).toHaveLength(1);
  });
});

describe("employer check lead → companies that hire, end to end", () => {
  /** The SIREN names no job: an empty search, for `/entreprises` to explain. */
  it("opens the list on a new, empty search counted as activated (US-139)", async () => {
    const harness = createHarness();

    expect(await harness.signUpFromCompanyCheck()).toBe("/entreprises");

    const profileId = (await harness.profiles.findByUserEmail(LEAD))!
      .activeProfileId;
    expect(
      await harness.searchProjects.findByProfileId(LEAD, profileId),
    ).toMatchObject({ locations: [], targetRoles: [] });
    const [row] = await testDatabase.db
      .select({ leadOrigin: searchProjectsTable.leadOrigin })
      .from(searchProjectsTable);
    expect(row?.leadOrigin).toBe("company_check");
  });

  it("leaves an existing search as its owner set it", async () => {
    const harness = createHarness();
    await harness.profiles.save(LEAD, emptyProfileRegistry(LEAD, "profile-1"));
    await harness.searchProjects.save(LEAD, {
      ...emptySearchProject("profile-1"),
      targetRoles: ["Comptable"],
    });

    await harness.signUpFromCompanyCheck();

    expect(
      await harness.searchProjects.findByProfileId(LEAD, "profile-1"),
    ).toMatchObject({ targetRoles: ["Comptable"] });
  });

  it("refuses a malformed SIREN before sending anything", async () => {
    const harness = createHarness();

    await expect(
      new PublicCompanyCheckController(
        new CompanyCheckService(
          { egaproScore: vi.fn(), search: vi.fn() },
          { findMany: vi.fn() },
        ),
        { acceptedEmail: () => LEAD, sendLink: vi.fn() } as never,
      ).lead({ consentAccepted: true, email: LEAD, siren: "123" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await harness.profiles.findByUserEmail(LEAD)).toBeNull();
  });
});

describe("withJobSearch", () => {
  it("keeps an existing department and title as they are", () => {
    const project = withJobSearch(
      {
        ...emptySearchProject("p"),
        locations: [
          {
            department: "44",
            inseeCode: "44109",
            label: "Nantes",
            latitude: 47.2,
            longitude: -1.55,
            radiusKm: 30,
          },
        ],
        targetRoles: ["Comptable"],
      },
      "44",
      "comptable",
    );

    expect(project.locations).toHaveLength(1);
    expect(project.targetRoles).toEqual(["Comptable"]);
  });
});
