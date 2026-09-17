export type AccountStatus = "active" | "suspended"

export type AdminUserRow = {
  balance: number
  consent: { acceptedAt: string; source: string; version: string } | null
  email: string
  lastActivityAt: string | null
  lastManualGrant: {
    adminEmail: string | null
    amount: number
    createdAt: string
    note: string | null
  } | null
  ledgerEntryCount: number
  role: "admin" | "user"
  /** Sessions issued before this instant are refused; null means none revoked. */
  sessionsValidFrom: string | null
  status: AccountStatus
}

export type AdminUsersPage = {
  filters: {
    balance: "all" | "empty" | "low" | "stocked"
    query: string
    role: "admin" | "user" | "all"
    status: AccountStatus | "all"
  }
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
  users: AdminUserRow[]
}

export const auditActionLabels = {
  account_deleted: "Compte supprime",
  account_reactivated: "Compte reactive",
  account_suspended: "Compte suspendu",
  credits_granted: "Credits attribues",
  role_demoted: "Retrograde en utilisateur",
  sessions_revoked: "Sessions revoquees",
} as const

export type AdminAuditAction = keyof typeof auditActionLabels

export type AdminAuditEntry = {
  id: string
  actorEmail: string
  action: AdminAuditAction
  targetEmail: string | null
  note: string | null
  metadata: { credits?: number; previousRole?: "admin" | "user" }
  createdAt: string
}

export type AdminAuditPage = {
  entries: AdminAuditEntry[]
  filters: { action: AdminAuditAction | null; targetEmail: string | null }
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export type AdminUserDetail = {
  account: {
    consent: { acceptedAt: string; source: string; version: string } | null
    email: string
    role: "admin" | "user"
    sessionsValidFrom: string | null
    status: AccountStatus
  }
  applications: Array<{
    companyName: string | null
    createdAt: string
    hasCv: boolean
    hasLetter: boolean
    id: string
    status: string
    title: string
  }>
  auditLog: AdminAuditEntry[]
  credits: {
    balance: number
    history: Array<{
      action: string
      amount: number
      balanceAfter: number
      createdAt: string
      id: string
      note: string | null
    }>
    isLowBalance: boolean
  }
  profileCount: number
}

export const applicationStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  interview_scheduled: "Entretien planifie",
  offer_received: "Offre recue",
  rejected: "Refusee",
  sent: "Envoyee",
}
