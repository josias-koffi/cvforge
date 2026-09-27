import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CompanyLogosService } from "./company-logos.service";

type RequestLike = { headers: { cookie?: string } };
type ResponseLike = { setHeader(name: string, value: string): void };

/**
 * A company's logo (ADR-025), for a signed-in candidate only: the proxy is
 * not a public image service.
 */
@Controller("company-logos")
export class CompanyLogosController {
  constructor(
    @Inject(CompanyLogosService) private readonly logos: CompanyLogosService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async read(
    @Query("src") src: string | undefined,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    if (!this.authService.readSessionFromCookieHeader(request.headers.cookie)) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const logo = src ? await this.logos.get(src) : null;
    if (!logo)
      throw new NotFoundException("Pas de logo pour cette entreprise.");

    // The URL names the image: the browser may keep it as long as we do.
    response.setHeader("Cache-Control", "private, max-age=604800, immutable");
    response.setHeader("X-Content-Type-Options", "nosniff");

    return new StreamableFile(logo.body, { type: logo.contentType });
  }
}
