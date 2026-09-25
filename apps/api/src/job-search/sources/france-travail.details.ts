import {
  emptyDetails,
  facts,
  hostOf,
  list,
  type ListingForDetails,
  type OfferDetails,
  type OfferRequirement,
  record,
  text,
  webUrl,
} from "../offer-details.types";

/**
 * What a France Travail offer says beyond its text. Field names and value
 * shapes checked against 1,873 stored offers on 2026-09-25: none of these is
 * on every offer, and `exigence` is "E" (required) or "S" (wished for).
 */
export function readFranceTravailDetails(
  listing: ListingForDetails,
): OfferDetails {
  const offer = record(listing.raw);
  const salary = record(offer.salaire);
  const company = record(offer.entreprise);
  const context = record(offer.contexteTravail);
  const partner = firstPartner(offer);
  const hidden = listing.companyAnonymous;

  return {
    ...emptyDetails("france_travail"),
    apply: readApply(listing, offer, partner),
    companyBadges: hidden ? [] : companyBadges(offer, company),
    companyDescription: hidden ? "" : text(company.description),
    companyWebsite: hidden ? "" : webUrl(company.url),
    contact: hidden ? null : readContact(offer, listing.url),
    education: list(offer.formations).flatMap(readEducation),
    experience: readExperience(offer),
    facts: facts([
      ["Contrat", text(offer.typeContratLibelle)],
      ["Temps de travail", text(offer.dureeTravailLibelleConverti)],
      ["Horaires", readHours(offer, context)],
      ["Métier", text(offer.appellationlibelle) || text(offer.romeLibelle)],
      ["Qualification", text(offer.qualificationLibelle)],
      ["Secteur", text(offer.secteurActiviteLibelle)],
      ["Taille de l'établissement", companySize(offer.trancheEffectifEtab)],
      ["Postes à pourvoir", positions(offer.nombrePostes)],
      ["Déplacements", text(offer.deplacementLibelle)],
      [
        "Conditions d'exercice",
        [
          ...list(context.conditionsExercice).map(text),
          text(offer.complementExercice),
        ]
          .filter(Boolean)
          .join(", "),
      ],
    ]),
    lacksCandidates: offer.offresManqueCandidats === true,
    languages: list(offer.langues).flatMap(requirement),
    licences: list(offer.permis).flatMap(requirement),
    salary: readSalary(salary),
    softSkills: list(offer.qualitesProfessionnelles).flatMap((entry) => {
      const label = text(record(entry).libelle);
      return label
        ? [{ description: text(record(entry).description), label }]
        : [];
    }),
    via: partner?.name ?? "",
  };
}

/**
 * The link France Travail's own "Postuler" button follows: the employer's
 * application form first, then the job board the offer was relayed from,
 * and only then France Travail itself.
 */
function readApply(
  listing: ListingForDetails,
  offer: Record<string, unknown>,
  partner: Partner | null,
): OfferDetails["apply"] {
  const employer = webUrl(record(offer.contact).urlPostulation);
  if (employer)
    return {
      host: hostOf(employer),
      name: "",
      target: "employer",
      url: employer,
    };
  if (partner)
    return {
      host: hostOf(partner.url),
      name: partner.name,
      target: "partner",
      url: partner.url,
    };

  const own = webUrl(listing.url);
  return own
    ? { host: hostOf(own), name: "", target: "source", url: own }
    : null;
}

interface Partner {
  name: string;
  url: string;
}

/**
 * The job board the offer is relayed from, by the name France Travail gives
 * it: its links often go through a multiposting host ("aplitrak.com") that
 * the candidate would not recognise.
 */
function firstPartner(offer: Record<string, unknown>): Partner | null {
  for (const partner of list(record(offer.origineOffre).partenaires)) {
    const url = webUrl(record(partner).url);
    if (url) return { name: partnerName(text(record(partner).nom), url), url };
  }

  return null;
}

