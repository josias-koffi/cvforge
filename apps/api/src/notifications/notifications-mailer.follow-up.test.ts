import { describe, expect, it } from "vitest";
import { testMailConfig } from "../mail/mail.testing";
import { NotificationsMailerService } from "./notifications-mailer.service";

type SentMail = { html: string; replyTo?: string; subject: string; text: string };

function createMailer() {
  const sent: SentMail[] = [];
  const service = new NotificationsMailerService(
    { enabled: true, provider: "smtp" } as never,
    testMailConfig({ appUrl: "https://app.jobspark.test" }),
    {
      sendMail: async (options: SentMail) => {
        sent.push(options);
      },
    } as never,
  );

  return { sent, service };
}

describe("sendApplicationFollowUpEmail", () => {
  it("turns the app path into a link that works from a mailbox", async () => {
    const { sent, service } = createMailer();

    await service.sendApplicationFollowUpEmail({
      companyName: "Doctolib",
      delayDays: 7,
      followUpUrl: "/candidatures?applicationId=app-001",
      jobTitle: "Développeur",
      to: "user@example.com",
    });

    expect(sent[0]!.html).toContain(
      'href="https://app.jobspark.test/candidatures?applicationId=app-001"',
    );
    expect(sent[0]!.html).toContain("https://app.jobspark.test/notifications");
    expect(sent[0]!.replyTo).toBe("support@jobspark.test");
  });
});

describe("sendCreditPurchaseConfirmationEmail", () => {
  it("confirms the pack and links back to the app", async () => {
    const { sent, service } = createMailer();

    await service.sendCreditPurchaseConfirmationEmail({
      amountCents: 2900,
      credits: 1,
      offerName: "Découverte",
      to: "user@example.com",
    });

    expect(sent[0]!.subject).toBe("Achat confirmé : 1 crédit ajouté");
  });
});
