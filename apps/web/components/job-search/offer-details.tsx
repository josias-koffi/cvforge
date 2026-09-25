import { ExternalLinkIcon, MailIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { sourceName } from "@/lib/job-labels"
import type { OfferDetails, OfferRequirement } from "@/lib/job-search"

/**
 * What an advert says beyond its text, section by section, as the detail
 * panel shows it. Each section is left out when the source says nothing of
 * it: most offers fill a few, and an empty heading reads as a bug.
 *
 * Everything is rendered as text — it is a third party's payload.
 */

/** "Source : France Travail · via Meteojob", always shown. */
export function OfferSource({ source, via }: { source: string; via?: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Source : {sourceName(source)}
      {via ? ` · via ${via}` : null}
    </p>
  )
}

export function CompanyWebsiteLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
    >
      Site de l&apos;entreprise
      <ExternalLinkIcon className="size-3" aria-hidden />
    </a>
  )
}

/** The words of the "apply there" button, naming where it leads. */
export function applyLabel(details: OfferDetails): string {
  switch (details.apply?.target) {
    case "employer":
      return "Postuler sur le site de l'employeur"
    case "partner":
      return `Postuler sur ${details.apply.name || bareHost(details.apply.host)}`
    default:
      return `Postuler sur ${sourceName(details.source)}`
  }
}

export function OfferBenefits({ details }: { details: OfferDetails }) {
  const benefits = details.salary?.benefits ?? []
  const comment = details.salary?.comment ?? ""
  if (benefits.length === 0 && !comment) return null

  return (
    <Section title="Rémunération et avantages">
      {comment ? <p className="text-sm">{comment}</p> : null}
      {benefits.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {benefits.map((benefit) => (
            <li key={benefit}>
              <Badge variant="secondary">{benefit}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}

/** Experience, training, languages, licences and qualities asked for. */
export function OfferProfile({ details }: { details: OfferDetails }) {
  const { education, experience, languages, licences, softSkills } = details
  const empty =
    !experience &&
    education.length +
      languages.length +
      licences.length +
      softSkills.length ===
      0
  if (empty) return null

  return (
    <Section title="Profil recherché">
      <dl className="grid gap-4 text-sm @lg:grid-cols-2">
        {experience ? (
          <ProfileItem label="Expérience">
            <span>
              {experience.label}{" "}
              <RequirementBadge required={experience.required} />
            </span>
            {experience.comment ? (
              <span className="text-muted-foreground">
                {experience.comment}
              </span>
            ) : null}
          </ProfileItem>
        ) : null}
        <Requirements label="Formation" entries={education} />
        <Requirements label="Langues" entries={languages} />
        <Requirements label="Permis" entries={licences} />
      </dl>
      {softSkills.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs text-muted-foreground">Savoir-être</h4>
          <ul className="grid gap-3 @lg:grid-cols-2">
            {softSkills.map((skill) => (
              <li key={skill.label} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{skill.label}</p>
                {skill.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  )
}

/** Parts of the advert a source keeps apart from its description. */
export function OfferSections({ details }: { details: OfferDetails }) {
  return details.sections.map((section) => (
    <section key={section.title} className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">{section.title}</h4>
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">
        {section.text}
      </p>
    </section>
  ))
}

export function OfferCompany({ details }: { details: OfferDetails }) {
  const { companyBadges, companyDescription } = details
  if (!companyDescription && companyBadges.length === 0) return null

  return (
    <Section title="L'entreprise">
      {companyDescription ? (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">
          {companyDescription}
        </p>
      ) : null}
      {companyBadges.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {companyBadges.map((badge) => (
            <li key={badge}>
              <Badge variant="outline">{badge}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}

export function OfferContact({ details }: { details: OfferDetails }) {
  const { contact } = details
  if (!contact) return null

  return (
    <Section title="Contact">
      <address className="flex flex-col gap-0.5 text-sm not-italic">
        {contact.name ? (
          <span className="font-medium">{contact.name}</span>
        ) : null}
        {contact.lines.map((line) => (
          <span key={line} className="text-muted-foreground">
            {line}
          </span>
        ))}
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <MailIcon className="size-3.5" aria-hidden />
            {contact.email}
          </a>
        ) : null}
      </address>
    </Section>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Requirements({
  label,
  entries,
}: {
  label: string
  entries: OfferRequirement[]
}) {
  if (entries.length === 0) return null

  return (
    <ProfileItem label={label}>
      {entries.map((entry) => (
        <span key={entry.label}>
          {entry.label} <RequirementBadge required={entry.required} />
        </span>
      ))}
    </ProfileItem>
  )
}

function ProfileItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1">{children}</dd>
    </div>
  )
}

function RequirementBadge({ required }: { required: boolean }) {
  return (
    <Badge
      variant={required ? "default" : "outline"}
      className="ml-1 align-middle"
    >
      {required ? "Exigé" : "Souhaité"}
    </Badge>
  )
}

function bareHost(host: string): string {
  return host.replace(/^www\./, "")
}
