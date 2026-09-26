import nodemailer from "nodemailer";
import type { SmtpConfig } from "../smtp/smtp.config";

export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");

export type MailMessage = {
  from: string;
  headers?: Record<string, string>;
  html: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
};

export type MailTransport = {
  sendMail: (message: MailMessage) => Promise<unknown>;
};

/** One SMTP connection pool for every mailer; null while SMTP is off. */
export function createMailTransport(smtpConfig: SmtpConfig): MailTransport | null {
  if (!smtpConfig.enabled) {
    return null;
  }

  return nodemailer.createTransport({
    auth: {
      pass: smtpConfig.password ?? undefined,
      user: smtpConfig.user ?? undefined,
    },
    host: smtpConfig.server ?? undefined,
    port: smtpConfig.port ?? undefined,
    secure: smtpConfig.port === 465,
  });
}

/** What every mailer sends: the composed e-mail, from Jobspark, replies to support. */
export function toMailMessage(
  sender: { from: string; replyTo: string | null },
  to: string,
  email: { subject: string; html: string; text: string; headers?: Record<string, string> },
): MailMessage {
  return {
    from: sender.from,
    ...(email.headers ? { headers: email.headers } : {}),
    html: email.html,
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
    subject: email.subject,
    text: email.text,
    to,
  };
}
