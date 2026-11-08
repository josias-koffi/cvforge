import { Body, Controller, Delete, Get, Inject, Param, Put, Req } from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../../auth/request-session";
import { FeatureModelsAdminService } from "./feature-models.admin.service";
import { parseBalance, parseModelChoice, parseRoutableFeature } from "./feature-models.validation";

@Controller("admin/ai-models")
export class FeatureModelsController {
  constructor(
    @Inject(FeatureModelsAdminService) private readonly models: FeatureModelsAdminService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  overview(@Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return this.models.overview();
  }

  @Put("anthropic-balance")
  setAnthropicBalance(@Body() body: unknown, @Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return this.models.setAnthropicBalance(parseBalance(body));
  }

  @Put(":feature")
  choose(
    @Param("feature") feature: string,
    @Body() body: unknown,
    @Req() request: CookieRequest,
  ) {
    const session = requireAdminSession(this.authService, request);

    return this.models.choose(
      parseRoutableFeature(feature),
      parseModelChoice(body),
      session.email,
    );
  }

  @Delete(":feature")
  reset(@Param("feature") feature: string, @Req() request: CookieRequest) {
    const session = requireAdminSession(this.authService, request);

    return this.models.reset(parseRoutableFeature(feature), session.email);
  }
}
