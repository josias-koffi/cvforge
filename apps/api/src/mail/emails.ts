import { MARKET_SOURCE_LABEL } from "@cvforge/types";
import {
  button,
  fallbackLink,
  infoBox,
  keyValueTable,
  note,
  offerCard,
  paragraph,
  strong,
} from "./mail-blocks";
import { formatEuros, formatParisDateTime } from "./mail-brand";
import { renderEmail } from "./mail-layout";
import type { MailConfig } from "./mail.config";

/**
 * The content of every CVSpark e-mail. Pure functions: the mailers add the
 * sender and the transport, the preview script (`email:preview`) renders
 * them with made-up data.
 */
export type ComposedEmail = {
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

type Brand = Pick<MailConfig, "appUrl" | "landingUrl" | "replyTo" | "supportEmail">;

export type MagicLinkEmailInput = {
  expiresAt: string;
  magicLink: string;
  sessionDurationDays: number;
  /**
   * Set when the link reopens a free tool's result (US-133): the visitor
   * asked for a report, not for an account, so the e-mail says so.
   */
  purpose?: "sign-in" | "tool-result";
};

export function composeMagicLinkEmail(
  brand: Brand,
  input: MagicLinkEmailInput,
): ComposedEmail {
  const toolResult = input.purpose === "tool-result";
  const heading = toolResult ? "Votre résultat vous attend" : "Connectez-vous à CVSpark";
  const expiresAt = formatParisDateTime(input.expiresAt);

  return {
    subject: toolResult
      ? "Votre résultat CVSpark est prêt"
      : "Votre lien de connexion CVSpark",
    ...renderEmail(brand, {
      blocks: [
        paragraph("Bonjour,"),
        paragraph(
          toolResult
            ? "Votre résultat est enregistré. Ce lien vous connecte à CVSpark et l'ouvre directement, sans mot de passe."
            : "Voici votre lien de connexion. Un clic suffit, sans mot de passe.",
        ),
        button(toolResult ? "Voir mon résultat" : "Me connecter", input.magicLink),
        paragraph(
          "Ce lien est valable jusqu'au ",
          strong(expiresAt),
          ` et ne sert qu'une fois. Votre session restera ensuite ouverte ${input.sessionDurationDays} jours.`,
        ),
        fallbackLink(input.magicLink),
        note(
          "Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail : personne ne peut se connecter sans ce lien.",
        ),
      ],
      heading,
      preheader: `Lien valable jusqu'au ${expiresAt}.`,
      reason: "Vous recevez cet e-mail parce que votre adresse a été saisie sur CVSpark.",
      title: heading,
    }),
  };
}

export type JobDigestEmailInput = {
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
};

/**
 * The morning selection.
 *
 * Deliberately short: the offers are named, the reasons are the ones already
 * shown in the app, and the links go to CVSpark rather than to the adverts —
 * applying goes through the product, and the sources are credited there.
 *
 * The unsubscribe link is in the footer and in the `List-Unsubscribe` header:
 * it is the one thing somebody looking for it must find in two seconds.
 */
export function composeJobDigestEmail(
  brand: Brand,
  input: JobDigestEmailInput,
): ComposedEmail {
  const remaining = input.totalCount - input.offers.length;
  const offersLabel = plural(input.totalCount, "offre", "offres");

  return {
    headers: { "List-Unsubscribe": `<${input.preferencesUrl}>` },
    subject: `${input.totalCount} ${offersLabel} pour vous aujourd'hui`,
    ...renderEmail(brand, {
      blocks: [
        paragraph(
          "Bonjour, voici ",
          strong(`${input.totalCount} ${offersLabel}`),
          " du jour, choisies d'après votre recherche.",
        ),
        ...input.offers.map((offer) =>
          offerCard({
            ...offer,
            companyName: offer.companyName || "Entreprise non communiquée",
          }),
        ),
        ...(remaining > 0
          ? [note(`Et ${remaining} ${plural(remaining, "autre", "autres")} dans l'application.`)]
          : []),
        ...(input.marketNotes.length > 0
          ? [
              infoBox({
                footnote: MARKET_SOURCE_LABEL,
                lines: input.marketNotes,
                title: "Le marché de votre métier",
              }),
            ]
          : []),
        button("Voir mes offres du jour", input.digestUrl),
      ],
      heading: "Vos offres du jour",
      preferencesUrl: input.preferencesUrl,
      preheader: input.offers[0]
        ? `${input.offers[0].title}${input.offers[0].companyName ? ` chez ${input.offers[0].companyName}` : ""} et votre sélection du matin.`
        : "Votre sélection du matin.",
      reason: "Vous recevez cet e-mail parce que l'envoi quotidien des offres est activé sur votre recherche CVSpark.",
      title: "Vos offres du jour",
    }),
  };
}

export type ApplicationFollowUpEmailInput = {
  companyName: string;
  /** Absolute: a mailbox has no base URL to resolve a path against. */
  followUpUrl: string;
  jobTitle: string;
  delayDays: number;
  preferencesUrl: string;
};

export function composeApplicationFollowUpEmail(
  brand: Brand,
  input: ApplicationFollowUpEmailInput,
): ComposedEmail {
  return {
    subject: `Relancer ${input.companyName} ?`,
    ...renderEmail(brand, {
      blocks: [
        paragraph("Bonjour,"),
        paragraph(
          "Votre candidature ",
          strong(input.jobTitle),
          " chez ",
          strong(input.companyName),
          ` est envoyée depuis ${input.delayDays} ${plural(input.delayDays, "jour", "jours")}.`,
        ),
        paragraph(
          "Sans réponse, c'est le bon moment pour une relance courte et polie : elle montre votre intérêt et remet votre dossier en haut de la pile.",
        ),
        button("Ouvrir ma candidature", input.followUpUrl),
      ],
      heading: "Le bon moment pour relancer",
      preferencesUrl: input.preferencesUrl,
      preheader: `${input.jobTitle} chez ${input.companyName} : toujours sans nouvelles ?`,
      reason: "Vous recevez cet e-mail parce que les rappels de relance sont activés sur votre compte CVSpark.",
      title: "Le bon moment pour relancer",
    }),
  };
}

export type CreditPurchaseEmailInput = {
  amountCents: number;
  credits: number;
  offerName: string;
  preferencesUrl: string;
};

export function composeCreditPurchaseEmail(
  brand: Brand,
  input: CreditPurchaseEmailInput,
): ComposedEmail {
  const credits = `${input.credits} ${plural(input.credits, "crédit", "crédits")}`;
  const added = plural(input.credits, "ajouté", "ajoutés");

  return {
    subject: `Achat confirmé : ${credits} ${added}`,
    ...renderEmail(brand, {
      blocks: [
        paragraph("Bonjour,"),
        paragraph("Merci pour votre achat. Vos crédits sont déjà disponibles sur votre compte."),
        keyValueTable([
          ["Pack", input.offerName],
          ["Crédits ajoutés", credits],
          ["Montant payé", formatEuros(input.amountCents)],
        ]),
        button("Reprendre sur CVSpark", brand.appUrl),
        note("Vos crédits n'expirent jamais : utilisez-les à votre rythme."),
      ],
      heading: "Achat confirmé",
      preferencesUrl: input.preferencesUrl,
      preheader: `${credits} ${added} à votre solde.`,
      reason: "Vous recevez cet e-mail pour confirmer un achat effectué sur votre compte CVSpark.",
      title: "Achat confirmé",
    }),
  };
}

function plural(count: number, one: string, many: string) {
  return count > 1 ? many : one;
}