/** "HANDICAP_JOB" reads "Handicap Job"; a name already in mixed case stays. */
function partnerName(name: string, url: string): string {
  if (!name) return hostOf(url).replace(/^www\./, "");
  if (name !== name.toUpperCase()) return name;

  return name
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** "35H/semaine\nTravail en journée", once: both fields often say the same. */
function readHours(
  offer: Record<string, unknown>,
  context: Record<string, unknown>,
): string {
  const lines = [
    text(offer.dureeTravailLibelle),
    ...list(context.horaires).map(text),
  ].flatMap((entry) => entry.split("\n").map((line) => line.trim()));

  return [...new Set(lines.filter(Boolean))].join(" · ");
}

/**
 * "0 salarié (n'ayant pas d'effectif au 31/12…)" is how France Travail says it
 * does not know: nothing worth reading. The other brackets are kept.
 */
function companySize(value: unknown): string {
  const size = text(value);
  return /^0 salarié/i.test(size) ? "" : size;
}

function positions(value: unknown): string {
  return typeof value === "number" && value > 1 ? String(value) : "";
}

function readSalary(salary: Record<string, unknown>): OfferDetails["salary"] {
  const label = text(salary.libelle);
  const comment = text(salary.commentaire);
  const listed = list(salary.listeComplements).map((entry) =>
    text(record(entry).libelle),
  );
  const benefits = [
    ...new Set(
      [...listed, text(salary.complement1), text(salary.complement2)].filter(
        Boolean,
      ),
    ),
  ];

  return label || comment || benefits.length > 0
    ? { benefits, comment, label }
    : null;
}

function readExperience(
  offer: Record<string, unknown>,
): OfferDetails["experience"] {
  const label = text(offer.experienceLibelle);
  if (!label) return null;

  // The label often already ends with the comment: "2 An(s) - chef de projet".
  const comment = text(offer.experienceCommentaire);

  return {
    comment: label.includes(comment) ? "" : comment,
    label,
    required: text(offer.experienceExige).toUpperCase() === "E",
  };
}

/** "Bac+5 et plus ou équivalents — Génie industriel (ou équivalent)". */
function readEducation(entry: unknown): OfferRequirement[] {
  const training = record(entry);
  const level = text(training.niveauLibelle);
  const field = text(training.domaineLibelle);
  const comment = text(training.commentaire);
  const label = [
    [level, field].filter(Boolean).join(" — "),
    comment && `(${comment})`,
  ]
    .filter(Boolean)
    .join(" ");

  return label ? [{ label, required: isRequired(training) }] : [];
}

function requirement(entry: unknown): OfferRequirement[] {
  const label = text(record(entry).libelle);
  return label ? [{ label, required: isRequired(record(entry)) }] : [];
}

function isRequired(entry: Record<string, unknown>): boolean {
  return text(entry.exigence).toUpperCase() === "E";
}

function companyBadges(
  offer: Record<string, unknown>,
  company: Record<string, unknown>,
): string[] {
  return [
    company.entrepriseAdaptee === true || offer.entrepriseAdaptee === true
      ? "Entreprise adaptée"
      : "",
    offer.employeurHandiEngage === true ? "Employeur handi-engagé" : "",
    offer.accessibleTH === true ? "Accessible aux travailleurs handicapés" : "",
  ].filter(Boolean);
}

/**
 * The recruiter's contact, without the lines that only repeat "apply with
 * this link" — the link is the offer's own page, already one click away.
 */
function readContact(
  offer: Record<string, unknown>,
  offerUrl: string,
): OfferDetails["contact"] {
  const contact = record(offer.contact);
  const useful = (line: string) =>
    line !== "" &&
    !/^pour postuler/i.test(line) &&
    !(offerUrl && line.includes(offerUrl));
  const email = text(contact.courriel);
  const lines = [
    contact.coordonnees1,
    contact.coordonnees2,
    contact.coordonnees3,
  ]
    .map(text)
    .filter(useful);
  const name = text(contact.nom);
  const kept = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    lines,
    name,
  };

  return kept.email || kept.lines.length > 0 || kept.name ? kept : null;
}
