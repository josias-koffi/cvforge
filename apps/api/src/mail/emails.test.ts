import { describe, expect, it } from "vitest";
import {
  composeApplicationFollowUpEmail,
  composeCreditPurchaseEmail,
  composeMagicLinkEmail,
} from "./emails";
import { paragraph } from "./mail-blocks";
import { absoluteAppUrl } from "./mail-brand";
import { renderEmail } from "./mail-layout";
import { resolveMailConfig } from "./mail.config";
import { testMailConfig } from "./mail.testing";

const brand = testMailConfig();

describe("renderEmail", () => {
  const content = {
    blocks: [paragraph("Bonjour <b>vous</b>")],
    heading: "Titre",
    preheader: "Aperçu",
    reason: "Parce que.",
    title: "Titre",
  };

  it("frames every message with the Jobspark logo, footer and legal links", () => {
    const { html, text } = renderEmail(brand, content);

    expect(html).toContain('src="https://jobspark.test/email/jobspark-mark.png"');
    expect(html).toContain('alt="Jobspark"');
    expect(html).toContain("Les bonnes offres. Le bon CV. Une étincelle.");
    expect(html).toContain("mailto:support@jobspark.test");
    expect(html).toContain("https://jobspark.test/fr/legal/cgu");
    expect(html).toContain("https://jobspark.test/fr/legal/confidentialite");
    expect(text).toContain("Une question ? support@jobspark.test");
  });

  it("escapes the content it is given", () => {
    const { html, text } = renderEmail(brand, content);

    expect(html).toContain("Bonjour &lt;b&gt;vous&lt;/b&gt;");
    expect(text).toContain("Bonjour <b>vous</b>");
  });

  it("offers a way out only when there is one", () => {
    expect(renderEmail(brand, content).html).not.toContain("désabonnez-vous");

    const withPreferences = renderEmail(brand, {
      ...content,
      preferencesUrl: "https://app.jobspark.test/notifications",
    });
    expect(withPreferences.html).toContain("https://app.jobspark.test/notifications");
    expect(withPreferences.text).toContain(
      "Ne plus recevoir ces e-mails : https://app.jobspark.test/notifications",
    );
  });

  it("only invites a reply when replies reach someone", () => {
    expect(renderEmail(brand, content).html).toContain("Répondez à cet e-mail");
    expect(
      renderEmail({ ...brand, replyTo: null }, content).html,
    ).not.toContain("Répondez à cet e-mail");
  });
});

describe("composeMagicLinkEmail", () => {
  it("escapes the link where it lands in an attribute", () => {
    const email = composeMagicLinkEmail(brand, {
      expiresAt: "2026-04-19T20:34:09.000Z",
      magicLink: 'https://api.test/consume?token=a"b&next=/x',
      sessionDurationDays: 7,
    });

    expect(email.html).toContain('href="https://api.test/consume?token=a&quot;b&amp;next=/x"');
    expect(email.html).not.toContain('token=a"b');
  });
});

describe("composeApplicationFollowUpEmail", () => {
  it("names the application and the configured delay", () => {
    const email = composeApplicationFollowUpEmail(brand, {
      companyName: "Doctolib",
      delayDays: 10,
      followUpUrl: "https://app.jobspark.test/candidatures?applicationId=a1",
      jobTitle: "Développeur",
      preferencesUrl: "https://app.jobspark.test/notifications",
    });

    expect(email.subject).toBe("Relancer Doctolib ?");
    expect(email.text).toContain("envoyée depuis 10 jours");
    expect(email.html).toContain(
      'href="https://app.jobspark.test/candidatures?applicationId=a1"',
    );
  });
});

describe("composeCreditPurchaseEmail", () => {
  it("sums up the purchase in euros, with no tax line", () => {
    const email = composeCreditPurchaseEmail(brand, {
      amountCents: 1200,
      credits: 50,
      offerName: "Essentiel",
      preferencesUrl: "https://app.jobspark.test/notifications",
    });

    expect(email.subject).toBe("Achat confirmé : 50 crédits ajoutés");
    expect(email.text).toContain("Pack : Essentiel");
    expect(email.text).toMatch(/Montant payé : 12,00\s€/);
    expect(email.text).not.toMatch(/TVA|TTC/);
  });
});

describe("absoluteAppUrl", () => {
  it("makes an app path clickable from a mailbox", () => {
    expect(absoluteAppUrl("https://app.test", "/candidatures?id=1")).toBe(
      "https://app.test/candidatures?id=1",
    );
    expect(absoluteAppUrl("https://app.test", "https://other.test/x")).toBe(
      "https://other.test/x",
    );
  });
});

describe("resolveMailConfig", () => {
  it("reads the sender, the reply address and the public URLs", () => {
    expect(
      resolveMailConfig({
        EMAIL_FROM: "Jobspark <no-reply@jobspark.koklo.dev>",
        EMAIL_REPLY_TO: "Jobspark <support@jobspark.koklo.dev>",
        LANDING_URL: "https://jobspark.koklo.dev/",
        NEXT_PUBLIC_APP_URL: "https://jobspark-app.koklo.dev",
      }),
    ).toEqual({
      appUrl: "https://jobspark-app.koklo.dev",
      from: "Jobspark <no-reply@jobspark.koklo.dev>",
      landingUrl: "https://jobspark.koklo.dev",
      replyTo: "Jobspark <support@jobspark.koklo.dev>",
      supportEmail: "support@jobspark.koklo.dev",
    });
  });

  it("falls back to local URLs and no sender when nothing is set", () => {
    const config = resolveMailConfig({});

    expect(config.from).toBeNull();
    expect(config.replyTo).toBeNull();
    expect(config.landingUrl).toBe("http://localhost:3101");
  });
});
