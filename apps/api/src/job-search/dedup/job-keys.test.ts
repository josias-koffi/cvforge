import { describe, expect, it } from "vitest";
import {
  companyKey,
  hammingDistance,
  simhash,
  sourcePriority,
  titleKey,
  trigramSimilarity,
  urlKey,
} from "./job-keys";

describe("urlKey", () => {
  it("reads two links to the same offer as one", () => {
    const keys = [
      "https://job-boards.greenhouse.io/acme/jobs/42",
      "https://job-boards.greenhouse.io/acme/jobs/42/",
      "http://www.job-boards.greenhouse.io/acme/jobs/42?utm_source=francetravail&gclid=x",
      "JOB-BOARDS.GREENHOUSE.IO/acme/jobs/42",
    ].map(urlKey);

    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("job-boards.greenhouse.io/acme/jobs/42");
  });

  it("keeps a parameter that identifies the offer", () => {
    expect(urlKey("https://acme.com/jobs?id=42")).toBe("acme.com/jobs?id=42");
  });

  it("returns nothing for what is not a link", () => {
    expect(urlKey("")).toBe("");
    expect(urlKey("voir l'annonce")).toBe("");
  });
});

describe("companyKey", () => {
  it.each([
    ["ACME SAS", "acme"],
    ["Acme Group France", "acme"],
    ["acme", "acme"],
    ["Société Générale", "societe generale"],
  ])("folds %j to %j", (name, expected) => {
    expect(companyKey(name)).toBe(expected);
  });

  it("keeps something rather than folding a name to nothing", () => {
    // "Groupe" and "France" are both dropped words; dropping them all would
    // make this company match every other name-less one.
    expect(companyKey("Groupe France")).toBe("groupe france");
  });
});

describe("titleKey", () => {
  it("reads the same job written two ways as one key", () => {
    expect(titleKey("Développeur Full Stack (H/F)")).toBe(
      titleKey("Developpeur full-stack F/H"),
    );
  });

  it("keeps two different jobs apart", () => {
    expect(titleKey("Développeur Back-end")).not.toBe(
      titleKey("Développeur Front-end"),
    );
  });

  it("drops the contract, which is not part of the job", () => {
    expect(titleKey("Data Analyst - CDI")).toBe(titleKey("Data Analyst"));
  });
});

describe("trigramSimilarity", () => {
  it("scores identical strings 1", () => {
    expect(trigramSimilarity("data analyst", "data analyst")).toBe(1);
  });

  it("scores the same job written in both genders above unrelated ones", () => {
    const gendered = trigramSimilarity(
      "developpeur full stack",
      "developpeuse full stack",
    );

    expect(gendered).toBeGreaterThan(0.7);
    expect(gendered).toBeGreaterThan(
      trigramSimilarity("developpeur full stack", "developpeur back end"),
    );
  });

  it("scores unrelated titles low", () => {
    expect(trigramSimilarity("data analyst", "chef de cuisine")).toBeLessThan(0.2);
  });

  it("scores an empty string 0", () => {
    expect(trigramSimilarity("", "data")).toBe(0);
  });
});

/** A real-length advert: a two-line text is too short to fingerprint. */
const LONG_ADVERT = `Nous recherchons un développeur full stack pour rejoindre notre équipe produit de 12 personnes.
Vous travaillerez sur notre application React et notre API Node.js en TypeScript. Vous participerez aux
revues de code, à la conception des fonctionnalités et à l'amélioration continue de notre plateforme.
Profil recherché : 3 ans d'expérience minimum en développement web, maîtrise de TypeScript, React et
Node.js, connaissance de PostgreSQL et Docker. Vous savez travailler en autonomie et communiquer avec
les équipes produit et design. Rémunération selon profil, télétravail partiel, mutuelle prise en charge.`;

describe("simhash", () => {
  it("gives the same fingerprint to the same text", () => {
    expect(simhash("Nous recherchons un développeur")).toBe(
      simhash("Nous recherchons un développeur"),
    );
  });

  it("stays close when one publication adds a legal footer", () => {
    const withFooter = `${LONG_ADVERT}\nNotre entreprise est engagée pour l'égalité des chances. Tous nos postes sont ouverts aux personnes en situation de handicap.`;

    expect(
      hammingDistance(simhash(LONG_ADVERT), simhash(withFooter)),
    ).toBeLessThanOrEqual(10);
  });

  it("stays close when a source truncates the advert", () => {
    // Adzuna cuts descriptions short; the same offer must still be recognised.
    const truncated = LONG_ADVERT.slice(0, Math.floor(LONG_ADVERT.length * 0.6));

    expect(
      hammingDistance(simhash(LONG_ADVERT), simhash(truncated)),
    ).toBeLessThanOrEqual(10);
  });

  it("moves away for an unrelated advert", () => {
    const other = simhash(
      `Nous recherchons un chef de partie pour notre restaurant traditionnel à Lyon.
       Vous serez responsable de la préparation des plats chauds, de la gestion des stocks
       et de l'encadrement des commis. Expérience de 2 ans en cuisine exigée, CAP cuisine
       apprécié. Service du midi et du soir, deux jours de repos consécutifs.`,
    );

    expect(hammingDistance(simhash(LONG_ADVERT), other)).toBeGreaterThan(10);
  });
});

describe("hammingDistance", () => {
  it("counts the bits that differ", () => {
    expect(hammingDistance("0000000000000000", "0000000000000003")).toBe(2);
  });

  it("treats a missing fingerprint as maximally distant", () => {
    expect(hammingDistance("", "0000000000000003")).toBe(64);
  });
});

describe("sourcePriority", () => {
  it("prefers the company's own board over the aggregators", () => {
    expect(sourcePriority("greenhouse")).toBeGreaterThan(
      sourcePriority("france_travail"),
    );
    expect(sourcePriority("france_travail")).toBeGreaterThan(sourcePriority("adzuna"));
  });
});
