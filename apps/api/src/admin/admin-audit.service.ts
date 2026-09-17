import { Injectable } from "@nestjs/common";
import {
  ADMIN_AUDIT_ACCOUNT_DELETED,
  ADMIN_AUDIT_ACCOUNT_REACTIVATED,
  ADMIN_AUDIT_ACCOUNT_SUSPENDED,
  ADMIN_AUDIT_CREDITS_GRANTED,
  ADMIN_AUDIT_ROLE_DEMOTED,
  ADMIN_AUDIT_SESSIONS_REVOKED,
  adminAuditActions,
  type AdminAuditAction,
} from "@cvforge/types";
import type {
  AdminAuditPage,
  AdminAuditQuery,
  AdminAuditStore,
} from "./admin-audit.types";

const DEFAULT_PAGE_SIZE = 20;

function parsePositiveInt(raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeEmail(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAction(value: string | undefined) {
  return adminAuditActions.includes(value as AdminAuditAction)
    ? (value as AdminAuditAction)
    : undefined;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly store: AdminAuditStore) {}

  async list(query: AdminAuditQuery): Promise<AdminAuditPage> {
    const pageSize = Math.min(
      parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE),
      query.maxPageSize,
    );
    const page = parsePositiveInt(query.page, 1);
    const action = normalizeAction(query.action);
    const targetEmail = normalizeEmail(query.targetEmail);
    const { entries, totalItems } = await this.store.list({
      action,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      targetEmail,
    });

    return {
      entries,
      filters: { action: action ?? null, targetEmail: targetEmail ?? null },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  recordSuspension(input: { actorEmail: string; note?: string; targetEmail: string }) {
    return this.record(ADMIN_AUDIT_ACCOUNT_SUSPENDED, input);
  }

  recordReactivation(input: { actorEmail: string; note?: string; targetEmail: string }) {
    return this.record(ADMIN_AUDIT_ACCOUNT_REACTIVATED, input);
  }

  recordDeletion(input: { actorEmail: string; note?: string; targetEmail: string }) {
    return this.record(ADMIN_AUDIT_ACCOUNT_DELETED, input);
  }

  recordSessionRevocation(input: {
    actorEmail: string;
    note?: string;
    targetEmail: string;
  }) {
    return this.record(ADMIN_AUDIT_SESSIONS_REVOKED, input);
  }

  recordDemotion(input: { actorEmail: string; note?: string; targetEmail: string }) {
    return this.record(ADMIN_AUDIT_ROLE_DEMOTED, {
      ...input,
      metadata: { previousRole: "admin" as const },
    });
  }

  recordCreditGrant(input: {
    actorEmail: string;
    credits: number;
    note: string;
    targetEmail: string;
  }) {
    return this.record(ADMIN_AUDIT_CREDITS_GRANTED, {
      actorEmail: input.actorEmail,
      metadata: { credits: input.credits },
      note: input.note,
      targetEmail: input.targetEmail,
    });
  }

  /** Called by the RGPD purge: the action stays, the person's email goes. */
  scrubTarget(targetEmail: string) {
    return this.store.scrubTarget(targetEmail);
  }

  private record(
    action: AdminAuditAction,
    input: {
      actorEmail: string;
      metadata?: { credits?: number; previousRole?: "admin" | "user" };
      note?: string | null;
      targetEmail: string | null;
    },
  ) {
    return this.store.record({
      action,
      actorEmail: input.actorEmail,
      metadata: input.metadata ?? {},
      note: input.note?.trim() || null,
      targetEmail: input.targetEmail,
    });
  }
}
