import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TableFrame } from "@/components/data-table/table-frame"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  applicationStatusLabels,
  auditActionLabels,
  type AdminUserDetail,
} from "@/lib/admin"
import { formatDateTime } from "@/lib/format"

function AccountCard({ detail }: { detail: AdminUserDetail }) {
  const { account, profileCount } = detail

  return (
    <Card>
      <CardHeader>
        <CardDescription>Compte</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <Badge variant={account.role === "admin" ? "default" : "outline"}>
            {account.role === "admin" ? "Administrateur" : "Utilisateur"}
          </Badge>
          <Badge variant={account.status === "suspended" ? "warning" : "outline"}>
            {account.status === "suspended" ? "Suspendu" : "Actif"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Profils enregistrés</dt>
            <dd className="tabular-nums">{profileCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Consentement</dt>
            <dd>
              {account.consent
                ? `${formatDateTime(account.consent.acceptedAt)} (${account.consent.version})`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Sessions révoquées le</dt>
            <dd>
              {account.sessionsValidFrom
                ? formatDateTime(account.sessionsValidFrom)
                : "Jamais"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function CreditsCard({ credits }: { credits: AdminUserDetail["credits"] }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Crédits</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
          {credits.balance}
          {credits.isLowBalance ? <Badge variant="warning">Solde faible</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1 text-sm">
          {credits.history.slice(0, 5).map((entry) => (
            <div key={entry.id} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </dt>
              <dd className="tabular-nums">
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
              </dd>
            </div>
          ))}
          {credits.history.length === 0 ? (
            <p className="text-muted-foreground">Aucune opération.</p>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  )
}

export function UserDetailCards({ detail }: { detail: AdminUserDetail }) {
  return (
    <>
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <AccountCard detail={detail} />
        <CreditsCard credits={detail.credits} />
      </div>
      <section className="flex flex-col gap-3 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Candidatures</h2>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>Poste</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Créée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  Aucune candidature.
                </TableCell>
              </TableRow>
            ) : (
              detail.applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.title}</TableCell>
                  <TableCell>{application.companyName ?? "—"}</TableCell>
                  <TableCell>
                    {applicationStatusLabels[application.status] ?? application.status}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[application.hasCv ? "CV" : null, application.hasLetter ? "LM" : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(application.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableFrame>
      </section>
      <section className="flex flex-col gap-3 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Actions administratives</h2>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Par</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.auditLog.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  Aucune action enregistrée sur ce compte.
                </TableCell>
              </TableRow>
            ) : (
              detail.auditLog.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>{auditActionLabels[entry.action] ?? entry.action}</TableCell>
                  <TableCell>{entry.actorEmail}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableFrame>
      </section>
    </>
  )
}
