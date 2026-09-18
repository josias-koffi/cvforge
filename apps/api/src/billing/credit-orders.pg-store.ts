import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { creditOrders } from "../database/schema";
import { DELETED_ACCOUNT_MARKER } from "../credits/credits.pg-store";
import type {
  CreditOrdersStore,
  NewCreditOrder,
  StoredCreditOrder,
} from "./billing.types";

type OrderRow = typeof creditOrders.$inferSelect;

function toOrder(row: OrderRow): StoredCreditOrder {
  return {
    createdAt: row.createdAt.toISOString(),
    credits: row.credits,
    currency: row.currency,
    id: row.id,
    ledgerEntryId: row.ledgerEntryId,
    offerId: row.offerId,
    offerName: row.offerName,
    paidAt: row.paidAt?.toISOString() ?? null,
    priceCents: row.priceCents,
    status: row.status,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    userEmail: row.userEmail,
  };
}

export class PgCreditOrdersStore implements CreditOrdersStore {
  constructor(private readonly db: Database) {}

  async createPending(order: NewCreditOrder) {
    const [row] = await this.db.insert(creditOrders).values(order).returning();

    return toOrder(row);
  }

  async attachCheckoutSession(id: string, sessionId: string) {
    await this.db
      .update(creditOrders)
      .set({ stripeCheckoutSessionId: sessionId, updatedAt: sql`now()` })
      .where(eq(creditOrders.id, id));
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(creditOrders).where(eq(creditOrders.id, id));

    return row ? toOrder(row) : null;
  }

  async markPaid(
    id: string,
    payment: { ledgerEntryId: string; stripePaymentIntentId: string | null },
  ) {
    await this.db
      .update(creditOrders)
      .set({
        ...payment,
        paidAt: sql`coalesce(${creditOrders.paidAt}, now())`,
        status: "paid",
        updatedAt: sql`now()`,
      })
      .where(eq(creditOrders.id, id));
  }

  async markUnpaid(id: string, status: "expired" | "failed") {
    await this.db
      .update(creditOrders)
      .set({ status, updatedAt: sql`now()` })
      .where(and(eq(creditOrders.id, id), eq(creditOrders.status, "pending")));
  }

  async anonymizeUserEmail(userEmail: string) {
    const rows = await this.db
      .update(creditOrders)
      .set({ userEmail: DELETED_ACCOUNT_MARKER })
      .where(eq(creditOrders.userEmail, userEmail))
      .returning({ id: creditOrders.id });

    return rows.length;
  }

  async listForUser(userEmail: string) {
    const rows = await this.db
      .select()
      .from(creditOrders)
      .where(eq(creditOrders.userEmail, userEmail))
      .orderBy(desc(creditOrders.createdAt));

    return rows.map(toOrder);
  }
}
