import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
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
  listTemplates(@Req() request: RequestLike) {
    this.requireAdminSession(request.headers.cookie);

    return {
      templates: this.templatesService.listTemplates(),
    };
  }

  @Post()
  createTemplate(@Body() body: Record<string, unknown>, @Req() request: RequestLike) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: this.templatesService.createTemplate(body as TemplateInput),
    };
  }

  @Put(":templateId")
  updateTemplate(
    @Param("templateId") templateId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: this.templatesService.updateTemplate(
        templateId,
        body as TemplateInput,
      ),
    };
  }

  @Post(":templateId/duplicate")
  duplicateTemplate(
    @Param("templateId") templateId: string,
    @Req() request: RequestLike,
  ) {
    this.requireAdminSession(request.headers.cookie);

    return {
      template: this.templatesService.duplicateTemplate(templateId),
    };
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
