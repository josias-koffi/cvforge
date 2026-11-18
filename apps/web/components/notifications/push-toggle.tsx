"use client"

import { BellOffIcon, SmartphoneIcon } from "lucide-react"

import { usePush } from "@/components/notifications/use-push"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { needsHomeScreenInstall } from "@/lib/push"

/**
 * "Sur cet appareil": push is per browser, so this switch only speaks for
 * the one in use. Hidden when the server has no VAPID keys.
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const push = usePush(publicKey)

  if (!publicKey || push.permission === null) return null

  if (push.permission === "unsupported") {
    return (
      <Hint icon={<SmartphoneIcon />}>
        {needsHomeScreenInstall()
          ? "Sur iPhone et iPad, ajoutez Jobspark à l'écran d'accueil (Partager → Sur l'écran d'accueil) pour recevoir les notifications."
          : "Ce navigateur ne reçoit pas les notifications. Vos alertes restent visibles ici."}
      </Hint>
    )
  }

  if (push.permission === "denied") {
    return (
      <Hint icon={<BellOffIcon />}>
        Les notifications sont bloquées pour Jobspark. Autorisez-les dans les
        réglages du site (icône à gauche de l&apos;adresse), puis rechargez la
        page.
      </Hint>
    )
  }

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="push-device">Sur cet appareil</FieldLabel>
        <FieldDescription>
          Une notification dès qu&apos;une offre vous correspond, même onglet
          fermé. 2 par jour au plus, les suivantes vous attendent ici.
        </FieldDescription>
      </FieldContent>
      <Switch
        id="push-device"
        checked={push.subscribed}
        disabled={push.busy}
        onCheckedChange={(checked) =>
          void (checked ? push.enable() : push.disable())
        }
      />
    </Field>
  )
}

function Hint({
  children,
  icon,
}: {
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <p className="flex gap-3 text-sm text-muted-foreground [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <span>{children}</span>
    </p>
  )
}
