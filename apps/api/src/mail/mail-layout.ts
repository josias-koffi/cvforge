import type { MailBlock } from "./mail-blocks";
import {
  MAIL_COLORS as C,
  MAIL_FONT,
  MAIL_TAGLINE,
  escapeHtml,
  mailLegalUrls,
  mailLogoUrl,
} from "./mail-brand";
import type { MailConfig } from "./mail.config";

export type RenderedEmail = { html: string; text: string };

export type EmailContent = {
  /** Browser tab and `<title>`: usually the subject. */
  title: string;
  /** The grey line next to the subject in the inbox. */
  preheader: string;
  heading: string;
  blocks: MailBlock[];
  /** Why this person gets this e-mail, in one sentence. */
  reason: string;
  /** Where to turn it off; absent for e-mails that cannot be (sign-in). */
  preferencesUrl?: string;
};

type Brand = Pick<MailConfig, "landingUrl" | "replyTo" | "supportEmail">;

/**
 * The shared frame of every Jobspark e-mail: logo and wordmark, a white card
 * holding the message, then the footer — why you get it, how to stop it,
 * who to write to, the legal pages.
 *
 * Tables and inline styles only, 600 px wide: the markup Outlook and Gmail
 * both draw the same way. The `<style>` block is progressive: phone widths
 * and dark mode where the client supports it (Apple Mail, iOS), ignored
 * elsewhere without harm.
 */
export function renderEmail(brand: Brand, content: EmailContent): RenderedEmail {
  return {
    html: renderHtml(brand, content),
    text: renderText(brand, content),
  };
}

function renderHtml(brand: Brand, content: EmailContent) {
  const legal = mailLegalUrls(brand.landingUrl);
  const landing = escapeHtml(brand.landingUrl);
  const support = escapeHtml(brand.supportEmail);
  const link = `color:${C.muted};text-decoration:underline;`;
  const footerLine = `margin:0 0 8px;font-family:${MAIL_FONT};font-size:12px;line-height:1.5;color:${C.muted};`;

  return [
    `<!doctype html>`,
    `<html lang="fr"><head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<meta name="color-scheme" content="light dark" />`,
    `<meta name="supported-color-schemes" content="light dark" />`,
    `<title>${escapeHtml(content.title)}</title>`,
    `<style>`,
    `body{margin:0;padding:0;-webkit-text-size-adjust:100%;}`,
    `@media (max-width:620px){.cs-container{width:100%!important;}.cs-card{padding:28px 20px!important;}}`,
    `@media (prefers-color-scheme:dark){`,
    `.cs-body{background:${C.backgroundDark}!important;}`,
    `.cs-card{background:${C.cardDark}!important;border-color:${C.borderDark}!important;}`,
    `.cs-text{color:${C.textDark}!important;}`,
    `.cs-muted{color:${C.mutedDark}!important;}`,
    `.cs-tint{background:${C.tintDark}!important;}`,
    `.cs-brand-accent{color:${C.primaryDark}!important;}`,
    `.cs-divider{border-color:${C.borderDark}!important;}`,
    `}`,
    `</style>`,
    `</head>`,
    `<body class="cs-body" style="margin:0;padding:0;background:${C.background};">`,
    // Preheader, padded so the inbox preview does not run into the body.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`,
    `<table role="presentation" class="cs-body" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.background}" style="background:${C.background};">`,
    `<tr><td align="center" style="padding:32px 16px;">`,
    `<table role="presentation" class="cs-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">`,
    // Header: the mark as an image, the wordmark as text so it survives
    // blocked images.
    `<tr><td style="padding:0 4px 20px;">`,
    `<a href="${landing}" target="_blank" style="text-decoration:none;">`,
    `<img src="${escapeHtml(mailLogoUrl(brand.landingUrl))}" width="32" height="32" alt="Jobspark" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;" />`,
    `<span class="cs-text" style="display:inline-block;vertical-align:middle;padding-left:10px;font-family:${MAIL_FONT};font-size:20px;font-weight:600;letter-spacing:-0.01em;color:${C.text};">CV<span class="cs-brand-accent" style="color:${C.primary};">Spark</span></span>`,
    `</a></td></tr>`,
    // Card.
    `<tr><td class="cs-card" style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:40px;">`,
    `<h1 class="cs-text" style="margin:0 0 20px;font-family:${MAIL_FONT};font-size:24px;font-weight:600;line-height:1.3;color:${C.text};">${escapeHtml(content.heading)}</h1>`,
    ...content.blocks.map((block) => block.html),
    `<p class="cs-text" style="margin:8px 0 0;font-family:${MAIL_FONT};font-size:16px;line-height:1.6;color:${C.text};">L'équipe Jobspark</p>`,
    `</td></tr>`,
    // Footer.
    `<tr><td class="cs-muted" style="padding:24px 8px 0;">`,
    `<p class="cs-text" style="margin:0 0 12px;font-family:${MAIL_FONT};font-size:13px;font-weight:500;line-height:1.5;color:${C.text};"><span style="color:${C.spark};">●</span>&nbsp;${escapeHtml(MAIL_TAGLINE)}</p>`,
    `<p class="cs-muted" style="${footerLine}">${escapeHtml(content.reason)}</p>`,
    content.preferencesUrl
      ? `<p class="cs-muted" style="${footerLine}">Vous ne voulez plus de ces e-mails ? <a href="${escapeHtml(content.preferencesUrl)}" style="${link}">Gérez vos préférences ou désabonnez-vous</a>.</p>`
      : "",
    `<p class="cs-muted" style="${footerLine}">Une question ? ${brand.replyTo ? "Répondez à cet e-mail ou écrivez à" : "Écrivez-nous à"} <a href="mailto:${support}" style="${link}">${support}</a>.</p>`,
    `<p class="cs-muted" style="${footerLine}">`,
    `<a href="${landing}" style="${link}">Jobspark</a> · `,
    `<a href="${escapeHtml(legal.terms)}" style="${link}">Conditions d'utilisation</a> · `,
    `<a href="${escapeHtml(legal.privacy)}" style="${link}">Confidentialité</a>`,
    `</p>`,
    `<p class="cs-muted" style="${footerLine}">© ${new Date().getFullYear()} Jobspark</p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("");
}

function renderText(brand: Brand, content: EmailContent) {
  const legal = mailLegalUrls(brand.landingUrl);

  return [
    "Jobspark",
    "",
    content.heading,
    "",
    ...content.blocks
      .map((block) => block.text)
      .filter((text) => text.length > 0)
      .flatMap((text) => [text, ""]),
    "L'équipe Jobspark",
    "",
    "—",
    MAIL_TAGLINE,
    content.reason,
    ...(content.preferencesUrl
      ? [`Ne plus recevoir ces e-mails : ${content.preferencesUrl}`]
      : []),
    `Une question ? ${brand.supportEmail}`,
    `Conditions d'utilisation : ${legal.terms}`,
    `Confidentialité : ${legal.privacy}`,
  ].join("\n");
}
