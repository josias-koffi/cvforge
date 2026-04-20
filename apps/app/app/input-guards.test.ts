import { describe, expect, it, vi } from "vitest";
import {
  normalizeDateInput,
  normalizeEmail,
  normalizeFutureDateInput,
  normalizePastDateInput,
  normalizePhone,
  normalizeStringList,
  normalizeUrlField,
} from "./input-guards";

describe("input guards", () => {
  it("normalizes valid emails and falls back when invalid", () => {
    expect(normalizeEmail(" User@Example.com ", "fallback@example.com")).toBe(
      "user@example.com",
    );
    expect(normalizeEmail("invalid", "fallback@example.com")).toBe(
      "fallback@example.com",
    );
  });

  it("keeps only structurally valid phone numbers", () => {
    expect(normalizePhone(" +33 6 12 34 56 78 ")).toBe("+33 6 12 34 56 78");
    expect(normalizePhone("abc")).toBe("");
  });

  it("accepts only http and https urls", () => {
    expect(normalizeUrlField("https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
    expect(normalizeUrlField("javascript:alert(1)")).toBe("");
  });

  it("keeps only valid ISO dates", () => {
    expect(normalizeDateInput("2026-04-20")).toBe("2026-04-20");
    expect(normalizeDateInput("2026-02-30")).toBe("");
  });

  it("rejects future birth dates and past availability dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T10:00:00.000Z"));

    expect(normalizePastDateInput("2026-04-19")).toBe("2026-04-19");
    expect(normalizePastDateInput("2026-04-21")).toBe("");
    expect(normalizeFutureDateInput("2026-04-21")).toBe("2026-04-21");
    expect(normalizeFutureDateInput("2026-04-19")).toBe("");

    vi.useRealTimers();
  });

  it("trims and filters persisted string lists", () => {
    expect(normalizeStringList([" TypeScript ", 12, "", "Communication"])).toEqual([
      "TypeScript",
      "Communication",
    ]);
  });
});
