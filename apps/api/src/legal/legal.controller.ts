import { Body, Controller, Get, Header, Inject, Param, Post, Put, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import { LegalDocumentsService } from "./legal.service";
import { parseLegalDocumentInput, parseLegalDocumentSlug } from "./legal.validation";

@Controller("admin/legal")
export class AdminLegalController {
  constructor(
    @Inject(LegalDocumentsService) private readonly legal: LegalDocumentsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return { documents: await this.legal.listForAdmin() };
  }

  @Get(":slug")
  async get(@Param("slug") slug: string, @Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return { document: await this.legal.getForAdmin(parseLegalDocumentSlug(slug)) };
  }

  @Put(":slug")
  async update(
    @Param("slug") slug: string,
    @Body() body: unknown,
    @Req() request: CookieRequest,
  ) {
    requireAdminSession(this.authService, request);

    return {
      document: await this.legal.update(
        parseLegalDocumentSlug(slug),
        parseLegalDocumentInput(body),
      ),
    };
  }

  @Post(":slug/publish")
  async publish(@Param("slug") slug: string, @Req() request: CookieRequest) {
    const session = requireAdminSession(this.authService, request);

    return {
      document: await this.legal.publish(parseLegalDocumentSlug(slug), session.email),
    };
  }
}

/** Unauthenticated, for the landing site. Drafts are never served here. */
@Controller("public/legal")
export class PublicLegalController {
  constructor(
    @Inject(LegalDocumentsService) private readonly legal: LegalDocumentsService,
  ) {}

  @Get()
  @Header("Cache-Control", "public, max-age=300")
  async list() {
    return { documents: await this.legal.listPublic() };
  }

  @Get(":slug")
  @Header("Cache-Control", "public, max-age=300")
  async get(@Param("slug") slug: string) {
    return { document: await this.legal.getPublic(parseLegalDocumentSlug(slug)) };
  }
}
