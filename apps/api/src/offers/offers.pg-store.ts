import type { AdminCreditOffer, CreditOfferInput } from "@cvforge/types";
import { ConflictException } from "@nestjs/common";
import { asc, eq, ne, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { creditOffers } from "../database/schema";
import type { CreditOffersStore, StripeCatalogIds } from "./offers.types";

type OfferRow = typeof creditOffers.$inferSelect;

const UNIQUE_VIOLATION = "23505";

function toOffer(row: OfferRow): AdminCreditOffer {
  return {
    createdAt: row.createdAt.toISOString(),
    credits: row.credits,
    currency: row.currency,
    description: row.description,
    features: row.features,
    id: row.id,
    isFeatured: row.isFeatured,
    name: row.name,
    priceCents: row.priceCents,
    slug: row.slug,
    sortOrder: row.sortOrder,
    status: row.status,
    stripePriceId: row.stripePriceId,
    stripeProductId: row.stripeProductId,
    stripeSyncedAt: row.stripeSyncedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } };

  return candidate?.code === UNIQUE_VIOLATION || candidate?.cause?.code === UNIQUE_VIOLATION;
}

async function mapConflicts<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictException("Une offre utilise deja cet identifiant.");
    }

    throw error;
  }
}

const ORDER = [asc(creditOffers.sortOrder), asc(creditOffers.createdAt)];

export class PgCreditOffersStore implements CreditOffersStore {
  constructor(private readonly db: Database) {}

  async listAll() {
    const rows = await this.db.select().from(creditOffers).orderBy(...ORDER);

    return rows.map(toOffer);
  }

  async listActive() {
    const rows = await this.db
      .select()
      .from(creditOffers)
      .where(eq(creditOffers.status, "active"))
      .orderBy(...ORDER);

    return rows.map(toOffer);
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(creditOffers).where(eq(creditOffers.id, id));

    return row ? toOffer(row) : null;
  }

  create(input: CreditOfferInput) {
    return mapConflicts(async () => {
      const [row] = await this.db.insert(creditOffers).values(input).returning();

      return toOffer(row);
    });
  }

  update(id: string, input: CreditOfferInput) {
    return mapConflicts(async () => {
      const [row] = await this.db
        .update(creditOffers)
        .set({
          ...input,
          // Only an offer on sale can stay featured.
          ...(input.status === "active" ? {} : { isFeatured: false }),
          updatedAt: sql`now()`,
        })
        .where(eq(creditOffers.id, id))
        .returning();

      return row ? toOffer(row) : null;
    });
  }

  setFeatured(id: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .update(creditOffers)
        .set({ isFeatured: false, updatedAt: sql`now()` })
        .where(ne(creditOffers.id, id));
      const [row] = await tx
        .update(creditOffers)
        .set({ isFeatured: true, updatedAt: sql`now()` })
        .where(eq(creditOffers.id, id))
        .returning();

      return row ? toOffer(row) : null;
    });
  }

  async setStripeIds(id: string, ids: StripeCatalogIds) {
    const [row] = await this.db
      .update(creditOffers)
      .set({ ...ids, stripeSyncedAt: sql`now()` })
      .where(eq(creditOffers.id, id))
      .returning();

    return toOffer(row);
  }
}
