import type {
  AdminCreditOffer,
  AdminCreditOfferMutationResponse,
  CreditOfferInput,
  PublicCreditOffer,
} from "@cvforge/types";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { CreditOffersStore, OfferStripeSyncContract } from "./offers.types";

const STRIPE_NOT_CONFIGURED =
  "Stripe n'est pas configure sur cet environnement (STRIPE_SECRET_KEY).";

export function toPublicOffer(offer: AdminCreditOffer): PublicCreditOffer {
  return {
    credits: offer.credits,
    currency: offer.currency,
    description: offer.description,
    features: offer.features,
    id: offer.id,
    isFeatured: offer.isFeatured,
    name: offer.name,
    priceCents: offer.priceCents,
    slug: offer.slug,
    sortOrder: offer.sortOrder,
  };
}

export class CreditOffersService {
  /** `stripeSync` is null when Stripe is not configured. */
  constructor(
    private readonly store: CreditOffersStore,
    private readonly stripeSync: OfferStripeSyncContract | null,
  ) {}

  listForAdmin() {
    return this.store.listAll();
  }

  async listPublic(): Promise<PublicCreditOffer[]> {
    return (await this.store.listActive()).map(toPublicOffer);
  }

  /** An active offer that can be sold right now, or a 4xx/5xx explaining why not. */
  async getPurchasableOffer(id: string): Promise<AdminCreditOffer & { stripePriceId: string }> {
    const offer = await this.store.findById(id);

    if (!offer || offer.status !== "active") {
      throw new NotFoundException("Cette offre n'est pas disponible.");
    }

    if (!offer.stripePriceId) {
      throw new ServiceUnavailableException(
        "Cette offre n'est pas encore disponible au paiement.",
      );
    }

    return { ...offer, stripePriceId: offer.stripePriceId };
  }

  async create(input: CreditOfferInput): Promise<AdminCreditOfferMutationResponse> {
    return this.syncAfterWrite(await this.store.create(input));
  }

  async update(id: string, input: CreditOfferInput): Promise<AdminCreditOfferMutationResponse> {
    return this.syncAfterWrite(this.found(await this.store.update(id, input)));
  }

  async feature(id: string): Promise<AdminCreditOffer> {
    const offer = this.found(await this.store.findById(id));

    if (offer.status !== "active") {
      throw new BadRequestException("Seule une offre active peut etre mise en avant.");
    }

    return this.found(await this.store.setFeatured(id));
  }

  async archive(id: string): Promise<AdminCreditOfferMutationResponse> {
    const offer = this.found(await this.store.findById(id));

    return this.update(id, {
      credits: offer.credits,
      description: offer.description,
      features: offer.features,
      name: offer.name,
      priceCents: offer.priceCents,
      slug: offer.slug,
      sortOrder: offer.sortOrder,
      status: "archived",
    });
  }

  /** Pushes every offer to Stripe; used after configuring a new environment. */
  async syncAll(): Promise<AdminCreditOfferMutationResponse[]> {
    if (!this.stripeSync) {
      throw new ServiceUnavailableException(STRIPE_NOT_CONFIGURED);
    }

    const results: AdminCreditOfferMutationResponse[] = [];

    for (const offer of await this.store.listAll()) {
      results.push(await this.syncAfterWrite(offer));
    }

    return results;
  }

  private found(offer: AdminCreditOffer | null): AdminCreditOffer {
    if (!offer) {
      throw new NotFoundException("Offre introuvable.");
    }

    return offer;
  }

  /**
   * The offer is saved first; a Stripe failure is reported rather than
   * thrown, so the admin keeps their edit and can retry the synchronisation.
   */
  private async syncAfterWrite(
    offer: AdminCreditOffer,
  ): Promise<AdminCreditOfferMutationResponse> {
    if (!this.stripeSync) {
      return { offer, stripeSyncError: STRIPE_NOT_CONFIGURED };
    }

    try {
      const ids = await this.stripeSync.sync(offer);

      return { offer: await this.store.setStripeIds(offer.id, ids), stripeSyncError: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur Stripe inconnue.";

      console.error(`[offers] Stripe sync failed for ${offer.slug}: ${message}`);

      return { offer, stripeSyncError: `Synchronisation Stripe impossible : ${message}` };
    }
  }
}
