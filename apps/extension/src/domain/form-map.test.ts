import { describe, expect, it } from "vitest";
import type { PrefillData } from "./field-match";
import { fieldSignature, learnFromForm, ruleValue } from "./form-map";

const DATA: PrefillData = {
  answers: [],
  known: { noticePeriod: "Un mois", salaryExpectation: "45 k€" },
  values: {
    email: "camille@example.com",
    firstName: "Camille",
    fullName: "Camille",
    phone: "0600000000",
  },
};

describe("fieldSignature (US-205)", () => {
  it("is the same for every offer of a template: ids and numbers dropped", () => {
    const a = fieldSignature({
      label: "Mobile *",
      name: "cards[0b3a9f2e-1c4d-4e5f-8a9b-0c1d2e3f4a5b][field3]",
      tag: "INPUT",
      type: "text",
    });
    const b = fieldSignature({
      label: "Mobile (required)",
      name: "cards[9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f][field3]",
      tag: "input",
      type: "text",
    });
    expect(a).toBe(b);
    expect(a).toBe("input:text:cards[#][field#]:mobile");
  });
});

describe("learnFromForm", () => {
  it("learns fields holding exactly one datum, never a value", () => {
    const learned = learnFromForm(
      [
        { signature: "s-mail", value: "CAMILLE@example.com" },
        { signature: "s-notice", value: "un mois" },
        // First name and full name are equal here: unsure.
        { signature: "s-name", value: "Camille" },
        { signature: "s-yes", value: "Oui" },
        { signature: "s-other", value: "Paris" },
      ],
      DATA,
      [],
    );
    expect(learned.confirmed).toEqual([
      { fieldKey: "email", signature: "s-mail" },
      { fieldKey: "answer:noticePeriod", signature: "s-notice" },
    ]);
    expect(JSON.stringify(learned)).not.toContain("camille@");
  });

  it("reports a served rule whose field ended with something else", () => {
    const served = [
      { fieldKey: "phone", signature: "s-phone" },
      { fieldKey: "email", signature: "s-absent" },
    ];
    expect(
      learnFromForm(
        [{ signature: "s-phone", value: "0700000000" }],
        DATA,
        served,
      ).missed,
    ).toEqual([{ fieldKey: "phone", signature: "s-phone" }]);
  });
});

describe("ruleValue", () => {
  it("gives the datum a rule names, saved answers included", () => {
    const rules = [
      { fieldKey: "answer:salaryExpectation", signature: "s-pay" },
      { fieldKey: "github", signature: "s-gh" },
    ];
    expect(ruleValue(rules, "s-pay", DATA)).toBe("45 k€");
    expect(ruleValue(rules, "s-gh", DATA)).toBeNull();
    expect(ruleValue(rules, "s-none", DATA)).toBeNull();
  });
});
