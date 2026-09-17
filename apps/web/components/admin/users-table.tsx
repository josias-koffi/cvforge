"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinsIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  SearchIcon,
  ShieldOffIcon,
  Trash2Icon,
  UserRoundXIcon,
} from "lucide-react"

import { DemoteUserDialog, GrantCreditsDialog } from "@/components/admin/user-dialogs"
import {
  DeleteUserDialog,
  RevokeSessionsDialog,
  SuspendUserDialog,
} from "@/components/admin/user-danger-dialogs"
import { TableFrame } from "@/components/data-table/table-frame"
import { PagerButton } from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUserRow, AdminUsersPage } from "@/lib/admin"
import { formatDateTime } from "@/lib/format"

type DialogKind = "demote" | "credits" | "delete" | "suspend" | "revoke"

function UserActions({
  currentEmail,
  onOpen,
  user,
}: {
  currentEmail: string
  onOpen: (kind: DialogKind, user: AdminUserRow) => void
  user: AdminUserRow
}) {
  const isSelf = user.email === currentEmail

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <EllipsisVerticalIcon />
          <span className="sr-only">Actions pour {user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {user.role === "admin" ? (
          <DropdownMenuItem disabled={isSelf} onSelect={() => onOpen("demote", user)}>
            <ShieldOffIcon />
            Rétrograder en utilisateur
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => onOpen("credits", user)}>
          <CoinsIcon />
          Ajouter des crédits
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isSelf} onSelect={() => onOpen("revoke", user)}>
          <LogOutIcon />
          Déconnecter partout
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSelf} onSelect={() => onOpen("suspend", user)}>
          <UserRoundXIcon />
          {user.status === "suspended" ? "Réactiver le compte" : "Suspendre le compte"}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={isSelf}
          onSelect={() => onOpen("delete", user)}
        >
          <Trash2Icon />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UsersTable({
  currentEmail,
  data,
}: {
  currentEmail: string
  data: AdminUsersPage
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(data.filters.query)
  const [dialog, setDialog] = useState<{ kind: DialogKind; user: AdminUserRow } | null>(null)
  const { page, totalItems, totalPages } = data.pagination

  const navigate = (changes: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") params.delete(key)
      else params.set(key, String(value))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="relative w-full sm:max-w-xs"
          onSubmit={(event) => {
            event.preventDefault()
            navigate({ page: null, query })
          }}
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher un utilisateur"
            placeholder="Rechercher par e-mail…"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <Select
          value={data.filters.role}
          onValueChange={(role) => navigate({ page: null, role })}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer par rôle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="user">Utilisateurs</SelectItem>
            <SelectItem value="admin">Administrateurs</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={data.filters.status}
          onValueChange={(status) => navigate({ page: null, status })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filtrer par statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="suspended">Suspendus</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={data.filters.balance}
          onValueChange={(balance) => navigate({ balance, page: null })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filtrer par solde">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les soldes</SelectItem>
            <SelectItem value="empty">Sans crédit</SelectItem>
            <SelectItem value="low">Solde faible (1-19)</SelectItem>
            <SelectItem value="stocked">20 crédits ou plus</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {totalItems} utilisateur{totalItems > 1 ? "s" : ""}
        </span>
      </div>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>E-mail</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Crédits</TableHead>
            <TableHead className="text-right">Opérations</TableHead>
            <TableHead>Dernière activité</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Aucun utilisateur ne correspond.
              </TableCell>
            </TableRow>
          ) : (
            data.users.map((user) => (
              <TableRow key={user.email}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/users/${encodeURIComponent(user.email)}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {user.email}
                  </Link>
                  {user.email === currentEmail ? (
                    <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "suspended" ? "warning" : "outline"}>
                    {user.status === "suspended" ? "Suspendu" : "Actif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{user.balance}</TableCell>
                <TableCell className="text-right tabular-nums">{user.ledgerEntryCount}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(user.lastActivityAt)}
                </TableCell>
                <TableCell className="text-right">
                  <UserActions
                    user={user}
                    currentEmail={currentEmail}
                    onOpen={(kind, target) => setDialog({ kind, user: target })}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableFrame>
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="mr-2 font-medium">
            Page {page} sur {totalPages}
          </span>
          <PagerButton label="Page précédente" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>
            <ChevronLeftIcon />
          </PagerButton>
          <PagerButton label="Page suivante" disabled={page >= totalPages} onClick={() => navigate({ page: page + 1 })}>
            <ChevronRightIcon />
          </PagerButton>
        </div>
      ) : null}
      {dialog?.kind === "demote" ? (
        <DemoteUserDialog open user={dialog.user} onOpenChange={closeDialog} />
      ) : null}
      {dialog?.kind === "credits" ? (
        <GrantCreditsDialog open user={dialog.user} onOpenChange={closeDialog} />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteUserDialog open user={dialog.user} onOpenChange={closeDialog} />
      ) : null}
      {dialog?.kind === "suspend" ? (
        <SuspendUserDialog open user={dialog.user} onOpenChange={closeDialog} />
      ) : null}
      {dialog?.kind === "revoke" ? (
        <RevokeSessionsDialog open user={dialog.user} onOpenChange={closeDialog} />
      ) : null}
    </div>
  )
}
