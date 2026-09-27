import type { Database } from "../database/database.types";
import { aiUsageEvents } from "../database/schema";
import type { AiUsageEvent, AiUsageRecorder } from "./ai-usage";

export class PgAiUsageRecorder implements AiUsageRecorder {
  constructor(private readonly db: Database) {}

  async record(event: AiUsageEvent) {
    await this.db.insert(aiUsageEvents).values(event);
  }
}
