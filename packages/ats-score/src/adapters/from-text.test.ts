import { describe, expect, it } from "vitest";
import { scoreAts } from "../engine";
import type { AtsFileSignals } from "../types";
import { parseCvText } from "./from-text";

const FILE: AtsFileSignals = {
  columnSuspicion: 0,
  hasTextLayer: true,
  kind: "pdf",
  mojibakeRatio: 0,
  pageCount: 2,
};

describe("parseCvText — contact details", () => {
  it("finds an email, a phone and a LinkedIn profile", () => {
    const contact = parseCvText(
      "alex@example.com | +33 6 12 34 56 78 | linkedin.com/in/alex",
    ).contact;

    expect(contact.email).toBe(true);
    expect(contact.phone).toBe(true);
    expect(contact.linkedIn).toBe(true);
  });

  /**
   * The city has no shape of its own, so it is read from the header line that
   * already carries the email or the phone.
   */
  it("reads the city beside the other contact details", () => {
    expect(parseCvText("alex@example.com | Bordeaux").contact.city).toBe(true);
  });

  it("accepts a postal code as a location", () => {
    expect(parseCvText("alex@example.com | 33000 Bordeaux").contact.city).toBe(
      true,
    );
  });

  it("does not mistake a URL beside the email for a city", () => {
    expect(
      parseCvText("alex@example.com | github.com/alex").contact.city,
    ).toBe(false);
  });

  it("does not look for a city on lines with no contact detail at all", () => {
    expect(parseCvText("Ingénieur plateforme\nLyon").contact.city).toBe(false);
  });
});

describe("parseCvText — sections", () => {
  it("recognises a heading, accented or not", () => {
    const sections = parseCvText(
      "EXPÉRIENCE PROFESSIONNELLE\nquelque chose\n\nFormation\nautre chose",
    ).sections;

    expect(sections.experience).toBe(true);
    expect(sections.education).toBe(true);
  });

  /** A heading is a short line; a sentence merely naming a section is not one. */
  it("does not take a sentence mentioning a section for a heading", () => {
    const sections = parseCvText(
      "Ma formation initiale en informatique m'a conduit vers les systèmes répartis.",
    ).sections;

    expect(sections.education).toBe(false);
  });

  it("recognises English headings", () => {
    expect(parseCvText("Work experience\nAcme").sections.experience).toBe(true);
  });
});

describe("parseCvText — skills", () => {
  it("splits a separated list under the skills heading", () => {
    expect(parseCvText("Compétences\nTypeScript, PostgreSQL, Docker").skills).toEqual([
      "TypeScript",
      "PostgreSQL",
      "Docker",
    ]);
  });

  it("ignores prose too long to be a skill", () => {
    const skills = parseCvText(
      "Compétences\nJ'ai travaillé pendant huit ans sur des chaînes de livraison continues.",
    ).skills;

    expect(skills).toEqual([]);
  });

  it("returns nothing when the CV has no skills section", () => {
    expect(parseCvText("Expérience\nAcme").skills).toEqual([]);
  });
});

describe("parseCvText — experiences", () => {
  it("reads a dated line as an experience and the bullets that follow it", () => {
    const experiences = parseCvText(
      [
        "Ingénieur, Acme 01/2022 - présent",
        "- Réduit le build de 40%.",
        "- Optimisé 12 requêtes.",
      ].join("\n"),
    ).experiences;

    expect(experiences).toHaveLength(1);
    expect(experiences[0]?.startDate).toBe("01/2022");
    expect(experiences[0]?.bullets).toHaveLength(2);
  });

  it("attaches each bullet to the experience above it", () => {
    const experiences = parseCvText(
      [
        "Ingénieur, Acme 01/2022 - présent",
        "- Premier poste.",
        "Développeur, Globex 03/2019 - 12/2021",
        "- Second poste.",
      ].join("\n"),
    ).experiences;

    expect(experiences).toHaveLength(2);
    expect(experiences[0]?.bullets).toEqual(["Premier poste."]);
    expect(experiences[1]?.bullets).toEqual(["Second poste."]);
  });

  it("drops bullets that precede any dated line", () => {
    expect(parseCvText("- Une puce orpheline.").experiences).toEqual([]);
  });

  it("understands an English date range", () => {
    expect(
      parseCvText("Engineer, Acme 01/2022 to now").experiences,
    ).toHaveLength(1);
  });
});

describe("parseCvText — file signals", () => {
  it("carries the file signals through when they are supplied", () => {
    expect(parseCvText("Texte", FILE).file).toEqual(FILE);
  });

  /** Without a file there is nothing to judge readability on. */
  it("omits them entirely when they are not", () => {
    expect(parseCvText("Texte").file).toBeUndefined();
    expect(
      scoreAts(parseCvText("Texte")).dimensions.find(
        (item) => item.key === "machineReadability",
      )?.status,
    ).toBe("unavailable");
  });
});
