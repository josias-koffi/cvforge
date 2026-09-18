import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import { AdminAuditService } from "./admin-audit.service";

const MAX_AUDIT_PAGE_SIZE = 100;

@Controller("admin/audit-log")
export class AdminAuditController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AdminAuditService) private readonly audit: AdminAuditService,
  ) {}

  @Get()
  async listAuditLog(
    @Query("action") action: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @Query("targetEmail") targetEmail: string | undefined,
    @Req() request: CookieRequest,
  ) {
    requireAdminSession(this.authService, request);

    return this.audit.list({
      action,
      maxPageSize: MAX_AUDIT_PAGE_SIZE,
      page,
      pageSize,
      targetEmail,
    });
  }
}
