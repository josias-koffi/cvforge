import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { AuthMailerService } from "./auth/auth-mailer.service";
import { buildIndexesInBackground } from "./database/database.client";
import { resolveDatabaseConfig } from "./database/database.config";
import { loadEnvironmentFiles } from "./shared/env";

// Interview audio goes browser-to-OpenAI and CV files arrive as multipart, so
// nothing sent as JSON is large: 16 MB let one request cost that much memory.
const JSON_BODY_LIMIT = "2mb";

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    rawBody: true,
  });
  // Company logos are <img> targets on another origin (the web app), so the
  // default same-origin resource policy would block them.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useBodyParser("urlencoded", {
    extended: true,
    limit: JSON_BODY_LIMIT,
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

  // Large-table indexes, built while the API already serves (not awaited).
  void buildIndexesInBackground(resolveDatabaseConfig(process.env));

  return app;
}

if (process.env.NODE_ENV !== "test") {
  loadEnvironmentFiles();
  void bootstrap();
}
