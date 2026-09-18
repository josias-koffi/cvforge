import type { AccountStatus } from "@cvforge/types";
import type { AuthConsentRecord, AuthRole } from "../auth/auth.types";

export const ADMIN_USERS_STORE = Symbol("ADMIN_USERS_STORE");

export type DirectoryFilters = {
  balance?: "empty" | "low" | "stocked";
  /** Already trimmed and lowercased; matched as a substring of the email. */
  query?: string;
  role?: AuthRole;
  status?: AccountStatus;
};

export type AdminUserRow = {
  balance: number;
  consent: AuthConsentRecord | null;
  email: string;
  lastActivityAt: string;
  lastManualGrant: {
    adminEmail: string | null;
    amount: number;
    createdAt: string;
    note: string | null;
  } | null;
  ledgerEntryCount: number;
  role: AuthRole;
  sessionsValidFrom: string | null;
  status: AccountStatus;
};

export type AdminUsersStore = {
  listDirectory: (input: {
    filters: DirectoryFilters;
    limit: number;
    offset: number;
  }) => Promise<{ rows: AdminUserRow[]; totalItems: number }>;
};

export type AdminUsersPage = {
  filters: {
    balance: string;
    query: string;
    role: string;
    status: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  users: AdminUserRow[];
};
