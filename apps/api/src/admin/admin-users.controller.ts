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
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ACCOUNT_STATUS_SUSPENDED } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession } from "../auth/request-session";
import { CreditsService } from "../credits/credits.service";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { PrivacyService } from "../privacy/privacy.service";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import { AdminAuditService } from "./admin-audit.service";
import { AdminUsersService } from "./admin-users.service";

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
    @Inject(AdminAuditService) private readonly audit: AdminAuditService,
    @Inject(AdminUsersService) private readonly directory: AdminUsersService,
    @Inject(APPLICATIONS_STORE)
    private readonly applicationsStore: ApplicationsStore,
    @Inject(PROFILES_STORE) private readonly profilesStore: ProfilesStore,
  ) {}

  @Get()
  async listUsers(
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @Query("query") query: string | undefined,
    @Query("role") role: string | undefined,
    @Query("status") status: string | undefined,
    @Query("balance") balance: string | undefined,
    @Req() request: RequestLike,
  ) {
    requireAdminSession(this.authService, request);

    return this.directory.listDirectory({
      balance,
      maxPageSize: MAX_ADMIN_PAGE_SIZE,
      page,
      pageSize,
      query,
      role,
      status,
    });
  }

  /** The single account behind /admin/users/[email] (US-090). */
  @Get(":email")
  async readUser(@Param("email") email: string, @Req() request: RequestLike) {
    requireAdminSession(this.authService, request);

    const targetEmail = normalizeEmail(email);
    const accounts = await this.authService.listAccounts();
    const account = accounts.find((entry) => entry.email === targetEmail);

    if (!account) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    const [credits, applications, profiles, auditLog] = await Promise.all([
      this.creditsService.getSummaryForUser(targetEmail),
      this.applicationsStore.listByUserEmail(targetEmail),
      this.profilesStore.findByUserEmail(targetEmail),
      this.audit.list({ maxPageSize: 50, pageSize: "20", targetEmail }),
    ]);

    return {
      account: {
        consent: account.consent,
        email: account.email,
        role: account.role,
        sessionsValidFrom: account.sessionsValidFrom,
        status: account.status,
      },
      // Enough to see what the person did, not the documents themselves.
      applications: applications.map((application) => ({
        companyName: application.extracted.companyName,
        createdAt: application.createdAt,
        hasCv: application.cvContent !== null,
        hasLetter: application.letterContent !== null,
        id: application.id,
        status: application.status,
        title: application.extracted.title,
      })),
      auditLog: auditLog.entries,
      credits,
      profileCount: profiles?.profiles.length ?? 0,
    };
  }

  /**
   * Demotion only — `{ role: "user" }`. Vision §3.2 reserves `admin` for the
   * nominative invitation link, so `{ role: "admin" }` is rejected here and in
   * the service below it.
   */
  @Patch(":email")
  async updateUser(
    @Param("email") email: string,
    @Body() body: { role?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);

    if (targetEmail === session.email) {
      throw new BadRequestException(
        "Vous ne pouvez pas retirer votre propre role administrateur.",
      );
    }

    const user = await this.authService.demoteAccountToUser(targetEmail, body.role);

    await this.audit.recordDemotion({
      actorEmail: session.email,
      targetEmail,
    });

    return { user };
  }

  /** Suspends or reactivates. Suspending also kills the account's sessions. */
  @Patch(":email/status")
  async updateUserStatus(
    @Param("email") email: string,
    @Body() body: { note?: string; status?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);

    if (targetEmail === session.email) {
      throw new BadRequestException(
        "Vous ne pouvez pas suspendre votre propre compte.",
      );
    }

    if (body.status !== "active" && body.status !== ACCOUNT_STATUS_SUSPENDED) {
      throw new BadRequestException("Le statut doit etre active ou suspended.");
    }

    const suspending = body.status === ACCOUNT_STATUS_SUSPENDED;
    const user = suspending
      ? await this.authService.suspendAccount(targetEmail)
      : await this.authService.reactivateAccount(targetEmail);

    await (suspending
      ? this.audit.recordSuspension({
          actorEmail: session.email,
          note: body.note,
          targetEmail,
        })
      : this.audit.recordReactivation({
          actorEmail: session.email,
          note: body.note,
          targetEmail,
        }));

    return { user };
  }

  /** Force logout: every session issued before now stops working at once. */
  @Post(":email/revoke-sessions")
  @HttpCode(200)
  async revokeUserSessions(
    @Param("email") email: string,
    @Body() body: { note?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);
    const user = await this.authService.revokeSessions(targetEmail);

    await this.audit.recordSessionRevocation({
      actorEmail: session.email,
      note: body?.note,
      targetEmail,
    });

    return { user };
  }

  @Delete(":email")
  @HttpCode(200)
  async deleteUser(
    @Param("email") email: string,
    @Body() body: { confirmationEmail?: string; note?: string },
    @Req() request: RequestLike,
  ) {
    const session = requireAdminSession(this.authService, request);
    const targetEmail = normalizeEmail(email);

    if (targetEmail === session.email) {
      throw new BadRequestException(
        "Vous ne pouvez pas supprimer votre propre compte depuis l'administration.",
      );
    }

    // Second confirmation, as on the self-service path: the admin retypes the
    // address they are about to erase.
    if (normalizeEmail(body?.confirmationEmail ?? "") !== targetEmail) {
      throw new BadRequestException(
        "Saisissez l'adresse email du compte pour confirmer la suppression.",
      );
    }

    const accounts = await this.authService.listAccounts();

    if (!accounts.some((account) => account.email === targetEmail)) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    // Recorded first, then purged: the purge scrubs the target of every audit
    // entry — this one included — so the log keeps who did what and when,
    // without holding on to the erased person's address.
    await this.audit.recordDeletion({
      actorEmail: session.email,
      note: body?.note,
      targetEmail,
    });

    const deletion = await this.privacyService.purgeAccount(targetEmail);

    return { deletion };
  }
}
