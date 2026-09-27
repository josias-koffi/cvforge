import { lt } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { acquisitionEvents } from "../database/schema";
import type {
  AcquisitionEventStore,
  NewAcquisitionEvent,
} from "./acquisition.types";

export class PgAcquisitionEventStore implements AcquisitionEventStore {
  constructor(private readonly db: Database) {}

  /**
   * `on conflict do nothing` on the visitor index: counting a visitor once per
   * day is the point, so a reload is not an error, just nothing to write.
   */
  async record(event: NewAcquisitionEvent) {
    await this.db.insert(acquisitionEvents).values(event).onConflictDoNothing();
  }

  async deleteBefore(day: string) {
    const rows = await this.db
      .delete(acquisitionEvents)
      .where(lt(acquisitionEvents.day, day))
      .returning({ id: acquisitionEvents.id });

    return rows.length;
  }
}
