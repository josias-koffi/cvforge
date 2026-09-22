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

/**
 * The text layer our own ATS template produced, letter for letter.
 *
 * `letter-spacing` on the section headings made the extractor read the gaps
 * between glyphs as spaces, so not one section was recognised — the CV we sell
 * as ATS-ready scored 50/100 on our own scanner, capped for having neither an
 * experience nor a skills section. The template no longer does this; a CV
 * uploaded from anywhere else still can.
 */
describe("headings torn apart by letter-spacing", () => {
  const SPACED = `Léa Moreau
Développeuse full-stack TypeScript
+33 6 12 34 56 78 · lea.moreau@example.com · Lyon, France
PR O F I L
Développeuse full-stack expérimentée sur applications web à fort trafic.
CO M P É T E N C E S C L É S
Langages : TypeScript
EX P É R I E N C E S
Développeuse full-stack senior
Nordwind Studio
2023 – Présent
Réduction du temps de chargement de 6 à 1,8 seconde
FO R M AT I O N
Master informatique, génie logiciel
2019
LA N G U E S
Anglais B2 / Professionnel`;

  it("recognises every section anyway", () => {
    const { sections } = parseCvText(SPACED);

    expect(sections).toMatchObject({
      education: true,
      experience: true,
      languages: true,
      skills: true,
      summary: true,
    });
  });

  it("still refuses to read an ordinary short line as a heading", () => {
    const { sections } = parseCvText("CV de Léa Moreau\nRien d'autre.");

    expect(sections.experience).toBe(false);
  });
});

/**
 * The shape of a real CV our generator produced, as its PDF text layer hands it
 * over. Anonymised, but structurally faithful: month-name end dates, no bullet
 * characters, a "FORMATION" section whose diplomas are dated in bare years.
 *
 * It scored 76 in production. Three separate reading failures, all ours: the
 * two real jobs were invisible because "Oct. 2024" matched no date pattern, the
 * three diplomas were read as jobs instead, and no achievement was attached to
 * anything because the bullet characters never reached the text layer.
 */
describe("a CV whose dates carry month names", () => {
  const CV = `Prénom Nom
Assistant Chef de Projet CRM
0600000000 · nom@example.com · Paris · linkedin.com/in/profil
PROFIL
Assistant chef de projet CRM avec expérience en marketing digital.
COMPÉTENCES CLÉS
Outils : Power BI · Excel avancé
EXPÉRIENCES
Responsable Marketing Digital
Société A
2021 – Oct. 2024
Création du département marketing digital et lancement de la gamme.
Pilotage de la communication interne et externe du groupe.
Consultante Marketing Freelance
Société B
2024 – Fév. 2026
Conception et scénographie de pop-up stores en point de vente.
FORMATION
Mastère Communication et Marketing Stratégique
École
2025 - 2027
Stratégie de marque, communication événementielle, branding.
Bachelor Marketing Digital
Autre école
2020 - 2023
Communication produit, marketing digital, gestion de projet.
CENTRES D'INTÉRÊT
Mode et univers du luxe · Photographie · Voyages culturels`;

  it("reads the two jobs and neither diploma as experience", () => {
    const { experiences } = parseCvText(CV);

    expect(experiences).toHaveLength(2);
    expect(experiences[0]?.endDate).toBe("Oct. 2024");
    expect(experiences[1]?.endDate).toBe("Fév. 2026");
  });

  it("attaches the achievements even without a bullet character", () => {
    const [first, second] = parseCvText(CV).experiences;

    expect(first?.bullets).toHaveLength(2);
    expect(second?.bullets).toHaveLength(1);
  });

  /** Hobbies under a heading we do not score must not become the last job's work. */
  it("stops at the interests section", () => {
    const bullets = parseCvText(CV).experiences.flatMap((e) => e.bullets);

    expect(bullets.join(" ")).not.toContain("Photographie");
  });
});
