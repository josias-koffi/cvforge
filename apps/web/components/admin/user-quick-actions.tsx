"use client"

import { useState } from "react"
import {
  CoinsIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminUserDetail, AdminUserRow } from "@/lib/admin"

type DialogKind = "credits" | "delete" | "demote" | "revoke" | "suspend"

/**
 * The detail page's inline actions. They reuse the table's dialogs, so a
 * suspension behaves identically wherever it is triggered from.
 */
export function UserQuickActions({
  detail,
  isSelf,
}: {
  detail: AdminUserDetail
  isSelf: boolean
}) {
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null)
  }
  // The dialogs take a table row; the detail page holds the same fields.
  const user: AdminUserRow = {
    balance: detail.credits.balance,
    consent: detail.account.consent,
    email: detail.account.email,
    lastActivityAt: detail.credits.history[0]?.createdAt ?? null,
    lastManualGrant: null,
    ledgerEntryCount: detail.credits.history.length,
    role: detail.account.role,
    sessionsValidFrom: detail.account.sessionsValidFrom,
    status: detail.account.status,
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <EllipsisVerticalIcon />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setDialog("credits")}>
            <CoinsIcon />
            Ajouter des crédits
          </DropdownMenuItem>
          {user.role === "admin" ? (
            <DropdownMenuItem disabled={isSelf} onSelect={() => setDialog("demote")}>
              <ShieldOffIcon />
              Rétrograder en utilisateur
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem disabled={isSelf} onSelect={() => setDialog("revoke")}>
            <LogOutIcon />
            Déconnecter partout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isSelf} onSelect={() => setDialog("suspend")}>
            <UserRoundXIcon />
            {user.status === "suspended" ? "Réactiver le compte" : "Suspendre le compte"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => setDialog("delete")}
          >
            <Trash2Icon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "credits" ? (
        <GrantCreditsDialog open user={user} onOpenChange={closeDialog} />
      ) : null}
      {dialog === "demote" ? (
        <DemoteUserDialog open user={user} onOpenChange={closeDialog} />
      ) : null}
      {dialog === "revoke" ? (
        <RevokeSessionsDialog open user={user} onOpenChange={closeDialog} />
      ) : null}
      {dialog === "suspend" ? (
        <SuspendUserDialog open user={user} onOpenChange={closeDialog} />
      ) : null}
      {dialog === "delete" ? (
        <DeleteUserDialog open user={user} onOpenChange={closeDialog} />
      ) : null}
    </>
  )
}
