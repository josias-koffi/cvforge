import { describe, expect, it } from "vitest";
import { readFranceTravailDetails } from "./france-travail.details";

const OFFER_URL =
  "https://candidat.francetravail.fr/offres/recherche/detail/214HTMC";

/** Shaped like stored payloads of 2026-09-25, trimmed to the fields read. */
const RAW = {
  accessibleTH: true,
  appellationlibelle: "Chef / Cheffe de projet conception industrielle",
  contact: {
    coordonnees1: "111 AVENUE de la prospective",
    coordonnees2: "18000 Bourges",
    coordonnees3: `Pour postuler, utiliser le lien suivant : ${OFFER_URL}`,
    courriel: `Pour postuler, utiliser le lien suivant : ${OFFER_URL}`,
    nom: "Agence France Travail BOURGES",
  },
  contexteTravail: {
    conditionsExercice: ["Possibilité de télétravail"],
    horaires: ["35H/semaine\nTravail en journée"],
  },
  dureeTravailLibelle: "35H/semaine\nTravail en journée",
  dureeTravailLibelleConverti: "Temps plein",
  employeurHandiEngage: true,
  entreprise: {
    description: "Fabricant de machines.",
    url: "https://acme.fr/",
  },
  experienceCommentaire: "chef de projet",
  experienceExige: "E",
  experienceLibelle: "2 An(s) - chef de projet",
  formations: [
    {
      commentaire: "ou équivalent",
      domaineLibelle: "Génie industriel",
      exigence: "E",
      niveauLibelle: "Bac+5 et plus ou équivalents",
    },
  ],
  langues: [{ exigence: "S", libelle: "Anglais" }],
  nombrePostes: 2,
  offresManqueCandidats: true,
  origineOffre: {
    partenaires: [{ nom: "METEOJOB", url: "https://www.meteojob.com/jobs/1" }],
  },
  permis: [{ exigence: "E", libelle: "B - Véhicule léger" }],
  qualitesProfessionnelles: [
    {
      description: "Capacité à mobiliser une équipe.",
      libelle: "Faire preuve de leadership",
    },
  ],
  salaire: {
    commentaire: "Selon profil",
    complement1: "Véhicule",
    libelle: "Annuel de 50000.0 Euros",
    listeComplements: [
      { code: "2", libelle: "Véhicule" },
      { code: "7", libelle: "Complémentaire santé" },
    ],
  },
  trancheEffectifEtab: "100 à 199 salariés",
  typeContratLibelle: "CDI",
};

function read(raw: unknown, overrides: { companyAnonymous?: boolean } = {}) {
  return readFranceTravailDetails({
    applyUrl: "",
    companyAnonymous: overrides.companyAnonymous ?? false,
    raw,
    source: "france_travail",
    url: OFFER_URL,
  });
}

describe("readFranceTravailDetails", () => {
  it("reads the profile, the pay and the facts", () => {
    const details = read(RAW);

    expect(details.facts).toEqual([
      { label: "Contrat", value: "CDI" },
      { label: "Temps de travail", value: "Temps plein" },
      { label: "Horaires", value: "35H/semaine · Travail en journée" },
      {
        label: "Métier",
        value: "Chef / Cheffe de projet conception industrielle",
      },
      { label: "Taille de l'établissement", value: "100 à 199 salariés" },
      { label: "Postes à pourvoir", value: "2" },
      { label: "Conditions d'exercice", value: "Possibilité de télétravail" },
    ]);
    expect(details.salary).toEqual({
      benefits: ["Véhicule", "Complémentaire santé"],
      comment: "Selon profil",
      label: "Annuel de 50000.0 Euros",
    });
    expect(details.experience).toEqual({
      comment: "",
      label: "2 An(s) - chef de projet",
      required: true,
    });
    expect(details.education).toEqual([
      {
        label:
          "Bac+5 et plus ou équivalents — Génie industriel (ou équivalent)",
        required: true,
      },
    ]);
    expect(details.languages).toEqual([{ label: "Anglais", required: false }]);
    expect(details.licences).toEqual([
      { label: "B - Véhicule léger", required: true },
    ]);
    expect(details.softSkills).toHaveLength(1);
    expect(details.lacksCandidates).toBe(true);
    expect(details.companyBadges).toEqual([
      "Employeur handi-engagé",
      "Accessible aux travailleurs handicapés",
    ]);
  });

  it("keeps the contact, minus the lines that only repeat the offer link", () => {
    expect(read(RAW).contact).toEqual({
      email: "",
      lines: ["111 AVENUE de la prospective", "18000 Bourges"],
      name: "Agence France Travail BOURGES",
    });
  });

  it("applies where France Travail's own button leads", () => {
    const employer = "https://careers.acme.fr/apply/1";

    expect(
      read({ ...RAW, contact: { urlPostulation: employer } }).apply,
    ).toEqual({
      host: "careers.acme.fr",
      name: "",
      target: "employer",
      url: employer,
    });
    expect(read(RAW)).toMatchObject({
      apply: { host: "www.meteojob.com", name: "Meteojob", target: "partner" },
      via: "Meteojob",
    });
    expect(read({}).apply).toEqual({
      host: "candidat.francetravail.fr",
      name: "",
      target: "source",
      url: OFFER_URL,
    });
  });

  it("names nothing of an employer that chose to stay hidden", () => {
    const details = read(RAW, { companyAnonymous: true });

    expect(details).toMatchObject({
      companyBadges: [],
      companyDescription: "",
      companyWebsite: "",
      contact: null,
    });
  });

  it("gives empty details for an empty or broken payload", () => {
    for (const raw of [{}, null, "oops", { formations: "no", salaire: 3 }]) {
      const details = read(raw);

      expect(details.facts).toEqual([]);
      expect(details.salary).toBeNull();
      expect(details.education).toEqual([]);
    }
  });

  it("ignores links that are not web links", () => {
    const details = read({ entreprise: { url: "javascript:alert(1)" } });

    expect(details.companyWebsite).toBe("");
  });
});
