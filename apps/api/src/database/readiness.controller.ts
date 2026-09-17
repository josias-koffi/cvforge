import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE, type Database } from "./database.types";

@Controller("ready")
export class ReadinessController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  async ready() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        service: "api",
        database: "unreachable",
      });
    }

    return { status: "ok", service: "api", database: "ok" };
  }
}
