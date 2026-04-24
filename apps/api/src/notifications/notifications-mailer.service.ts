import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { creditPacks } from "@cvforge/types";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";

export const NOTIFICATIONS_EMAIL_FROM = Symbol("NOTIFICATIONS_EMAIL_FROM");
export const NOTIFICATIONS_MAIL_TRANSPORT = Symbol(
  "NOTIFICATIONS_MAIL_TRANSPORT",
);

type NotificationsMailTransport = {
  sendMail: (options: {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string;
  }) => Promise<unknown>;
};

type ApplicationFollowUpEmailInput = {
  companyName: string;
  followUpUrl: string;
  jobTitle: string;
  to: string;
};

type CreditPurchaseConfirmationEmailInput = {
  amountCents: number;
  credits: number;
  packId: keyof typeof creditPacks;
  to: string;
};

@Injectable()
export class NotificationsMailerService {
  constructor(
    @Inject(SMTP_CONFIG) private readonly smtpConfig: SmtpConfig,
    @Inject(NOTIFICATIONS_EMAIL_FROM)
    private readonly emailFrom: string | null,
    @Inject(NOTIFICATIONS_MAIL_TRANSPORT)
    private readonly transport: NotificationsMailTransport | null,
  ) {}

  getDeliveryStatus() {
    return {
      provider: this.smtpConfig.provider,
      ready:
        this.smtpConfig.enabled && this.transport !== null && this.emailFrom !== null,
    };
  }

  async sendApplicationFollowUpEmail(input: ApplicationFollowUpEmailInput) {
    await this.sendMail({
      html: [
        "<p>Bonjour,</p>",
        `<p>Votre candidature pour <strong>${input.jobTitle}</strong> chez <strong>${input.companyName}</strong> est au statut <strong>envoyee</strong> depuis 7 jours.</p>`,
        `<p><a href="${input.followUpUrl}">Ouvrir la candidature dans CVforge</a></p>`,
        "<p>Si vous n'avez toujours pas de retour, c'est le bon moment pour planifier une relance.</p>",
      ].join(""),
      subject: `Relance candidature ${input.companyName}`,
      text: [
        "Bonjour,",
        "",
        `Votre candidature pour ${input.jobTitle} chez ${input.companyName} est envoyee depuis 7 jours.`,
        `Ouvrir dans CVforge : ${input.followUpUrl}`,
        "",
        "Si vous n'avez toujours pas de retour, pensez a planifier une relance.",
      ].join("\n"),
      to: input.to,
    });
  }

  async sendCreditPurchaseConfirmationEmail(
    input: CreditPurchaseConfirmationEmailInput,
  ) {
    const pack = creditPacks[input.packId];
    const amount = (input.amountCents / 100).toFixed(2);

    await this.sendMail({
      html: [
        "<p>Bonjour,</p>",
        `<p>Votre achat du pack <strong>${pack.label}</strong> a bien ete confirme.</p>`,
        `<p>${input.credits} credits ont ete ajoutes a votre solde pour un montant de ${amount} EUR.</p>`,
        "<p>Vous pouvez des maintenant reprendre vos generations CVforge.</p>",
      ].join(""),
      subject: `Achat de credits confirme (${pack.label})`,
      text: [
        "Bonjour,",
        "",
        `Votre achat du pack ${pack.label} a bien ete confirme.`,
        `${input.credits} credits ont ete ajoutes a votre solde pour ${amount} EUR.`,
        "",
        "Vous pouvez reprendre vos generations CVforge.",
      ].join("\n"),
      to: input.to,
    });
  }

  private async sendMail(input: {
    html: string;
    subject: string;
    text: string;
    to: string;
  }) {
    if (!this.smtpConfig.enabled || !this.transport || !this.emailFrom) {
      return;
    }

    try {
      await this.transport.sendMail({
        from: this.emailFrom,
        ...input,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Notification email sending failed: ${error.message}`
          : "Notification email sending failed.",
      );
    }
  }
}
