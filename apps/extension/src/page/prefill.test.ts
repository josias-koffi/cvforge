// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrefillData } from "../domain/field-match";
import { prefill } from "./prefill";

// happy-dom lays nothing out: treat every element as visible.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
});

const fixture = (name: string) => {
  document.body.innerHTML = readFileSync(
    join(__dirname, "fixtures", `${name}.html`),
    "utf8",
  );
};

const DATA: PrefillData = {
  answers: [],
  values: {
    city: "Nantes",
    currentCompany: "Acme",
    email: "camille@example.com",
    firstName: "Camille",
    fullName: "Camille Test",
    lastName: "Test",
    linkedin: "https://linkedin.com/in/camille",
    phone: "0600000000",
  },
};
const DOCS = {
  cv: {
    base64: btoa("%PDF-cv"),
    mime: "application/pdf",
    name: "CV Camille Test.pdf",
  },
  letter: {
    base64: btoa("%PDF-letter"),
    mime: "application/pdf",
    name: "Lettre de motivation Camille Test.pdf",
  },
};

const labels = (report: { filled: { label: string }[] }) =>
  report.filled.map((field) => field.label);

describe("prefill on real forms (fixtures captured 2026-11-26)", () => {
  it("Lever: identity, current company, LinkedIn and the CV; German left to the model", async () => {
    fixture("lever");
    const report = await prefill(DATA, DOCS);
    expect(labels(report)).toEqual([
      "Full name",
      "Email",
      "Phone",
      "Current company",
      "LinkedIn URL",
    ]);
    expect(report.attached).toEqual(["CV Camille Test.pdf"]);
    expect(report.remaining).toEqual(["What is your level of German?"]);
  });

  it("Lever: a saved answer picks the matching radio", async () => {
    fixture("lever");
    const report = await prefill(
      {
        ...DATA,
        answers: [
          { answer: "Beginner", question: "What is your level of German?" },
        ],
      },
      DOCS,
    );
    expect(report.filled).toContainEqual({
      label: "What is your level of German?",
      value: "Beginner",
    });
    expect(report.remaining).toEqual([]);
  });

  it("Greenhouse: first and last name, contact, company, LinkedIn, both documents", async () => {
    fixture("greenhouse");
    const report = await prefill(DATA, DOCS);
    expect(labels(report)).toEqual(
      expect.arrayContaining([
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Current Company",
        "LinkedIn URL",
      ]),
    );
    expect(report.attached).toHaveLength(2);
    expect(report.remaining).toContain("What are your salary expectations?");
  });

  it("Ashby: name, contact, company, location and LinkedIn; open questions left", async () => {
    fixture("ashby");
    const report = await prefill(DATA, DOCS);
    expect(labels(report)).toEqual([
      "Name",
      "Email",
      "Phone",
      "Current Company",
      "Current Location",
      "LinkedIn",
    ]);
    expect(report.remaining).toHaveLength(3);
  });

  it("Workable: first and last name, contact, LinkedIn in a multi-line field", async () => {
    fixture("workable");
    const report = await prefill(DATA, DOCS);
    expect(labels(report)).toEqual(
      expect.arrayContaining([
        "First name",
        "Last name",
        "Email",
        "Phone",
        "Linkedin",
      ]),
    );
  });

  it("never ticks a consent box nor overwrites a field", async () => {
    fixture("greenhouse");
    const email = document.querySelector<HTMLInputElement>("#email")!;
    email.value = "deja@example.com";
    const report = await prefill(DATA, DOCS);
    expect(email.value).toBe("deja@example.com");
    expect(labels(report)).not.toContain("Email");
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
      ].some((box) => box.checked),
    ).toBe(false);
  });
});

describe("prefill with the learned map (US-205)", () => {
  it("fills a field no rule of its own recognises, from the site's map", async () => {
    document.body.innerHTML = `
      <form>
        <label for="m">Numéro où vous joindre</label><input id="m" name="contact_7">
        <label for="s">Rémunération souhaitée</label><input id="s" name="q_12">
      </form>`;
    const { signatureOf, filledFields } = await import("./form-map");
    const rules = [
      {
        fieldKey: "phone",
        signature: signatureOf(document.querySelector<HTMLInputElement>("#m")!),
      },
      {
        fieldKey: "answer:salaryExpectation",
        signature: signatureOf(document.querySelector<HTMLInputElement>("#s")!),
      },
    ];
    const report = await prefill(
      { ...DATA, known: { salaryExpectation: "45 k€" } },
      DOCS,
      rules,
    );
    expect(report.filled).toEqual([
      { label: "Numéro où vous joindre", value: "0600000000" },
      { label: "Rémunération souhaitée", value: "45 k€" },
    ]);
    expect(filledFields()).toEqual([
      {
        signature: "input:text:contact_#:numero ou vous joindre",
        value: "0600000000",
      },
      { signature: "input:text:q_#:remuneration souhaitee", value: "45 k€" },
    ]);
  });
});
