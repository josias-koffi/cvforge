import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import { parseCreditOfferInput } from "./offers.validation";
import { CreditOffersService } from "./offers.service";

const uuid = new ParseUUIDPipe({ version: "4" });

@Controller("admin/credit-offers")
export class AdminCreditOffersController {
  constructor(
    @Inject(CreditOffersService) private readonly offers: CreditOffersService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return { offers: await this.offers.listForAdmin() };
  }

  @Post()
  create(@Body() body: unknown, @Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return this.offers.create(parseCreditOfferInput(body));
  }

  // Declared before `:id` routes so "sync-stripe" is never parsed as an id.
  @Post("sync-stripe")
  async syncStripe(@Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return { results: await this.offers.syncAll() };
  }

  @Put(":id")
  update(
    @Param("id", uuid) id: string,
    @Body() body: unknown,
    @Req() request: CookieRequest,
  ) {
    requireAdminSession(this.authService, request);

    return this.offers.update(id, parseCreditOfferInput(body));
  }

  @Post(":id/feature")
  async feature(@Param("id", uuid) id: string, @Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return { offer: await this.offers.feature(id) };
  }

  @Post(":id/archive")
  archive(@Param("id", uuid) id: string, @Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    return this.offers.archive(id);
  }
}

/** Unauthenticated catalogue for the landing site and the credits page. */
@Controller("public/credit-offers")
export class PublicCreditOffersController {
  constructor(
    @Inject(CreditOffersService) private readonly offers: CreditOffersService,
  ) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list() {
    return { offers: await this.offers.listPublic() };
  }
}
