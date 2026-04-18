import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3333);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  void bootstrap();
}
