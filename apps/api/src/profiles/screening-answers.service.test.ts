import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authAccounts } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import {
  PgScreeningAnswersStore,
  ScreeningAnswersService,
} from "./screening-answers.service";

const EMAIL = "ana@example.com";
let db: TestDatabase;
let service: ScreeningAnswersService;
let now: Date;

describe("ScreeningAnswersService", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
    await db.db.insert(authAccounts).values({ email: EMAIL, role: "user" });
    now = new Date("2026-11-26T10:00:00.000Z");
    service = new ScreeningAnswersService(
      new PgScreeningAnswersStore(db.db),
      () => now,
    );
  });

  it("starts empty", async () => {
    expect(await service.get(EMAIL)).toEqual({
      custom: [],
      known: {},
      updatedAt: null,
    });
  });

  it("replaces the answers, trimmed, dropping empty and unknown entries", async () => {
    await service.replace(EMAIL, {
      custom: [
        { answer: " Oui ", question: "Avez-vous le permis B ?" },
        { answer: "Non", question: "avez vous le PERMIS b" },
        { answer: "", question: "Vide" },
      ],
      known: { noticePeriod: " 1 mois ", salaryExpectation: "", unknown: "x" },
    });

    const saved = await service.get(EMAIL);
    expect(saved.known).toEqual({ noticePeriod: "1 mois" });
    expect(saved.custom).toEqual([
      {
        answer: "Oui",
        question: "Avez-vous le permis B ?",
        updatedAt: "2026-11-26T10:00:00.000Z",
      },
    ]);
    expect(saved.updatedAt).toBe("2026-11-26T10:00:00.000Z");
  });

  it("saves one answer from the extension, by key or by question", async () => {
    await service.saveOne(EMAIL, { answer: "45 k€", key: "salaryExpectation" });
    await service.saveOne(EMAIL, {
      answer: "Oui",
      question: "Êtes-vous disponible le week-end ?",
    });
    now = new Date("2026-11-27T10:00:00.000Z");
    await service.saveOne(EMAIL, {
      answer: "Non",
      question: "etes vous disponible le week end",
    });

    const saved = await service.get(EMAIL);
    expect(saved.known).toEqual({ salaryExpectation: "45 k€" });
    expect(saved.custom).toEqual([
      {
        answer: "Non",
        question: "etes vous disponible le week end",
        updatedAt: "2026-11-27T10:00:00.000Z",
      },
    ]);
  });

  it("removes an answer saved empty", async () => {
    await service.saveOne(EMAIL, { answer: "1 mois", key: "noticePeriod" });
    await service.saveOne(EMAIL, { answer: "", key: "noticePeriod" });
    expect((await service.get(EMAIL)).known).toEqual({});
  });

  it("refuses unknown keys, empty questions and oversized text", async () => {
    await expect(
      service.saveOne(EMAIL, { answer: "x", key: "nope" }),
    ).rejects.toThrow("inconnu");
    await expect(
      service.saveOne(EMAIL, { answer: "x", question: "  " }),
    ).rejects.toThrow("vide");
    await expect(
      service.saveOne(EMAIL, { answer: "x".repeat(1001), key: "noticePeriod" }),
    ).rejects.toThrow("1000");
    await expect(service.replace(EMAIL, "x")).rejects.toThrow("attendues");
    await expect(
      service.replace(EMAIL, { known: { noticePeriod: 3 } }),
    ).rejects.toThrow("texte attendu");
  });

  it("goes away with the account", async () => {
    await service.saveOne(EMAIL, { answer: "1 mois", key: "noticePeriod" });
    await db.db.delete(authAccounts);
    expect(await service.get(EMAIL)).toEqual({
      custom: [],
      known: {},
      updatedAt: null,
    });
  });
});
