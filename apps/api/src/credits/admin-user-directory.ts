import type { AuthAccountRecord } from "../auth/auth.types";
import type { CreditsService } from "./credits.service";

export type AdminUserDirectoryQuery = {
  maxPageSize: number;
  page?: string;
  pageSize?: string;
  query?: string;
  role?: string;
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRoleFilter(value: string | undefined) {
  return value === "admin" || value === "user" ? value : null;
}

export function buildAdminUserDirectory(
  accounts: AuthAccountRecord[],
  creditsService: CreditsService,
  params: AdminUserDirectoryQuery,
) {
  const query = (params.query ?? "").trim().toLowerCase();
  const role = normalizeRoleFilter(params.role);
  const pageSize = Math.min(
    parsePositiveInteger(params.pageSize, 6),
    params.maxPageSize,
  );
  const matchingAccounts = accounts
    .filter(
      (account) =>
        (!role || account.role === role) &&
        (!query || account.email.toLowerCase().includes(query)),
    )
    .map((account) => {
      const credits = creditsService.getSummaryForUser(account.email);
      const lastManualGrant =
        credits.history.find((entry) => entry.type === "admin_grant") ?? null;

      return {
        balance: credits.balance,
        consent: account.consent,
        email: account.email,
        lastActivityAt:
          credits.history[0]?.createdAt ?? account.consent?.acceptedAt ?? null,
        lastManualGrant: lastManualGrant
          ? {
              adminEmail: lastManualGrant.metadata.adminEmail ?? null,
              amount: lastManualGrant.amount,
              createdAt: lastManualGrant.createdAt,
              note: lastManualGrant.note,
            }
          : null,
        ledgerEntryCount: credits.history.length,
        role: account.role,
      };
    })
    .sort(
      (left, right) =>
        (right.lastActivityAt ?? "").localeCompare(left.lastActivityAt ?? "") ||
        left.email.localeCompare(right.email),
    );
  const totalItems = matchingAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(parsePositiveInteger(params.page, 1), totalPages);
  const startIndex = (page - 1) * pageSize;

  return {
    filters: {
      query: params.query?.trim() ?? "",
      role: role ?? "all",
    },
    pagination: { page, pageSize, totalItems, totalPages },
    users: matchingAccounts.slice(startIndex, startIndex + pageSize),
  };
}
