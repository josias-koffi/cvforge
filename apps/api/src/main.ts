import { NestFactory } from "@nestjs/core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { AuthMailerService } from "./auth/auth-mailer.service";

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
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
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
