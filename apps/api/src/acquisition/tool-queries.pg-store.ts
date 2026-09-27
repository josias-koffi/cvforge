import { lt, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { toolQueries } from "../database/schema";
import type { NewToolQuery, ToolQueryStore } from "./tool-queries.types";

export class PgToolQueryStore implements ToolQueryStore {
  constructor(private readonly db: Database) {}

  /**
   * An upsert on the day's key: the label follows the latest spelling, the
   * counter goes up by one.
   */
  async increment(query: NewToolQuery) {
    await this.db
      .insert(toolQueries)
      .values(query)
      .onConflictDoUpdate({
        set: { hits: sql`${toolQueries.hits} + 1`, label: query.label },
        target: [
          toolQueries.day,
          toolQueries.tool,
          toolQueries.queryKey,
          toolQueries.place,
        ],
      });
  }

  async deleteBefore(day: string) {
    const rows = await this.db
      .delete(toolQueries)
      .where(lt(toolQueries.day, day))
      .returning({ id: toolQueries.id });

    return rows.length;
  }
}
