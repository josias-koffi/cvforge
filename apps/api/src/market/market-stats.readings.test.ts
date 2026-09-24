import { describe, expect, it } from "vitest";
import { departmentLabel, regionNeighbours, regionOf } from "@cvforge/types";
import {
  medianSalary,
  notableChange,
  readJobseekers,
  readOffers,
  readRomeLabel,
  readTension,
  type IndicatorAnswer,
  type MarketReading,
} from "./market-stats.readings";

const DEVELOPER = "Développeur / Développeuse informatique";

/** Trimmed from the live answers of 2026-09-24, M1805 in Loire-Atlantique. */
const TENSION: IndicatorAnswer = {
  listeValeursParPeriode: [
    { codeNomenclature: "MAIN_OEUVRE", codePeriode: "2025", libActivite: DEVELOPER, libPeriode: "ANNEE 2025", valeurPrincipaleNombre: 5 },
    { codeNomenclature: "PERSPECTIVE", codePeriode: "2024", libActivite: DEVELOPER, libPeriode: "ANNEE 2024", valeurPrincipaleNombre: 4 },
    { codeNomenclature: "PERSPECTIVE", codePeriode: "2025", libActivite: DEVELOPER, libPeriode: "ANNEE 2025", valeurPrincipaleNombre: 5 },
  ],
};

const OFFERS: IndicatorAnswer = {
  listeValeursParPeriode: [
    { codeNomenclature: "TOFF", codePeriode: "2025T4", libPeriode: "4ème trimestre 2025", valeurPrincipaleNombre: 590 },
    { codeNomenclature: "PE", codePeriode: "2026T1", libPeriode: "1er trimestre 2026", valeurPrincipaleNombre: 30 },
    { codeNomenclature: "TOFF", codePeriode: "2026T1", libPeriode: "1er trimestre 2026", valeurPrincipaleNombre: 870 },
    { codeNomenclature: "TOFF-CUMUL12MOIS", codePeriode: "2026T1", libPeriode: "1er trimestre 2026", valeurPrincipaleNombre: 2910 },
  ],
};

function reading(overrides: Partial<MarketReading> = {}): MarketReading {
  return {
    department: "44",
    jobseekers: null,
    offers: null,
    offersYear: { period: "1er trimestre 2026", value: 2910 },
    region: "52",
    romeCode: "M1805",
    romeLabel: DEVELOPER,
    salary: null,
    tension: { period: "ANNEE 2025", value: 5 },
    ...overrides,
  };
}

describe("reading the Marché du travail answers", () => {
  it("keeps the latest period of the main tension axis", () => {
    expect(readTension(TENSION)).toEqual({ period: "ANNEE 2025", value: 5 });
  });

  it("counts every offer, not only France Travail's, for the quarter and the year", () => {
    expect(readOffers(OFFERS)).toEqual({
      offers: { period: "1er trimestre 2026", value: 870 },
      offersYear: { period: "1er trimestre 2026", value: 2910 },
    });
  });

  it("reads category A job seekers", () => {
    expect(
      readJobseekers({
        listeValeursParPeriode: [
          { codeNomenclature: "ABC", codePeriode: "2026T1", libPeriode: "1er trimestre 2026", valeurPrincipaleNombre: 230 },
          { codeNomenclature: "A", codePeriode: "2026T1", libPeriode: "1er trimestre 2026", valeurPrincipaleNombre: 150 },
        ],
      }),
    ).toEqual({ period: "1er trimestre 2026", value: 150 });
  });

  it("reads an answer without figures as no figure, not as zero", () => {
    // What `stat-salaires-en-poste` sends back for a ROME code.
    const empty = { codeIndicateur: "SAL_3" } as IndicatorAnswer;

    expect(readTension(empty)).toBeNull();
    expect(readOffers(null)).toEqual({ offers: null, offersYear: null });
    expect(readTension({ listeValeursParPeriode: [{ codeNomenclature: "PERSPECTIVE", codePeriode: "2025", libPeriode: "ANNEE 2025", valeurPrincipaleNombre: 9 }] })).toBeNull();
  });

  it("names the job from whichever answer has it", () => {
    expect(readRomeLabel(OFFERS, TENSION)).toBe(DEVELOPER);
    expect(readRomeLabel(null)).toBe("");
  });
});

describe("medianSalary", () => {
  const PERIOD = "offres vues depuis juin 2026";

  it("takes the middle of each range, then the median", () => {
    expect(
      medianSalary(
        [
          "Annuel de 36000,00 Euros à 44000,00 Euros sur 12 mois",
          "Mensuel de 3000,00 Euros sur 12 mois",
          "45 000 € par an",
          "Annuel de 50000,00 Euros à 60000,00 Euros",
          "Mensuel de 2500,00 Euros à 3500,00 Euros",
        ],
        PERIOD,
      ),
    ).toEqual({ medianYearly: 40_000, period: PERIOD, sample: 5 });
  });

  it("gives no median below five readable offers, nor in another currency", () => {
    expect(
      medianSalary(
        [
          "45 000 € par an",
          "$200,000 per year",
          "£60,000 per year",
          "Selon profil",
          "Annuel de 50000,00 Euros",
          "Annuel de 40000,00 Euros",
          "Annuel de 42000,00 Euros",
        ],
        PERIOD,
      ),
    ).toBeNull();
  });
});

describe("notableChange", () => {
  it("says when the recruitment difficulty moves to a new level", () => {
    expect(
      notableChange(
        reading({ tension: { period: "ANNEE 2024", value: 3 } }),
        reading(),
        "Loire-Atlantique",
      ),
    ).toBe(
      `${DEVELOPER} en Loire-Atlantique : la difficulté de recruter passe de moyenne à très élevée (ANNEE 2025).`,
    );
  });

  it("says when a third more or fewer offers were published over a year", () => {
    expect(
      notableChange(
        reading({ offersYear: { period: "4ème trimestre 2025", value: 2000 } }),
        reading(),
        "Loire-Atlantique",
      ),
    ).toContain("offres en hausse, 2 910 sur douze mois contre 2 000");
  });

  it("stays quiet on a first reading, a small move, a small job or an unchanged period", () => {
    const lastQuarter = { period: "4ème trimestre 2025", value: 2780 };

    expect(notableChange(null, reading(), "Loire-Atlantique")).toBeNull();
    expect(
      notableChange(reading({ offersYear: lastQuarter }), reading(), "Loire-Atlantique"),
    ).toBeNull();
    expect(
      notableChange(
        reading({ offersYear: { period: "4ème trimestre 2025", value: 10 } }),
        reading({ offersYear: { period: "1er trimestre 2026", value: 20 } }),
        "Loire-Atlantique",
      ),
    ).toBeNull();
    // The API revises nothing between two publications.
    expect(
      notableChange(
        reading({ tension: { period: "ANNEE 2025", value: 3 } }),
        reading(),
        "Loire-Atlantique",
      ),
    ).toBeNull();
  });
});

describe("departments", () => {
  it("knows each department's name, with its accents, and its region", () => {
    expect(departmentLabel("07")).toBe("Ardèche");
    expect(departmentLabel("95")).toBe("Val-d'Oise");
    expect(departmentLabel("99")).toBe("99");
    expect(regionOf("2A")).toBe("94");
    expect(regionNeighbours("44").sort()).toEqual(["49", "53", "72", "85"]);
    expect(regionNeighbours("75")).toHaveLength(7);
    expect(regionNeighbours("")).toEqual([]);
  });
});
