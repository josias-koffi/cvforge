import { Injectable } from "@nestjs/common";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
  type AccountStatus,
} from "@cvforge/types";
import type { AuthRole } from "../auth/auth.types";
import type {
  AdminUsersPage,
  AdminUsersStore,
  DirectoryFilters,
} from "./admin-users.types";

const DEFAULT_PAGE_SIZE = 20;
const BALANCE_BANDS = new Set(["empty", "low", "stocked"]);

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRole(value: string | undefined): AuthRole | undefined {
  return value === "admin" || value === "user" ? value : undefined;
}

function normalizeStatus(value: string | undefined): AccountStatus | undefined {
  return value === ACCOUNT_STATUS_ACTIVE || value === ACCOUNT_STATUS_SUSPENDED
    ? value
    : undefined;
}

function normalizeBalance(value: string | undefined) {
  return BALANCE_BANDS.has(value ?? "")
    ? (value as DirectoryFilters["balance"])
    : undefined;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly store: AdminUsersStore) {}

  async listDirectory(params: {
    balance?: string;
    maxPageSize: number;
    page?: string;
    pageSize?: string;
    query?: string;
    role?: string;
    status?: string;
  }): Promise<AdminUsersPage> {
    const filters: DirectoryFilters = {
      balance: normalizeBalance(params.balance),
      query: params.query?.trim().toLowerCase() || undefined,
      role: normalizeRole(params.role),
      status: normalizeStatus(params.status),
    };
    const pageSize = Math.min(
      parsePositiveInteger(params.pageSize, DEFAULT_PAGE_SIZE),
      params.maxPageSize,
    );
    const requestedPage = parsePositiveInteger(params.page, 1);
    const firstPass = await this.store.listDirectory({
      filters,
      limit: pageSize,
      offset: (requestedPage - 1) * pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(firstPass.totalItems / pageSize));
    // A filter change can leave the URL pointing past the last page; clamp and
    // re-read rather than answering an empty table.
    const page = Math.min(requestedPage, totalPages);
    const { rows } =
      page === requestedPage
        ? firstPass
        : await this.store.listDirectory({
            filters,
            limit: pageSize,
            offset: (page - 1) * pageSize,
          });

    return {
      filters: {
        balance: filters.balance ?? "all",
        query: params.query?.trim() ?? "",
        role: filters.role ?? "all",
        status: filters.status ?? "all",
      },
      pagination: {
        page,
        pageSize,
        totalItems: firstPass.totalItems,
        totalPages,
      },
      users: rows,
    };
  }
}
