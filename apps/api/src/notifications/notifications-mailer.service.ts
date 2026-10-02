import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  composeApplicationFollowUpEmail,
  composeCreditPurchaseEmail,
  composeJobAlertEmail,
  composeJobDigestEmail,
  type ComposedEmail,
  type JobAlertEmailInput,
  type JobDigestEmailInput,
} from "../mail/emails";
import { absoluteAppUrl } from "../mail/mail-brand";
import { MAIL_CONFIG, type MailConfig } from "../mail/mail.config";
import {
  MAIL_TRANSPORT,
  toMailMessage,
  type MailTransport,
} from "../mail/mail-transport";
import { SMTP_CONFIG, type SmtpConfig } from "../smtp/smtp.config";

type ApplicationFollowUpEmailInput = {
  companyName: string;
  delayDays: number;
  /** An app path (`/candidatures?…`) or an absolute URL. */
  followUpUrl: string;
  jobTitle: string;
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
    @Inject(MAIL_CONFIG) private readonly mailConfig: MailConfig,
    @Inject(MAIL_TRANSPORT)
    private readonly transport: MailTransport | null,
  ) {}

  getDeliveryStatus() {
    return {
      provider: this.smtpConfig.provider,
      ready:
        this.smtpConfig.enabled &&
        this.transport !== null &&
        this.mailConfig.from !== null,
    };
  }

  async sendApplicationFollowUpEmail(input: ApplicationFollowUpEmailInput) {
    await this.sendMail(
      input.to,
      composeApplicationFollowUpEmail(this.mailConfig, {
        companyName: input.companyName,
        delayDays: input.delayDays,
        followUpUrl: absoluteAppUrl(this.mailConfig.appUrl, input.followUpUrl),
        jobTitle: input.jobTitle,
        preferencesUrl: this.preferencesUrl(),
      }),
    );
  }

  async sendJobDigestEmail(input: JobDigestEmailInput & { to: string }) {
    await this.sendMail(input.to, composeJobDigestEmail(this.mailConfig, input));
  }

  /**
   * True once handed to the transport; false when delivery is not configured,
   * so the alert stays pending and the morning recap takes it over (US-166).
   * Throws when the transport refuses it.
   */
  async sendJobAlertEmail(input: JobAlertEmailInput & { to: string }): Promise<boolean> {
    if (!this.getDeliveryStatus().ready) return false;

    await this.sendMail(input.to, composeJobAlertEmail(this.mailConfig, input));

    return true;
  }

  async sendCreditPurchaseConfirmationEmail(
    input: CreditPurchaseConfirmationEmailInput,
  ) {
    await this.sendMail(
      input.to,
      composeCreditPurchaseEmail(this.mailConfig, {
        amountCents: input.amountCents,
        credits: input.credits,
        offerName: input.offerName,
        preferencesUrl: this.preferencesUrl(),
      }),
    );
  }

  private preferencesUrl() {
    return `${this.mailConfig.appUrl}/notifications`;
  }

  private async sendMail(to: string, email: ComposedEmail) {
    if (!this.smtpConfig.enabled || !this.transport || !this.mailConfig.from) {
      return;
    }

    try {
      await this.transport.sendMail(
        toMailMessage(
          { from: this.mailConfig.from, replyTo: this.mailConfig.replyTo },
          to,
          email,
        ),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Notification email sending failed: ${error.message}`
          : "Notification email sending failed.",
      );
    }
  }
}
