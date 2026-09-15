import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary motion-safe:animate-float">
            <CompassIcon className="size-6" strokeWidth={1.75} />
          </span>
          <CardTitle className="text-xl">Page introuvable</CardTitle>
          <CardDescription>
            Cette page n&apos;existe pas ou a été déplacée.
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
