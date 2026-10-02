import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  composeApplicationFollowUpEmail,
  composeCreditPurchaseEmail,
  composeJobAlertEmail,
  composeJobDigestEmail,
  composeMagicLinkEmail,
  type ComposedEmail,
} from "./emails";
import { resolveMailConfig } from "./mail.config";

/**
 * Writes every e-mail, filled with made-up data, to `.email-previews/` so the
 * design can be checked in a browser without sending anything.
 *
 *   pnpm --filter @cvforge/api email:preview
 *
 * The logo is loaded from `LANDING_URL` (default: the local landing on
 * :3101); point it at https://jobspark.koklo.dev to preview without it.
 */
const brand = resolveMailConfig(process.env);
const inOneQuarter = new Date(Date.now() + 15 * 60_000).toISOString();
const preferencesUrl = `${brand.appUrl}/notifications`;

const emails: Record<string, ComposedEmail> = {
  "magic-link": composeMagicLinkEmail(brand, {
    expiresAt: inOneQuarter,
    magicLink:
      "https://jobspark-api.koklo.dev/auth/passwordless/consume?token=preview",
    sessionDurationDays: 7,
  }),
  "magic-link-tool-result": composeMagicLinkEmail(brand, {
    expiresAt: inOneQuarter,
    magicLink:
      "https://jobspark-api.koklo.dev/auth/passwordless/consume?token=preview",
    purpose: "tool-result",
    sessionDurationDays: 7,
  }),
  "job-digest": composeJobDigestEmail(brand, {
    digestUrl: `${brand.appUrl}/offres-du-jour`,
    marketNotes: [
      "Développeur informatique en Loire-Atlantique : offres en hausse, 2 910 sur douze mois contre 2 100 (1er trimestre 2026).",
    ],
    offers: [
      {
        companyName: "Doctolib",
        locationLabel: "Nantes, France",
        reason: "Même stack que vos trois dernières expériences.",
        score: 86,
        title: "Développeur full stack",
      },
      {
        companyName: "Alan",
        locationLabel: "Paris (télétravail partiel)",
        reason: "Poste senior en TypeScript, votre point fort.",
        score: 78,
        title: "Ingénieur backend Node.js",
      },
      {
        companyName: "",
        locationLabel: "Rennes",
        reason: "",
        score: 64,
        title: "Lead développeur React",
      },
    ],
    preferencesUrl,
    totalCount: 9,
  }),
  "job-alert": composeJobAlertEmail(brand, {
    now: new Date().toISOString(),
    offers: [alertOffer("Développeur full stack", "Doctolib", "Nantes", 4)],
    offersUrl: `${brand.appUrl}/offres-du-jour`,
    preferencesUrl,
  }),
  "job-alert-analysis": composeJobAlertEmail(brand, {
    now: new Date().toISOString(),
    offers: [
      {
        ...alertOffer("Développeur full stack", "Doctolib", "Nantes", 4),
        analysis: {
          highlights: ["Vos trois ans de React et TypeScript en production"],
          reasons: [
            "Même stack que votre poste actuel : React, TypeScript, PostgreSQL",
            "Un cran au-dessus en responsabilités, dans une équipe produit",
          ],
          verdict: "seize" as const,
          watchouts: ["L'offre cite Kubernetes, absent de votre profil"],
        },
      },
      {
        ...alertOffer("Ingénieur backend Node.js", "", "Rennes", 9),
        analysisMissing: true,
      },
    ],
    offersUrl: `${brand.appUrl}/offres-du-jour`,
    preferencesUrl,
  }),
  "job-alert-grouped": composeJobAlertEmail(brand, {
    now: new Date().toISOString(),
    offers: [
      alertOffer("Développeur full stack", "Doctolib", "Nantes", 12),
      alertOffer(
        "Ingénieur backend Node.js",
        "",
        "Rennes (télétravail partiel)",
        47,
      ),
    ],
    offersUrl: `${brand.appUrl}/offres-du-jour`,
    preferencesUrl,
  }),
  "application-follow-up": composeApplicationFollowUpEmail(brand, {
    companyName: "Doctolib",
    delayDays: 7,
    followUpUrl: `${brand.appUrl}/candidatures?applicationId=preview`,
    jobTitle: "Développeur full stack",
    preferencesUrl,
  }),
  "credit-purchase": composeCreditPurchaseEmail(brand, {
    amountCents: 1900,
    credits: 60,
    offerName: "Essentiel",
    preferencesUrl,
  }),
};

function alertOffer(
  title: string,
  companyName: string,
  locationLabel: string,
  minutesAgo: number,
) {
  return {
    applyUrl: `${brand.appUrl}/offres-du-jour/postuler/preview`,
    companyName,
    locationLabel,
    publishedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    reasons: [
      "vos compétences en TypeScript, React, PostgreSQL",
      "télétravail possible",
    ],
    sourceLabel: "France Travail",
    title,
  };
}

const outDir = resolve(process.cwd(), ".email-previews");
mkdirSync(outDir, { recursive: true });

for (const [name, email] of Object.entries(emails)) {
  writeFileSync(resolve(outDir, `${name}.html`), email.html);
  writeFileSync(
    resolve(outDir, `${name}.txt`),
    `Objet : ${email.subject}\n\n${email.text}\n`,
  );
  console.log(`${name}: ${resolve(outDir, `${name}.html`)}`);
}
