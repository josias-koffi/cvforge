import Link from "next/link"
import { ShieldAlertIcon } from "lucide-react"

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForbiddenPage() {
  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <ShieldAlertIcon className="mx-auto size-10 text-destructive" />
          <CardTitle className="text-xl">Accès refusé</CardTitle>
          <CardDescription>
            Cette page est réservée aux administrateurs.
          </CardDescription>
        </CardHeader>
        <div className="px-6">
          <Button asChild className="w-full">
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>
      </Card>
    </AuthLayout>
  )
}
