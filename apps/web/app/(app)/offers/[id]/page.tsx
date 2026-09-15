import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLinkIcon, PencilIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DocumentRow } from "@/components/offers/document-card"
import { StatusBadge } from "@/components/offers/status-badge"
import { StatusMenu } from "@/components/offers/status-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate, formatDateTime, statusLabels } from "@/lib/format"
import { loadOffer } from "@/lib/offers"

export async function generateMetadata(props: PageProps<"/offers/[id]">): Promise<Metadata> {
  const { application } = await loadOffer((await props.params).id)
  return { title: application.extracted.title }
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Non renseigné.</p>
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default async function OfferPage(props: PageProps<"/offers/[id]">) {
  const { id } = await props.params
  const { application: offer, offerText } = await loadOffer(id)
  const { extracted } = offer
  const facts = [
    ["Entreprise", extracted.companyName],
    ["Lieu", extracted.location],
    ["Contrat", extracted.contractType],
    ["Salaire", extracted.salaryRange],
    ["Langue", extracted.language === "en" ? "Anglais" : "Français"],
    ["Ajoutée le", formatDate(offer.createdAt)],
    ["Mise à jour", formatDateTime(offer.updatedAt)],
  ]

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {extracted.title}
            <StatusBadge status={offer.status} />
          </span>
        }
        description={[extracted.companyName, extracted.location].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusMenu offerId={offer.id} status={offer.status} />
            <Button asChild>
              <Link href={`/offers/${offer.id}/edit`}>
                <PencilIcon />
                Modifier
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Descriptif</CardTitle>
            <CardDescription>Synthèse extraite par l&apos;IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {extracted.summary || "Aucun résumé."}
            </p>
            <div className="grid gap-6 @3xl/main:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Missions</h3>
                <BulletList items={extracted.responsibilities} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Profil recherché</h3>
                <BulletList items={extracted.requirements} />
              </div>
            </div>
            <Accordion type="single" collapsible className="rounded-lg border px-4">
              <AccordionItem value="raw" className="border-b-0">
                <AccordionTrigger>Texte original de l&apos;annonce</AccordionTrigger>
                <AccordionContent>
                  <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-line text-muted-foreground">
                    {offerText}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Générés à partir de votre profil et de cette offre (3 crédits chacun).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DocumentRow
                kind="cv"
                offerId={offer.id}
                title="CV"
                description="CV ciblé sur les attentes de l'offre."
                generatedAt={offer.cvGeneratedAt}
              />
              <DocumentRow
                kind="letter"
                offerId={offer.id}
                title="Lettre de motivation"
                description="Lettre personnalisée pour l'entreprise."
                generatedAt={offer.letterGeneratedAt}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {facts.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right">{value || "—"}</dd>
                  </div>
                ))}
                <dt className="text-muted-foreground">Source</dt>
                <dd className="truncate text-right">
                  {offer.offerUrl ? (
                    <a
                      href={offer.offerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      {new URL(offer.offerUrl).hostname}
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  ) : (
                    "Texte collé"
                  )}
                </dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {[...offer.statusHistory].reverse().map((entry) => (
                  <li key={`${entry.status}-${entry.changedAt}`} className="flex justify-between gap-4">
                    <span>{statusLabels[entry.status]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
