import type { AdminAuditEntry } from "@cvforge/types";

export const ADMIN_AUDIT_STORE = Symbol("ADMIN_AUDIT_STORE");

export type AdminAuditDraft = Omit<AdminAuditEntry, "createdAt" | "id">;

export type AdminAuditQuery = {
  /** 1-based. */
  page?: string;
  pageSize?: string;
  maxPageSize: number;
  targetEmail?: string;
  action?: string;
};

export type AdminAuditPage = {
  entries: AdminAuditEntry[];
  filters: { action: string | null; targetEmail: string | null };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type AdminAuditStore = {
  record: (draft: AdminAuditDraft) => Promise<AdminAuditEntry>;
  list: (query: {
    action?: string;
    limit: number;
    offset: number;
    targetEmail?: string;
  }) => Promise<{ entries: AdminAuditEntry[]; totalItems: number }>;
  /** Keeps the action auditable while removing the deleted person's email. */
  scrubTarget: (targetEmail: string) => Promise<number>;
};
