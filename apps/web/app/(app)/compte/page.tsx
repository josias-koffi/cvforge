import type { Metadata } from "next"
import Link from "next/link"

import {
  DeleteAccountCard,
  ExportDataCard,
} from "@/components/account/account-privacy-cards"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { legalPath } from "@/lib/config"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Mon compte" }

export default async function AccountPage() {
  const session = await requireSession()

  return (
    <>
      <PageHeader
        title="Mon compte"
        description={`Connecté avec ${session.email}. Vos données vous appartiennent : emportez-les ou effacez-les.`}
        actions={
          <Button variant="outline" asChild>
            <a href={legalPath("privacy")} target="_blank" rel="noreferrer">
              Politique de confidentialité
            </a>
          </Button>
        }
      />
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Agents connectés</CardTitle>
            <CardDescription>
              Laissez votre agent IA (Claude Code, avec Chrome) enrichir votre
              profil, générer vos CV et lettres et préparer vos candidatures.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/compte/agents">Gérer les agents</Link>
            </Button>
          </CardFooter>
        </Card>
        <ExportDataCard />
        <DeleteAccountCard email={session.email} />
      </div>
    </>
  )
}
