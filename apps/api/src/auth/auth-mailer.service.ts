import {
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";

export const AUTH_MAIL_TRANSPORT = Symbol("AUTH_MAIL_TRANSPORT");
export const AUTH_EMAIL_FROM = Symbol("AUTH_EMAIL_FROM");

type AuthMailTransport = {
  sendMail: (options: {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string;
  }) => Promise<unknown>;
};

type MagicLinkEmailInput = {
  email: string;
  expiresAt: string;
  magicLink: string;
  sessionDurationDays: number;
};

type AuthEmailHealth = {
  emailFromConfigured: boolean;
  ready: boolean;
  smtpEnabled: boolean;
};

@Injectable()
export class AuthMailerService {
  constructor(
    @Inject(SMTP_CONFIG) private readonly smtpConfig: SmtpConfig,
    @Inject(AUTH_EMAIL_FROM) private readonly emailFrom: string | null,
    @Inject(AUTH_MAIL_TRANSPORT)
    private readonly transport: AuthMailTransport | null,
  ) {}

  getHealth(): AuthEmailHealth {
    return {
      emailFromConfigured: this.emailFrom !== null,
      ready:
        this.smtpConfig.enabled && this.transport !== null && this.emailFrom !== null,
      smtpEnabled: this.smtpConfig.enabled,
    };
  }

  assertDeliveryReady() {
    const health = this.getHealth();

    if (!health.smtpEnabled) {
      throw new ServiceUnavailableException(
        "Auth email delivery is disabled because SMTP is not configured.",
      );
    }

    if (!health.emailFromConfigured) {
      throw new ServiceUnavailableException(
        "Auth email delivery is misconfigured: EMAIL_FROM is missing.",
      );
    }

    if (!health.ready) {
      throw new ServiceUnavailableException(
        "Auth email delivery is misconfigured: SMTP transport is unavailable.",
      );
    }
  }

  async sendMagicLinkEmail(input: MagicLinkEmailInput) {
    this.assertDeliveryReady();
    const transport = this.transport;
    const emailFrom = this.emailFrom;

    try {
      await transport!.sendMail({
        from: emailFrom!,
        html: this.buildHtmlBody(input),
        subject: "Votre lien de connexion CVforge",
        text: this.buildTextBody(input),
        to: input.email,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Magic-link email sending failed: ${error.message}`
          : "Magic-link email sending failed.",
      );
    }
  }

  private buildTextBody(input: MagicLinkEmailInput) {
    return [
      "Bonjour,",
      "",
      "Voici votre lien de connexion CVforge :",
      input.magicLink,
      "",
      `Ce lien expire le ${input.expiresAt}.`,
      `La session ouverte restera valide ${input.sessionDurationDays} jours selon la configuration actuelle.`,
      "",
      "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
    ].join("\n");
  }

  private buildHtmlBody(input: MagicLinkEmailInput) {
    return [
      "<p>Bonjour,</p>",
      "<p>Voici votre lien de connexion CVforge :</p>",
      `<p><a href="${input.magicLink}">Se connecter a CVforge</a></p>`,
      `<p>Ce lien expire le ${input.expiresAt}.</p>`,
      `<p>La session ouverte restera valide ${input.sessionDurationDays} jours selon la configuration actuelle.</p>`,
      "<p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>",
    ].join("");
  }
}
