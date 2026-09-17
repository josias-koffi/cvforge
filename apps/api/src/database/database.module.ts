import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "./database.client";
import { resolveDatabaseConfig } from "./database.config";
import { DATABASE } from "./database.types";
import { ReadinessController } from "./readiness.controller";

const DATABASE_CLIENT = Symbol("DATABASE_CLIENT");

@Global()
@Module({
  controllers: [ReadinessController],
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: () => createDatabaseClient(resolveDatabaseConfig(process.env)),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) => client.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CLIENT) private readonly client: DatabaseClient) {}

  async onApplicationShutdown() {
    await this.client.close();
  }
}
