import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CreditsService } from "./credits.service";

type RequestLike = {
  headers: { cookie?: string };
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRoleFilter(value: string | undefined) {
  if (value === "admin" || value === "user") {
    return value;
  }

  return null;
}

@Controller("credits")
export class CreditsController {
  constructor(
    @Inject(CreditsService)
    private readonly creditsService: CreditsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("me")
  getMyCredits(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      credits: this.creditsService.getSummaryForUser(session.email),
    };
  }

  @Get("users/:userEmail")
  getUserCredits(
    @Param("userEmail") userEmail: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readAdminSession(request);

    return {
      requestedBy: session.email,
      credits: this.creditsService.getSummaryForUser(userEmail.trim().toLowerCase()),
    };
  }

  @Get("admin/users")
  listAdminUsers(
    @Query("page") pageValue: string | undefined,
    @Query("pageSize") pageSizeValue: string | undefined,
    @Query("query") queryValue: string | undefined,
    @Query("role") roleValue: string | undefined,
    @Req() request: RequestLike,
  ) {
    const session = this.readAdminSession(request);
    const query = (queryValue ?? "").trim().toLowerCase();
    const role = normalizeRoleFilter(roleValue);
    const pageSize = Math.min(parsePositiveInteger(pageSizeValue, 6), 20);
    const matchingAccounts = this.authService
      .listAccounts()
      .filter((account) => {
        if (role && account.role !== role) {
          return false;
        }

        if (!query) {
          return true;
        }

        return account.email.toLowerCase().includes(query);
      })
      .map((account) => {
        const credits = this.creditsService.getSummaryForUser(account.email);
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
      .sort((left, right) => {
        const leftActivity = left.lastActivityAt ?? "";
        const rightActivity = right.lastActivityAt ?? "";

        return (
          rightActivity.localeCompare(leftActivity) ||
          left.email.localeCompare(right.email)
        );
      });
    const totalItems = matchingAccounts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(parsePositiveInteger(pageValue, 1), totalPages);
    const startIndex = (page - 1) * pageSize;

    return {
      filters: {
        query: queryValue?.trim() ?? "",
        role: role ?? "all",
      },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
      requestedBy: session.email,
      users: matchingAccounts.slice(startIndex, startIndex + pageSize),
    };
  }

  @Post("admin/grants")
  grantCredits(
    @Body() body: { credits?: number; note?: string; userEmail?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.readAdminSession(request);

    return {
      entry: this.creditsService.grantCredits({
        adminEmail: session.email,
        credits: body.credits ?? 0,
        note: body.note ?? "",
        userEmail: (body.userEmail ?? "").trim().toLowerCase(),
      }),
    };
  }

  private readSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }

  private readAdminSession(request: RequestLike) {
    const session = this.readSession(request);

    if (session.role !== "admin") {
      throw new ForbiddenException("Admin access is required.");
    }

    return session;
  }
}
