import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OnboardingService } from "./onboarding.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("onboarding")
export class OnboardingController {
  constructor(
    @Inject(OnboardingService)
    private readonly onboardingService: OnboardingService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async getStatus(@Req() request: RequestLike) {
    const { email } = this.readSession(request);

    return { onboarding: await this.onboardingService.status(email) };
  }

  @Post("complete")
  @HttpCode(200)
  async complete(@Req() request: RequestLike) {
    const { email } = this.readSession(request);

    return { onboarding: await this.onboardingService.complete(email) };
  }

  @Post("getting-started/dismiss")
  @HttpCode(200)
  async dismissGettingStarted(@Req() request: RequestLike) {
    const { email } = this.readSession(request);

    return {
      onboarding: await this.onboardingService.dismissGettingStarted(email),
    };
  }

  private readSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }
}
