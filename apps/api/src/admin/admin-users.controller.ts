import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession } from "../auth/request-session";
import { buildAdminUserDirectory } from "../credits/admin-user-directory";
import { CreditsService } from "../credits/credits.service";
import { PrivacyService } from "../privacy/privacy.service";

type RequestLike = {
  headers: { cookie?: string };
};

const MAX_ADMIN_PAGE_SIZE = 100;

function normalizeEmail(value: string) {
  return decodeURIComponent(value).trim().toLowerCase();
}

@Controller("admin/users")
export class AdminUsersController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(PrivacyService) private readonly privacyService: PrivacyService,
  ) {}

  @Get()
  async listUsers(
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @Query("query") query: string | undefined,
    @Query("role") role: string | undefined,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    return buildAdminUserDirectory(
      await this.authService.listAccounts(),
      this.creditsService,
      { maxPageSize: MAX_ADMIN_PAGE_SIZE, page, pageSize, query, role },
    );
  }

  @Patch(":email")
  updateUser(
    @Param("email") email: string,
    @Body() body: { role?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);

    if (targetEmail === session.email && body.role !== "admin") {
      throw new BadRequestException(
        "Vous ne pouvez pas retirer votre propre role administrateur.",
      );
    }

    return { user: this.authService.updateAccountRole(targetEmail, body.role) };
  }

  @Delete(":email")
  @HttpCode(200)
  async deleteUser(@Param("email") email: string, @Req() request: RequestLike) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);

    if (targetEmail === session.email) {
      throw new BadRequestException(
        "Vous ne pouvez pas supprimer votre propre compte depuis l'administration.",
      );
    }

    const accounts = await this.authService.listAccounts();

    if (!accounts.some((account) => account.email === targetEmail)) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    return { deletion: await this.privacyService.purgeAccount(targetEmail) };
  }
}
