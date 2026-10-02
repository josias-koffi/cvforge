import {
  JOB_ALERT_VERDICT_LABELS,
  type JobAlertAnalysis,
} from "@cvforge/types";
import { button, note, paragraph, strong, type MailBlock } from "./mail-blocks";
import {
  MAIL_COLORS as C,
  MAIL_FONT,
  escapeHtml,
  formatParisDateTime,
} from "./mail-brand";
import { renderEmail } from "./mail-layout";
import type { MailConfig } from "./mail.config";

type Brand = Pick<
  MailConfig,
  "appUrl" | "landingUrl" | "replyTo" | "supportEmail"
>;

/** One offer of an alert, as the e-mail names it (US-166). */
export type JobAlertOffer = {
  title: string;
  /** Empty when the source hides the employer. */
  companyName: string;
  locationLabel: string;
  /** "France Travail", "Site de l'entreprise"… cited on every offer (licence). */
  sourceLabel: string;
  /** At the source; when it gives none, the time we detected it. */
  publishedAt: string;
  /** Why it matches, from the candidate's own profile and search. */
  reasons: string[];
  /** Absolute: the application flow for this offer. */
  applyUrl: string;
  /** The paid analysis (US-168), shown under the offer, never in its place. */
  analysis?: JobAlertAnalysis | null;
  /** The candidate has the option, but this offer went without (no credit, cap, late). */
  analysisMissing?: boolean;
};

export type JobAlertEmailInput = {
  offers: JobAlertOffer[];
  /** The clock the "publiée il y a" is read against. */
  now: string;
  /** Absolute: every offer of the day in the app. */
  offersUrl: string;
  preferencesUrl: string;
};

/**
 * "Nouvelle offre pour vous" (E27, US-166): sent within minutes of a
 * publication, so the candidate is among the first to apply. Free: neither
 * the alert nor the link costs a credit.
 *
 * One offer gets one e-mail; a grouped send (hourly, quiet hours, past the
 * daily cap) names them all. Each offer keeps its source and its date, as
 * the France Travail licence asks, and links to the application flow.
 */
export function composeJobAlertEmail(brand: Brand, input: JobAlertEmailInput) {
  const [first] = input.offers;
  const count = input.offers.length;
  const single = count === 1 && first !== undefined;
  const title = single
    ? "Nouvelle offre pour vous"
    : `${count} nouvelles offres pour vous`;

  return {
    headers: { "List-Unsubscribe": `<${input.preferencesUrl}>` },
    subject: single ? `Nouvelle offre pour vous : ${first.title}` : title,
    ...renderEmail(brand, {
      blocks: [
        single
          ? paragraph(
              "Une offre qui correspond à votre recherche vient de paraître. ",
              strong("Postuler tôt, c'est passer avant les autres."),
            )
          : paragraph(`Voici ${count} offres parues depuis le dernier envoi.`),
        ...input.offers.flatMap((offer) => [
          alertCard(offer, input.now),
          ...analysisBlocks(offer),
          button("Postuler avec Jobspark", offer.applyUrl),
        ]),
        note(
          "Retrouvez toutes vos offres du jour dans l'application : ",
          input.offersUrl,
        ),
      ],
      heading: title,
      preferencesUrl: input.preferencesUrl,
      preheader: first
        ? `${first.title}${first.companyName ? ` chez ${first.companyName}` : ""}, ${publishedAgo(first.publishedAt, input.now)}.`
        : title,
      reason:
        "Vous recevez cet e-mail parce que les alertes de nouvelles offres sont activées sur votre compte Jobspark. Elles sont gratuites.",
      title,
    }),
  };
}

/** One offer, with what makes it worth a look now. */
function alertCard(offer: JobAlertOffer, now: string): MailBlock {
  const meta = [
    offer.companyName || "Entreprise non communiquée",
    offer.locationLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const when = `Publiée ${publishedAgo(offer.publishedAt, now)} · Source : ${offer.sourceLabel}`;
  const why =
    offer.reasons.length > 0
      ? `Pourquoi elle vous correspond : ${offer.reasons.join(", ")}.`
      : "";

  return {
    html:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">` +
      `<tr><td class="cs-divider" style="border:1px solid ${C.border};border-radius:10px;padding:16px 20px;">` +
      `<p class="cs-text" style="margin:0;font-family:${MAIL_FONT};font-size:16px;font-weight:600;line-height:1.4;color:${C.text};">${escapeHtml(offer.title)}</p>` +
      `<p class="cs-muted" style="margin:4px 0 0;font-family:${MAIL_FONT};font-size:14px;line-height:1.5;color:${C.muted};">${escapeHtml(meta)}</p>` +
      `<p class="cs-brand-accent" style="margin:4px 0 0;font-family:${MAIL_FONT};font-size:13px;font-weight:600;line-height:1.5;color:${C.primary};">${escapeHtml(when)}</p>` +
      (why
        ? `<p class="cs-text" style="margin:8px 0 0;font-family:${MAIL_FONT};font-size:14px;line-height:1.5;color:${C.text};">${escapeHtml(why)}</p>`
        : "") +
      `</td></tr></table>`,
    text: [`• ${offer.title} — ${meta}`, `  ${when}`, why ? `  ${why}` : ""]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * The analysis under the offer, in its own tinted box: the offer above stays
 * exactly as published (France Travail licence, "ne pas altérer le Contenu").
 */
function analysisBlocks(offer: JobAlertOffer): MailBlock[] {
  if (offer.analysisMissing)
    return [note("Analyse IA non incluse pour cette offre.")];
  if (!offer.analysis) return [];

  const { analysis } = offer;
  const sections: Array<[string, string[]]> = [
    ["Pourquoi elle vaut le coup", analysis.reasons],
    ["Points de vigilance", analysis.watchouts],
    ["À mettre en avant", analysis.highlights],
  ];
  const filled = sections.filter(([, points]) => points.length > 0);
  const heading = `Analyse IA · ${JOB_ALERT_VERDICT_LABELS[analysis.verdict]}`;
  const p = (style: string, content: string) =>
    `<p class="cs-text" style="margin:0;font-family:${MAIL_FONT};line-height:1.5;color:${C.text};${style}">${content}</p>`;

  return [
    {
      html:
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">` +
        `<tr><td class="cs-tint" style="background:${C.tint};border-radius:10px;padding:12px 20px;">` +
        p("font-size:14px;font-weight:600;", escapeHtml(heading)) +
        filled
          .map(
            ([title, points]) =>
              p(
                "margin-top:8px;font-size:13px;font-weight:600;",
                escapeHtml(title),
              ) +
              points
                .map((point) => p("font-size:13px;", `• ${escapeHtml(point)}`))
                .join(""),
          )
          .join("") +
        `</td></tr></table>`,
      text: [
        `  ${heading}`,
        ...filled.flatMap(([title, points]) => [
          `  ${title} :`,
          ...points.map((point) => `   - ${point}`),
        ]),
      ].join("\n"),
    },
  ];
}

/** « il y a 4 min », « il y a 2 h », or the date past a day. */
export function publishedAgo(publishedAt: string, now: string): string {
  const minutes = Math.max(
    0,
    Math.round((Date.parse(now) - Date.parse(publishedAt)) / 60_000),
  );

  if (!Number.isFinite(minutes)) return "récemment";
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.floor(minutes / 60)} h`;

  return `le ${formatParisDateTime(publishedAt)}`;
}
