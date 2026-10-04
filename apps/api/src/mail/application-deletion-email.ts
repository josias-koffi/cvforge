import { button, keyValueTable, note, paragraph, strong } from "./mail-blocks";
import { renderEmail } from "./mail-layout";
import type { MailConfig } from "./mail.config";

type Brand = Pick<
  MailConfig,
  "appUrl" | "landingUrl" | "replyTo" | "supportEmail"
>;

/** One application about to go, as the warning names it (US-170). */
export type ExpiringApplicationLine = {
  title: string;
  /** Empty when the offer named none. */
  companyName: string;
  /** When it will be deleted. */
  deletesAt: string;
};

export type ApplicationDeletionWarningEmailInput = {
  applications: ExpiringApplicationLine[];
  /** The applications page, where each one can be kept or downloaded. */
  applicationsUrl: string;
  preferencesUrl: string;
};

/**
 * Fifteen days before an application untouched for a year is deleted. The
 * e-mail can be turned off; the deletion cannot, so the same list waits in
 * the app.
 */
export function composeApplicationDeletionWarningEmail(
  brand: Brand,
  input: ApplicationDeletionWarningEmailInput,
): ComposedDeletionEmail {
  const count = input.applications.length;
  const several = count > 1;
  const subject = several
    ? `${count} candidatures inactives seront supprimées`
    : "Une candidature inactive sera supprimée";

  return {
    subject,
    ...renderEmail(brand, {
      blocks: [
        paragraph("Bonjour,"),
        paragraph(
          several
            ? "Ces candidatures n'ont pas bougé "
            : "Cette candidature n'a pas bougé ",
          strong("depuis un an"),
          several
            ? ". Nous les supprimerons, avec leurs CV, lettres et entretiens, aux dates ci-dessous."
            : ". Nous la supprimerons, avec ses CV, lettres et entretiens, à la date ci-dessous.",
        ),
        keyValueTable(
          input.applications.map((application) => [
            application.companyName
              ? `${application.title} — ${application.companyName}`
              : application.title,
            formatParisDate(application.deletesAt),
          ]),
        ),
        paragraph(
          several ? "Pour en garder une, " : "Pour la garder, ",
          "ouvrez vos candidatures et cliquez sur « Garder » : toute modification repousse la suppression d'un an. Vous pouvez aussi télécharger vos documents avant.",
        ),
        button("Voir mes candidatures", input.applicationsUrl),
        note(
          "Nous ne gardons pas indéfiniment des données qui ne vous servent plus : c'est la durée annoncée dans notre politique de confidentialité.",
        ),
      ],
      heading: several
        ? "Des candidatures vont être supprimées"
        : "Une candidature va être supprimée",
      preferencesUrl: input.preferencesUrl,
      preheader: several
        ? "Sans action de votre part, elles seront supprimées dans 15 jours."
        : "Sans action de votre part, elle sera supprimée dans 15 jours.",
      reason:
        "Vous recevez cet e-mail parce que les rappels avant suppression sont activés sur votre compte Jobspark.",
      title: subject,
    }),
  };
}

type ComposedDeletionEmail = { subject: string; html: string; text: string };

function formatParisDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
