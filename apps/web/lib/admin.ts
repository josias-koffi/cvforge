export type AdminUserRow = {
  balance: number
  email: string
  lastActivityAt: string | null
  ledgerEntryCount: number
  role: "admin" | "user"
}

export type AdminUsersPage = {
  filters: { query: string; role: "admin" | "user" | "all" }
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
  users: AdminUserRow[]
}
