import { describe, expect, it } from "vitest";
import { NotificationsMailerService } from "./notifications-mailer.service";

type SentMail = { html: string; subject: string; text: string; to: string };

function createMailer() {
  const sent: SentMail[] = [];
  const service = new NotificationsMailerService(
    { enabled: true, provider: "smtp" } as never,
    "CVForge <no-reply@cvforge.fr>",
    {
      sendMail: async (options: SentMail) => {
        sent.push(options);
      },
    } as never,
  );

  return { sent, service };
}

const BASE_INPUT = {
  digestUrl: "https://app.cvforge.fr/offres-du-jour",
  offers: [
    {
      companyName: "Doctolib",
      locationLabel: "Nantes, France",
      reason: "Même stack que vos trois dernières expériences.",
      score: 86,
      title: "Développeur Full Stack",
    },
  ],
  preferencesUrl: "https://app.cvforge.fr/notifications",
  to: "candidat@example.com",
  totalCount: 1,
};

describe("sendJobDigestEmail", () => {
  it("names the offers and links to the selection", async () => {
    const { sent, service } = createMailer();

    await service.sendJobDigestEmail(BASE_INPUT);

    const mail = sent[0]!;
    expect(mail.subject).toContain("1 offre(s)");
    expect(mail.text).toContain("Développeur Full Stack");
    expect(mail.text).toContain("86/100");
    expect(mail.html).toContain("https://app.cvforge.fr/offres-du-jour");
  });

  it("always carries the way out of the e-mail", async () => {
    const { sent, service } = createMailer();

    await service.sendJobDigestEmail(BASE_INPUT);

    // Findable in two seconds, in both parts of the message.
    expect(sent[0]!.text).toContain("Ne plus recevoir cet e-mail");
    expect(sent[0]!.html).toContain("https://app.cvforge.fr/notifications");
  });

  it("escapes what a third party wrote", async () => {
    const { sent, service } = createMailer();

    await service.sendJobDigestEmail({
      ...BASE_INPUT,
      offers: [
        {
          ...BASE_INPUT.offers[0]!,
          companyName: "Doctolib & Cie",
          title: "Développeur <script>alert(1)</script>",
        },
      ],
    });

    // Job titles come from job boards; they never reach the body as markup.
    expect(sent[0]!.html).not.toContain("<script>");
    expect(sent[0]!.html).toContain("&lt;script&gt;");
    expect(sent[0]!.html).toContain("Doctolib &amp; Cie");
  });

  it("says how many offers are left in the app", async () => {
    const { sent, service } = createMailer();

    await service.sendJobDigestEmail({ ...BASE_INPUT, totalCount: 7 });

    expect(sent[0]!.text).toContain("Et 6 autre(s) dans l'application.");
  });

  it("names an anonymous employer as such rather than leaving a hole", async () => {
    const { sent, service } = createMailer();

    await service.sendJobDigestEmail({
      ...BASE_INPUT,
      offers: [{ ...BASE_INPUT.offers[0]!, companyName: "" }],
    });

    expect(sent[0]!.text).toContain("entreprise non communiquee");
  });
});
