import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { AuthMailerService } from "./auth/auth-mailer.service";

const INTERVIEW_AUDIO_BODY_LIMIT = "16mb";

function loadEnvironmentFiles() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}

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
