import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { TemplatesService } from "./templates.service";
import type { TemplateInput } from "./templates.types";

type RequestLike = {
  headers: {
    cookie?: string;
  };
};

@Controller("templates")
export class TemplatesController {
  constructor(
    @Inject(TemplatesService)
    private readonly templatesService: TemplatesService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async listTemplates(@Req() request: RequestLike) {
    this.requireAdminSession(request.headers.cookie);

    return {
      templates: await this.templatesService.listTemplates(),
    };
  }

  @Get("analytics")
  getAnalytics(@Req() request: RequestLike) {
    this.requireAdminSession(request.headers.cookie);

    return this.templatesService.getAnalytics();
  }

  @Get("export.csv")
  async exportCsv(@Req() request: RequestLike) {
    this.requireAdminSession(request.headers.cookie);

    const analytics = await this.templatesService.getAnalytics();

    return new StreamableFile(Buffer.from(analytics.csv, "utf8"), {
      disposition: 'attachment; filename="admin-templates-export.csv"',
      type: "text/csv; charset=utf-8",
    });
  }

  @Post()
  async createTemplate(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: await this.templatesService.createTemplate(body as TemplateInput),
    };
  }

  @Put(":templateId")
  async updateTemplate(
    @Param("templateId") templateId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: await this.templatesService.updateTemplate(
        templateId,
        body as TemplateInput,
      ),
    };
  }

  @Post(":templateId/duplicate")
  async duplicateTemplate(
    @Param("templateId") templateId: string,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: await this.templatesService.duplicateTemplate(templateId),
    };
  }

  @Delete(":templateId")
  @HttpCode(204)
  async deleteTemplate(
    @Param("templateId") templateId: string,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);
    await this.templatesService.deleteTemplate(templateId);
  }

  private requireAdminSession(cookieHeader?: string) {
    const session = this.authService.readSessionFromCookieHeader(cookieHeader);

    if (!session) {
      throw new UnauthorizedException("A valid admin session is required.");
    }

    if (session.role !== "admin") {
      throw new ForbiddenException("Admin access is required.");
    }
  }
}
