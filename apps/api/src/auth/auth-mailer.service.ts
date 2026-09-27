import {
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { composeMagicLinkEmail, type MagicLinkEmailInput } from "../mail/emails";
import { MAIL_CONFIG, type MailConfig } from "../mail/mail.config";
import {
  MAIL_TRANSPORT,
  toMailMessage,
  type MailTransport,
} from "../mail/mail-transport";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";

type AuthEmailHealth = {
  emailFromConfigured: boolean;
  ready: boolean;
  smtpEnabled: boolean;
};

@Injectable()
export class AuthMailerService {
  constructor(
    @Inject(SMTP_CONFIG) private readonly smtpConfig: SmtpConfig,
    @Inject(MAIL_CONFIG) private readonly mailConfig: MailConfig,
    @Inject(MAIL_TRANSPORT)
    private readonly transport: MailTransport | null,
  ) {}

  getHealth(): AuthEmailHealth {
    return {
      emailFromConfigured: this.mailConfig.from !== null,
      ready:
        this.smtpConfig.enabled &&
        this.transport !== null &&
        this.mailConfig.from !== null,
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

  async sendMagicLinkEmail(input: MagicLinkEmailInput & { email: string }) {
    this.assertDeliveryReady();
    const email = composeMagicLinkEmail(this.mailConfig, input);

    try {
      await this.transport!.sendMail(
        toMailMessage(
          { from: this.mailConfig.from!, replyTo: this.mailConfig.replyTo },
          input.email,
          email,
        ),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Magic-link email sending failed: ${error.message}`
          : "Magic-link email sending failed.",
      );
    }
  }
}
