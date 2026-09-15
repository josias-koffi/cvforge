import type { Metadata } from "next"
import Link from "next/link"
import { MailCheckIcon } from "lucide-react"

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Vérifiez vos e-mails" }

export default async function CheckEmailPage(
  props: PageProps<"/login/check-email">
) {
  const { email } = await props.searchParams

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheckIcon className="mx-auto size-10 text-primary" />
          <CardTitle className="text-xl">Vérifiez votre boîte mail</CardTitle>
          <CardDescription>
            Un lien de connexion a été envoyé
            {typeof email === "string" ? (
              <>
                {" "}
                à <strong className="text-foreground">{email}</strong>
              </>
            ) : null}
            . Il est valable quelques minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Utiliser une autre adresse</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
