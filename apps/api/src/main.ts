import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { AuthMailerService } from "./auth/auth-mailer.service";
import { loadEnvironmentFiles } from "./shared/env";

const INTERVIEW_AUDIO_BODY_LIMIT = "16mb";

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    rawBody: true,
  });
  app.useBodyParser("json", { limit: INTERVIEW_AUDIO_BODY_LIMIT });
  app.useBodyParser("urlencoded", {
    extended: true,
    limit: INTERVIEW_AUDIO_BODY_LIMIT,
  });
  app.enableCors({
    credentials: true,
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });
  // One hop: the reverse proxy in front of the API. Without this Express
  // reports the proxy's own address as `request.ip`, and the public scan's
  // per-IP rate limit would bucket every visitor together (US-101).
  app.set("trust proxy", 1);

  try {
    app.get(AuthMailerService).assertDeliveryReady();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown auth email delivery configuration error.";

    console.warn(`[bootstrap] ${message}`);
  }

  await app.listen(process.env.PORT ?? 3333);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  loadEnvironmentFiles();
  void bootstrap();
}
