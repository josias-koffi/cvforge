import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AcquisitionEventsService } from "../acquisition/acquisition-events.service";
import { PgAcquisitionEventStore } from "../acquisition/acquisition.pg-store";
import { ApplicationsService } from "../applications/applications.service";
import { PgApplicationsStore } from "../applications/applications.pg-store";
import { LeadOfferListener } from "../applications/lead-offer.listener";
import type { AtsImpactService } from "../ats/ats-impact.service";
import { AtsScanService } from "../ats/ats-scan.service";
import { AtsUnlockService } from "../ats/ats-unlock.service";
import { PgAtsScanStore } from "../ats/ats.pg-store";
import { buildPdf, pdfFile } from "../ats/testing/build-pdf";
import { AuthService } from "../auth/auth.service";
import { PgAuthAccountStore } from "../auth/auth.pg-store";
import type { CreditsService } from "../credits/credits.service";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PublicKeywordMatchController } from "../keyword-match/keyword-match.controller";
import { KeywordMatchService } from "../keyword-match/keyword-match.service";
import { LeadCaptureService } from "./lead-capture.service";

/**
 * Sprint 029's RGPD gate: whatever a visitor does with the free tools, no row
 * written to the database holds text from their CV (ADR-022, E18's rule).
 *
 * Every public tool runs here end to end on real Postgres (PGlite with every
 * migration): the ATS scan and its unlock, the funnel events, the CV ↔ offer
 * comparator and its lead, and the redemption of both magic links, which
 * creates the account and the offered application. Then every table is read
 * back whole and searched for what only the CV contained.
 */

/** Strings that exist in the CV and nowhere else the visitor typed. */
const CV_ONLY = {
  name: "Josephine Arbogast",
  phone: "+33 6 98 76 54 32",
  sentence:
    "Reduit de 40% le temps de build TypeScript en parallelisant la chaine CI interne",
  employer: "Quintavalle Logistique",
};

const CV = [
  CV_ONLY.name,
  `josephine.cv@example.com | ${CV_ONLY.phone} | Lyon`,
  "Profil",
  "Ingenieure plateforme, huit ans d'experience sur des chaines de livraison.",
  "Experience professionnelle",
  `Ingenieure plateforme, ${CV_ONLY.employer} 01/2022 - present`,
  `- ${CV_ONLY.sentence}.`,
  "- Optimise 12 requetes PostgreSQL critiques, divisant par 3 la latence.",
  "Competences",
  "TypeScript, PostgreSQL, Docker, Kubernetes",
].join("\n");

const OFFER = [
  "Ingenieure plateforme TypeScript - Acme",
  "Nous recherchons une ingenieure plateforme pour notre equipe infrastructure.",
  "Vous maintiendrez nos chaines de livraison sur Kubernetes et Terraform.",
  "PostgreSQL, Docker et observabilite au quotidien. Poste base a Lyon.",
].join("\n");

const LEAD_EMAIL = "lead@example.org";

describe("RGPD gate — the free tools never store CV text", () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  /** Raw SQL through the app's `Database` type, which leaves results untyped. */
  async function rowsOf<Row>(query: ReturnType<typeof sql>) {
    const result = (await testDatabase.db.execute(query)) as unknown as {
      rows: Row[];
    };

    return result.rows;
  }

  async function everyRow() {
    const tables = await rowsOf<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    const dump: Record<string, string[]> = {};

    for (const { tablename } of tables) {
      const rows = await rowsOf<{ row: string }>(
        sql.raw(`select row_to_json(t)::text as row from "${tablename}" t`),
      );

      dump[tablename] = rows.map(({ row }) => row);
    }

    return dump;
  }

  it("runs every tool end to end, then finds no CV text in any table", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { db } = testDatabase;
    const sentLinks: string[] = [];
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
      new PgAuthAccountStore(db),
    );
    const leads = new LeadCaptureService(auth, {
      sendMagicLinkEmail: async ({ magicLink }: { magicLink: string }) => {
        sentLinks.push(magicLink);
      },
    } as never);
    // The offered application's extraction reads the offer only; answering
    // with the offer's own title keeps the model out of the question.
    const applications = new ApplicationsService(
      new PgApplicationsStore(db),
      {
        chat: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ summary: "Plateforme", title: "Ingenieure" }),
          ),
      } as never,
      {
        assertSufficientCredits: vi.fn(),
        consumeCredits: vi.fn(),
      } as unknown as CreditsService,
    );
    new LeadOfferListener(auth, applications).onModuleInit();

    // 1. The ATS scan, with an offer, then its unlock.
    const atsStore = new PgAtsScanStore(db);
    const scan = await new AtsScanService(
      atsStore,
      {
        assess: vi.fn().mockResolvedValue(null),
      } as unknown as AtsImpactService,
      300,
      "test-salt",
    ).scanPublic({
      file: pdfFile(buildPdf(CV)),
      ip: "203.0.113.7",
      locale: "fr",
      offerText: OFFER,
    });
    await new AtsUnlockService(atsStore, leads).unlock({
      consentAccepted: true,
      email: LEAD_EMAIL,
      scanId: scan.scanId,
    });

    // 2. The funnel events of both tools.
    const events = new AcquisitionEventsService(
      new PgAcquisitionEventStore(db),
      "test-salt",
    );
    for (const tool of ["ats", "keyword_match"]) {
      for (const step of ["view", "result", "cta_click", "email_submitted"]) {
        await events.record({ ip: "203.0.113.7", locale: "fr", step, tool });
      }
    }

    // 3. The comparator, then its lead.
    const comparator = new PublicKeywordMatchController(
      new KeywordMatchService(),
      leads,
    );
    const match = await comparator.match(pdfFile(buildPdf(CV)), {
      offerText: OFFER,
    });
    await comparator.lead({
      consentAccepted: true,
      email: LEAD_EMAIL,
      offerText: OFFER,
    });

    // 4. Both links redeemed: the account and the offered application exist.
    expect(sentLinks).toHaveLength(2);
    for (const link of sentLinks) {
      await auth.consumeMagicLink(
        new URL(link).searchParams.get("token") ?? "",
      );
    }

    const dump = await everyRow();

    // Not a vacuous pass: the tools did write, and the comparison did read
    // the CV (its terms were found in it).
    expect(match.matched).toEqual(expect.arrayContaining(["kubernetes"]));
    expect(dump.ats_scans).toHaveLength(1);
    expect(dump.acquisition_events).toHaveLength(8);
    expect(dump.auth_accounts).toHaveLength(1);
    expect(dump.applications).toHaveLength(1);
    expect(dump.applications?.[0]).toContain("Kubernetes et Terraform");

    for (const [table, rows] of Object.entries(dump)) {
      const text = rows.join("\n");

      for (const [what, value] of Object.entries(CV_ONLY)) {
        expect(text, `${table} holds the CV's ${what}`).not.toContain(value);
      }
    }
  });
});
