import {
  APPLICATION_SOURCE_TEXT,
  APPLICATION_STATUS_DRAFT,
} from "@cvforge/types";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authAccounts } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgApplicationsStore } from "./applications.pg-store";
import type { StoredApplication } from "./applications.types";
import { PgSubmissionsStore, SubmissionsService } from "./submissions.service";

const EMAIL = "ana@example.com";
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");
let db: TestDatabase;
let status: string;
let applications: {
  getApplicationForUser: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
};
let service: SubmissionsService;

const draft = (id: string): StoredApplication =>
  ({
    atsScore: null,
    companyContext: null,
    companyContextGeneratedAt: null,
    createdAt: "2026-11-26T10:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    cvTemplateId: null,
    cvVersions: [],
    extracted: {
      companyName: "Acme",
      contractType: null,
      language: "fr",
      location: "Paris",
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "",
      title: "Dev",
    },
    id,
    interviewReports: [],
    letterContent: null,
    letterGeneratedAt: null,
    letterTemplateId: null,
    letterVersions: [],
    offerTextPreview: "",
    offerUrl: "https://jobs.example.com/1",
    pointsToHighlight: [],
    profileId: null,
    rawOfferText: "texte",
    skillsToHighlight: [],
    sourceLabel: "x",
    sourceType: APPLICATION_SOURCE_TEXT,
    status: APPLICATION_STATUS_DRAFT,
    statusHistory: [],
    updatedAt: "2026-11-26T10:00:00.000Z",
    userEmail: EMAIL,
  }) as StoredApplication;

const input = (over = {}) => ({
  applicationId: "app-1",
  confirmationUrl: "https://jobs.example.com/1/thanks",
  confirmed: true,
  documents: ["CV Ana.pdf", "Lettre de motivation Ana.pdf"],
  fields: [{ label: "E-mail", value: "ana@example.com" }],
  formUrl: "https://jobs.example.com/1/apply",
  screenshotBase64: JPEG,
  screenshotType: "image/jpeg",
  ...over,
});

describe("SubmissionsService", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
    await db.db.insert(authAccounts).values({ email: EMAIL, role: "user" });
    await new PgApplicationsStore(db.db).createDraft(draft("app-1"));
    status = APPLICATION_STATUS_DRAFT;
    applications = {
      getApplicationForUser: vi.fn(async () => ({ id: "app-1", status })),
      updateStatus: vi.fn(),
    };
    service = new SubmissionsService(
      new PgSubmissionsStore(db.db),
      applications as never,
      () => new Date("2026-11-26T11:00:00.000Z"),
    );
  });

  it("keeps the proof and marks a confirmed application as sent", async () => {
    const submission = await service.record(EMAIL, input());

    expect(submission).toMatchObject({
      confirmationUrl: "https://jobs.example.com/1/thanks",
      confirmed: true,
      documents: ["CV Ana.pdf", "Lettre de motivation Ana.pdf"],
      hasScreenshot: true,
      submittedAt: "2026-11-26T11:00:00.000Z",
    });
    expect(applications.updateStatus).toHaveBeenCalledWith(
      EMAIL,
      "app-1",
      "sent",
    );
    expect(await service.list(EMAIL, "app-1")).toHaveLength(1);
    expect(await service.screenshot(EMAIL, submission.id)).toEqual({
      bytes: Buffer.from(JPEG, "base64"),
      type: "image/jpeg",
    });
  });

  it("leaves an unconfirmed sending as a draft, to check", async () => {
    const submission = await service.record(
      EMAIL,
      input({
        confirmationUrl: "https://jobs.example.com/x",
        confirmed: false,
      }),
    );
    expect(submission).toMatchObject({
      confirmationUrl: null,
      confirmed: false,
    });
    expect(applications.updateStatus).not.toHaveBeenCalled();
  });

  it("refuses an application already sent", async () => {
    status = "sent";
    await expect(service.record(EMAIL, input())).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses an odd screenshot or address", async () => {
    await expect(
      service.record(EMAIL, input({ screenshotType: "image/svg+xml" })),
    ).rejects.toThrow("Format");
    await expect(
      service.record(
        EMAIL,
        input({
          screenshotBase64: Buffer.alloc(700 * 1024).toString("base64"),
        }),
      ),
    ).rejects.toThrow("lourde");
    await expect(
      service.record(EMAIL, input({ formUrl: "javascript:alert(1)" })),
    ).rejects.toThrow("invalide");
  });

  it("shows another account nothing", async () => {
    const submission = await service.record(EMAIL, input());
    expect(await service.list("eve@example.com", "app-1")).toEqual([]);
    await expect(
      service.screenshot("eve@example.com", submission.id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("goes away with the application", async () => {
    await service.record(EMAIL, input());
    await new PgApplicationsStore(db.db).deleteByUserEmail(EMAIL);
    expect(await service.list(EMAIL, "app-1")).toEqual([]);
  });
});
