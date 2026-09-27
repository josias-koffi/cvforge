import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  ROME_APPELLATIONS,
  type RomeAppellationsReader,
} from "./rome-appellations.pg-reader";

type RequestLike = {
  headers: { cookie?: string };
};

const SUGGESTIONS_LIMIT = 8;
const MAX_QUERY_CHARS = 80;

/** The ROME referential, read from the local copy — for signed-in candidates only. */
@Controller("rome")
export class RomeController {
  constructor(
    @Inject(ROME_APPELLATIONS)
    private readonly appellations: RomeAppellationsReader,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  /** The autocomplete of "Ajouter un métier" on /ma-recherche. */
  @Get("appellations")
  async searchAppellations(
    @Query("q") query: string | undefined,
    @Req() request: RequestLike,
  ) {
    if (!this.authService.readSessionFromCookieHeader(request.headers.cookie)) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      appellations: await this.appellations.search(
        (query ?? "").slice(0, MAX_QUERY_CHARS),
        SUGGESTIONS_LIMIT,
      ),
    };
  }
}
