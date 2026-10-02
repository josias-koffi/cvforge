import { describe, expect, it } from "vitest";
import {
  composeJobAlertEmail,
  publishedAgo,
  type JobAlertOffer,
} from "./job-alert-email";
import { testMailConfig } from "./mail.testing";

const brand = testMailConfig();
const NOW = "2026-10-02T08:00:00.000Z";

function offer(overrides: Partial<JobAlertOffer> = {}): JobAlertOffer {
  return {
    applyUrl: "https://app.jobspark.test/offres-du-jour/postuler/job-1",
    companyName: "Doctolib",
    locationLabel: "Nantes",
    publishedAt: "2026-10-02T07:56:00.000Z",
    reasons: ["vos compétences en TypeScript, React"],
    sourceLabel: "France Travail",
    title: "Développeur full stack",
    ...overrides,
  };
}

function compose(offers: JobAlertOffer[]) {
  return composeJobAlertEmail(brand, {
    now: NOW,
    offers,
    offersUrl: "https://app.jobspark.test/offres-du-jour",
    preferencesUrl: "https://app.jobspark.test/notifications",
  });
}

describe("composeJobAlertEmail (US-166)", () => {
  it("names the offer, its company, place, age, source and why it matches", () => {
    const email = compose([offer()]);

    expect(email.subject).toBe(
      "Nouvelle offre pour vous : Développeur full stack",
    );
    for (const part of [
      "Développeur full stack",
      "Doctolib · Nantes",
      "Publiée il y a 4 min · Source : France Travail",
      "Pourquoi elle vous correspond : vos compétences en TypeScript, React.",
      "Postuler avec Jobspark : https://app.jobspark.test/offres-du-jour/postuler/job-1",
    ]) {
      expect(email.text).toContain(part);
    }
    expect(email.html).toContain(
      'href="https://app.jobspark.test/offres-du-jour/postuler/job-1"',
    );
  });

  it("can be turned off from the e-mail itself, header included", () => {
    const email = compose([offer()]);

    expect(email.headers).toEqual({
      "List-Unsubscribe": "<https://app.jobspark.test/notifications>",
    });
    expect(email.html).toContain("https://app.jobspark.test/notifications");
    expect(email.text).toContain("Elles sont gratuites.");
  });

  it("groups several offers, each with its own button", () => {
    const email = compose([
      offer(),
      offer({ companyName: "", title: "Lead React" }),
    ]);

    expect(email.subject).toBe("2 nouvelles offres pour vous");
    expect(email.text).toContain(
      "Lead React — Entreprise non communiquée · Nantes",
    );
    expect(email.text.match(/Postuler avec Jobspark/g)).toHaveLength(2);
  });

  it("escapes what the source wrote", () => {
    expect(
      compose([offer({ title: "<script>x</script>" })]).html,
    ).not.toContain("<script>x");
  });
});

describe("the paid analysis in the alert (US-168)", () => {
  const analysis = {
    highlights: ["Vos 3 ans de React en production"],
    reasons: [
      "Même stack que votre poste actuel",
      "Salaire au-dessus de votre dernier poste",
    ],
    verdict: "seize" as const,
    watchouts: ["L'offre demande Kubernetes, absent de votre profil"],
  };

  it("sits under the offer, which stays exactly as published", () => {
    const plain = compose([offer()]);
    const email = compose([offer({ analysis })]);

    expect(email.text).toContain("Analyse IA · À saisir");
    expect(email.text).toContain("Pourquoi elle vaut le coup :");
    expect(email.text).toContain(
      "   - Salaire au-dessus de votre dernier poste",
    );
    expect(email.text).toContain("Points de vigilance :");
    expect(email.text).toContain("À mettre en avant :");
    // Everything the offer said is still there, before the analysis.
    const card = plain.text.slice(
      plain.text.indexOf("• Développeur"),
      plain.text.indexOf("Postuler avec"),
    );
    expect(email.text).toContain(card.trim());
    expect(email.text.indexOf("• Développeur")).toBeLessThan(
      email.text.indexOf("Analyse IA"),
    );
  });

  it("says when the analysis is not included, the alert going anyway", () => {
    const email = compose([offer({ analysisMissing: true })]);

    expect(email.text).toContain("Analyse IA non incluse");
    expect(email.text).toContain("Postuler avec Jobspark");
  });

  it("adds nothing for a candidate without the option", () => {
    expect(compose([offer()]).text).not.toContain("Analyse IA");
  });
});

describe("publishedAgo", () => {
  it("reads like a person would say it", () => {
    expect(publishedAgo("2026-10-02T08:00:00.000Z", NOW)).toBe("à l'instant");
    expect(publishedAgo("2026-10-02T07:15:00.000Z", NOW)).toBe("il y a 45 min");
    expect(publishedAgo("2026-10-02T05:00:00.000Z", NOW)).toBe("il y a 3 h");
    expect(publishedAgo("2026-09-30T08:00:00.000Z", NOW)).toContain(
      "le 30 septembre 2026",
    );
  });
});
