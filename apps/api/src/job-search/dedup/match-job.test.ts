import { describe, expect, it } from "vitest";
import { simhash, titleKey } from "./job-keys";
import { matchJob, type MatchCandidate, type MatchSubject } from "./match-job";

const ADVERT = `Nous recherchons un développeur full stack pour rejoindre notre équipe produit de 12 personnes.
Vous travaillerez sur notre application React et notre API Node.js en TypeScript. Vous participerez aux
revues de code, à la conception des fonctionnalités et à l'amélioration continue de notre plateforme.
Profil recherché : 3 ans d'expérience minimum en développement web, maîtrise de TypeScript, React et
Node.js, connaissance de PostgreSQL et Docker. Rémunération selon profil, télétravail partiel.`;

const OTHER_ADVERT = `Nous recherchons un chef de partie pour notre restaurant traditionnel à Lyon.
Vous serez responsable de la préparation des plats chauds, de la gestion des stocks et de l'encadrement
des commis. Expérience de 2 ans en cuisine exigée, CAP cuisine apprécié. Service du midi et du soir.`;

function makeSubject(overrides: Partial<MatchSubject> = {}): MatchSubject {
  return {
    companyAnonymous: false,
    companyKey: "acme",
    department: "75",
    descriptionSimhash: simhash(ADVERT),
    publishedAt: "2026-09-10T08:00:00.000Z",
    title: "Développeur Full Stack (H/F)",
    titleKey: titleKey("Développeur Full Stack (H/F)"),
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    companyAnonymous: false,
    companyKey: "acme",
    department: "75",
    descriptionSimhash: simhash(ADVERT),
    jobId: "job-1",
    publishedAt: "2026-09-10T08:00:00.000Z",
    titleKey: titleKey("Développeur Full Stack (H/F)"),
    ...overrides,
  };
}

describe("matchJob", () => {
  it("trusts a shared link above everything else", () => {
    const match = matchJob(makeSubject({ companyKey: "autre" }), [], {
      byUrl: "job-7",
    });

    expect(match).toEqual({ confidence: 1, jobId: "job-7", method: "url" });
  });

  it("matches the same title written with different punctuation and markers", () => {
    const candidate = makeCandidate({
      titleKey: titleKey("Developpeur full-stack F/H"),
    });

    expect(matchJob(makeSubject(), [candidate])?.method).toBe("strict_key");
  });

  it("does NOT match the same job across two languages", () => {
    // A known limitation: "Développeur Full Stack" and "Full-Stack Developer"
    // share neither words nor description. Such a pair is only merged when one
    // advert links to the other, which is the common case (France Travail
    // carries the company's own link).
    const english = makeCandidate({
      titleKey: titleKey("Full-Stack Developer F/H"),
    });

    expect(matchJob(makeSubject(), [english])).toBeNull();
  });

  it("matches a gendered spelling through the fuzzy step", () => {
    const subject = makeSubject({
      title: "Développeuse Full Stack",
      titleKey: titleKey("Développeuse Full Stack"),
    });

    const match = matchJob(subject, [makeCandidate()]);

    expect(match?.method).toBe("fuzzy");
    expect(match?.jobId).toBe("job-1");
  });

  it("refuses to merge two different jobs at the same company", () => {
    // Same employer, same city, near-identical boilerplate — only the job
    // differs, and that is exactly what must not be lost.
    const backend = makeSubject({
      title: "Développeur Back-end",
      titleKey: titleKey("Développeur Back-end"),
    });
    const frontend = makeCandidate({
      titleKey: titleKey("Développeur Front-end"),
    });

    expect(matchJob(backend, [frontend])).toBeNull();
  });

  it("refuses a seniority the other advert does not have", () => {
    const senior = makeSubject({
      title: "Data Analyst Senior",
      titleKey: titleKey("Data Analyst Senior"),
    });
    const junior = makeCandidate({ titleKey: titleKey("Data Analyst") });

    expect(matchJob(senior, [junior])).toBeNull();
  });

  it("refuses the same title at another company", () => {
    expect(matchJob(makeSubject(), [makeCandidate({ companyKey: "autre" })])).toBeNull();
  });

  it("refuses the same title in another department", () => {
    expect(matchJob(makeSubject(), [makeCandidate({ department: "69" })])).toBeNull();
  });

  it("refuses two look-alike adverts published months apart", () => {
    const subject = makeSubject({
      title: "Développeuse Full Stack",
      titleKey: titleKey("Développeuse Full Stack"),
    });
    const old = makeCandidate({ publishedAt: "2026-05-01T08:00:00.000Z" });

    expect(matchJob(subject, [old])).toBeNull();
  });

  it("merges a repost of the exact same advert, whatever its date", () => {
    // Same employer, same title, same place: a company reposting its own
    // offer. Merging is what stops it coming back as new in the selection.
    const reposted = makeCandidate({ publishedAt: "2026-05-01T08:00:00.000Z" });

    expect(matchJob(makeSubject(), [reposted])?.method).toBe("strict_key");
  });

  describe("anonymous employer", () => {
    it("matches on the description alone when it is near-identical", () => {
      const subject = makeSubject({ companyAnonymous: true, companyKey: "" });
      const candidate = makeCandidate({ descriptionSimhash: simhash(ADVERT) });

      const match = matchJob(subject, [candidate]);

      expect(match?.method).toBe("fuzzy");
    });

    it("refuses anything less than near-identical", () => {
      const subject = makeSubject({
        companyAnonymous: true,
        companyKey: "",
        descriptionSimhash: simhash(OTHER_ADVERT),
      });

      expect(matchJob(subject, [makeCandidate()])).toBeNull();
    });
  });

  it("keeps the best candidate when several could match", () => {
    const exact = makeCandidate({ jobId: "job-exact" });
    const looser = makeCandidate({
      jobId: "job-looser",
      titleKey: titleKey("Développeuse Full Stack"),
    });
    const subject = makeSubject({
      title: "Développeuse Full Stack",
      titleKey: titleKey("Développeuse Full Stack"),
    });

    // The identical key wins the strict step before any fuzzy comparison.
    expect(matchJob(subject, [exact, looser])?.jobId).toBe("job-looser");
  });

  it("opens a new job when nothing matches", () => {
    expect(matchJob(makeSubject(), [])).toBeNull();
  });
});
