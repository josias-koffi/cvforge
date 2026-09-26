import { MAIL_COLORS as C, MAIL_FONT, escapeHtml } from "./mail-brand";

/**
 * One piece of an e-mail, written once for both parts of the message: the
 * HTML most clients show, and the plain text the others (and spam filters)
 * read. An empty `text` leaves the block out of the plain version.
 */
export type MailBlock = { html: string; text: string };

/** Plain text, or a run the reader's eye should catch. Always escaped. */
export type MailSegment = string | { strong: string };

export function strong(value: string): MailSegment {
  return { strong: value };
}

function segmentsHtml(segments: MailSegment[]) {
  return segments
    .map((segment) =>
      typeof segment === "string"
        ? escapeHtml(segment)
        : `<strong style="font-weight:600;">${escapeHtml(segment.strong)}</strong>`,
    )
    .join("");
}

function segmentsText(segments: MailSegment[]) {
  return segments
    .map((segment) => (typeof segment === "string" ? segment : segment.strong))
    .join("");
}

const BODY_STYLE = `margin:0 0 16px;font-family:${MAIL_FONT};font-size:16px;line-height:1.6;color:${C.text};`;
const SMALL_STYLE = `margin:0 0 16px;font-family:${MAIL_FONT};font-size:13px;line-height:1.5;color:${C.muted};`;

export function paragraph(...segments: MailSegment[]): MailBlock {
  return {
    html: `<p class="cs-text" style="${BODY_STYLE}">${segmentsHtml(segments)}</p>`,
    text: segmentsText(segments),
  };
}

/** Secondary information: security notes, footnotes, sources. */
export function note(...segments: MailSegment[]): MailBlock {
  return {
    html: `<p class="cs-muted" style="${SMALL_STYLE}">${segmentsHtml(segments)}</p>`,
    text: segmentsText(segments),
  };
}

/**
 * The one action of the e-mail. A padded link inside a table cell rather
 * than a styled `<a>` alone, so Outlook draws the whole button clickable.
 */
export function button(label: string, url: string): MailBlock {
  const href = escapeHtml(url);

  return {
    html:
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">` +
      `<tr><td align="center" bgcolor="${C.primary}" style="border-radius:10px;background:${C.primary};">` +
      `<a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${MAIL_FONT};font-size:16px;font-weight:600;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>` +
      `</td></tr></table>`,
    text: `${label} : ${url}`,
  };
}

/** The raw link under a button, for clients that break buttons. */
export function fallbackLink(url: string): MailBlock {
  const href = escapeHtml(url);

  return {
    html:
      `<p class="cs-muted" style="${SMALL_STYLE}word-break:break-all;">` +
      `Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br />` +
      `<a class="cs-brand-accent" href="${href}" style="color:${C.primary};">${href}</a></p>`,
    // The button's own text line already carries the URL.
    text: "",
  };
}

/** A tinted box grouping lines that belong together. */
export function infoBox(input: {
  title: string;
  lines: string[];
  footnote?: string;
}): MailBlock {
  const lines = input.lines
    .map(
      (line) =>
        `<p class="cs-text" style="margin:0 0 8px;font-family:${MAIL_FONT};font-size:14px;line-height:1.5;color:${C.text};">${escapeHtml(line)}</p>`,
    )
    .join("");
  const footnote = input.footnote
    ? `<p class="cs-muted" style="margin:8px 0 0;font-family:${MAIL_FONT};font-size:12px;line-height:1.4;color:${C.muted};">${escapeHtml(input.footnote)}</p>`
    : "";

  return {
    html:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">` +
      `<tr><td class="cs-tint" style="background:${C.tint};border-radius:10px;padding:16px 20px;">` +
      `<p class="cs-text" style="margin:0 0 8px;font-family:${MAIL_FONT};font-size:15px;font-weight:600;line-height:1.4;color:${C.text};">${escapeHtml(input.title)}</p>` +
      `${lines}${footnote}</td></tr></table>`,
    text: [
      `${input.title} :`,
      ...input.lines,
      ...(input.footnote ? [input.footnote] : []),
    ].join("\n"),
  };
}

/** A receipt-like summary: label on the left, value on the right. */
export function keyValueTable(rows: Array<[label: string, value: string]>): MailBlock {
  const cells = rows
    .map(
      ([label, value], index) =>
        `<tr>` +
        `<td class="cs-muted cs-divider" style="padding:12px 0;${index > 0 ? `border-top:1px solid ${C.border};` : ""}font-family:${MAIL_FONT};font-size:14px;color:${C.muted};">${escapeHtml(label)}</td>` +
        `<td class="cs-text cs-divider" align="right" style="padding:12px 0;${index > 0 ? `border-top:1px solid ${C.border};` : ""}font-family:${MAIL_FONT};font-size:14px;font-weight:600;color:${C.text};">${escapeHtml(value)}</td>` +
        `</tr>`,
    )
    .join("");

  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${cells}</table>`,
    text: rows.map(([label, value]) => `${label} : ${value}`).join("\n"),
  };
}

/** One offer of the morning selection. */
export function offerCard(offer: {
  title: string;
  companyName: string;
  locationLabel: string;
  score: number;
  reason: string;
}): MailBlock {
  const meta = [offer.companyName, offer.locationLabel].filter(Boolean).join(" · ");

  return {
    html:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">` +
      `<tr><td class="cs-divider" style="border:1px solid ${C.border};border-radius:10px;padding:16px 20px;">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
      `<td valign="top" class="cs-text" style="font-family:${MAIL_FONT};font-size:16px;font-weight:600;line-height:1.4;color:${C.text};">${escapeHtml(offer.title)}</td>` +
      `<td valign="top" align="right" style="padding-left:12px;white-space:nowrap;">` +
      `<span class="cs-tint cs-brand-accent" style="display:inline-block;padding:4px 10px;border-radius:9999px;background:${C.tint};font-family:${MAIL_FONT};font-size:13px;font-weight:600;color:${C.primary};">${offer.score}/100</span>` +
      `</td></tr></table>` +
      `<p class="cs-muted" style="margin:4px 0 0;font-family:${MAIL_FONT};font-size:14px;line-height:1.5;color:${C.muted};">${escapeHtml(meta)}</p>` +
      (offer.reason
        ? `<p class="cs-text" style="margin:8px 0 0;font-family:${MAIL_FONT};font-size:14px;line-height:1.5;font-style:italic;color:${C.text};">${escapeHtml(offer.reason)}</p>`
        : "") +
      `</td></tr></table>`,
    text:
      `• ${offer.title} — ${meta} — ${offer.score}/100` +
      (offer.reason ? `\n  ${offer.reason}` : ""),
  };
}

