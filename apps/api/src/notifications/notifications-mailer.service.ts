import { MARKET_SOURCE_LABEL } from "@cvforge/types";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
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

type JobDigestEmailInput = {
  /** At most a handful: the e-mail is a teaser, the page holds the rest. */
  offers: Array<{
    title: string;
    companyName: string;
    locationLabel: string;
    score: number;
    reason: string;
  }>;
  totalCount: number;
  /** One line per notable market change, each with its period (US-128). */
  marketNotes: string[];
  digestUrl: string;
  preferencesUrl: string;
  to: string;
};

type CreditPurchaseConfirmationEmailInput = {
  amountCents: number;
  credits: number;
  offerName: string;
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
        `<p>Votre candidature pour <strong>${escapeHtml(input.jobTitle)}</strong> chez <strong>${escapeHtml(input.companyName)}</strong> est au statut <strong>envoyee</strong> depuis 7 jours.</p>`,
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

  /**
   * The morning selection.
   *
   * Deliberately short: the offers are named, the reasons are the ones already
   * shown in the app, and the links go to CVforge rather than to the adverts —
   * applying goes through the product, and the sources are credited there.
   *
   * The unsubscribe link is in the body, not only in a header: it is the one
   * thing somebody looking for it must find in two seconds.
   */
  async sendJobDigestEmail(input: JobDigestEmailInput) {
    const offerLines = input.offers.map(
      (offer) =>
        `${offer.title} - ${offer.companyName || "entreprise non communiquee"}` +
        `${offer.locationLabel ? ` (${offer.locationLabel})` : ""} - ${offer.score}/100` +
        `${offer.reason ? `\n  ${offer.reason}` : ""}`,
    );
    const remaining = input.totalCount - input.offers.length;

    await this.sendMail({
      html: [
        "<p>Bonjour,</p>",
        `<p>Voici vos <strong>${input.totalCount} offre(s)</strong> du jour, choisies d'apres votre recherche.</p>`,
        "<ul>",
        ...input.offers.map(
          (offer) =>
            `<li><strong>${escapeHtml(offer.title)}</strong> - ${escapeHtml(offer.companyName || "entreprise non communiquee")}` +
            `${offer.locationLabel ? ` (${escapeHtml(offer.locationLabel)})` : ""} - ${offer.score}/100` +
            `${offer.reason ? `<br /><em>${escapeHtml(offer.reason)}</em>` : ""}</li>`,
        ),
        "</ul>",
        remaining > 0 ? `<p>Et ${remaining} autre(s) dans l'application.</p>` : "",
        input.marketNotes.length > 0
          ? `<p><strong>Le marché de votre métier</strong><br />${input.marketNotes.map(escapeHtml).join("<br />")}` +
            `<br /><span style="font-size:12px;color:#666">${escapeHtml(MARKET_SOURCE_LABEL)}</span></p>`
          : "",
        `<p><a href="${input.digestUrl}">Voir mes offres du jour</a></p>`,
        `<p style="font-size:12px;color:#666">Vous ne voulez plus de cet e-mail ? <a href="${input.preferencesUrl}">Desactivez-le ici</a> ; les offres restent visibles dans l'application.</p>`,
      ].join(""),
      subject: `${input.totalCount} offre(s) pour vous aujourd'hui`,
      text: [
        "Bonjour,",
        "",
        `Voici vos ${input.totalCount} offre(s) du jour, choisies d'apres votre recherche.`,
        "",
        ...offerLines,
        "",
        // Only this line is conditional; the blank lines above are the layout.
        ...(remaining > 0 ? [`Et ${remaining} autre(s) dans l'application.`, ""] : []),
        ...(input.marketNotes.length > 0
          ? ["Le marché de votre métier :", ...input.marketNotes, MARKET_SOURCE_LABEL, ""]
          : []),
        `Voir mes offres du jour : ${input.digestUrl}`,
        "",
        `Ne plus recevoir cet e-mail : ${input.preferencesUrl}`,
      ].join("\n"),
      to: input.to,
    });
  }

  async sendCreditPurchaseConfirmationEmail(
    input: CreditPurchaseConfirmationEmailInput,
  ) {
    const amount = (input.amountCents / 100).toFixed(2);

    await this.sendMail({
      html: [
        "<p>Bonjour,</p>",
        `<p>Votre achat du pack <strong>${escapeHtml(input.offerName)}</strong> a bien ete confirme.</p>`,
        `<p>${input.credits} credits ont ete ajoutes a votre solde pour un montant de ${amount} EUR.</p>`,
        "<p>Vous pouvez des maintenant reprendre vos generations CVforge.</p>",
      ].join(""),
      subject: `Achat de credits confirme (${input.offerName})`,
      text: [
        "Bonjour,",
        "",
        `Votre achat du pack ${input.offerName} a bien ete confirme.`,
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

/**
 * Escapes what a third party wrote.
 *
 * Job titles, company names and the model's own sentences all end up inside
 * the HTML body of an e-mail we send in the candidate's name. None of it is
 * ours, so none of it goes in unescaped.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
