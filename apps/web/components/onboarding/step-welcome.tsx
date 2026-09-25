import { BellIcon, SearchIcon, UserRoundIcon } from "lucide-react"

import { CvDropzone } from "@/components/profile/cv-dropzone"
import type { BaseProfile } from "@/lib/profile-model"

const PHASES = [
  {
    icon: UserRoundIcon,
    text: "Votre identité et votre parcours, la base de chaque CV.",
    title: "Votre profil",
  },
  {
    icon: SearchIcon,
    text: "Les postes, les lieux et les métiers que vous visez.",
    title: "Votre recherche",
  },
  {
    icon: BellIcon,
    text: "Une sélection d'offres qui vous correspondent, chaque matin.",
    title: "Vos offres du jour",
  },
] as const

/**
 * The first screen: what the next five minutes are for, then the shortcut —
 * a CV read by the AI fills most of the profile before the candidate types.
 */
export function StepWelcome({
  onImported,
}: {
  onImported: (update: (profile: BaseProfile) => BaseProfile) => void
}) {
  return (
    <>
      <ol className="grid gap-3 sm:grid-cols-3">
        {PHASES.map(({ icon: Icon, text, title }, index) => (
          <li
            key={title}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-surface"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <p className="text-sm font-medium">
              {index + 1}. {title}
            </p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="import-cv" className="flex flex-col gap-3">
        <div>
          <h2 id="import-cv" className="font-medium">
            Le plus rapide : importez votre CV
          </h2>
          <p className="text-sm text-muted-foreground">
            L&apos;IA lit votre CV et remplit votre profil. Vous vérifiez chaque
            information aux étapes suivantes, rien n&apos;est enregistré sans
            vous. Pas de CV ? Continuez, tout se remplit aussi à la main.
          </p>
        </div>
        <CvDropzone compact={false} onImported={onImported} />
      </section>
    </>
  )
}
