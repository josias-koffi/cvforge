import { Logger } from "@nestjs/common";
import type { AiFeature } from "@cvforge/types";
import type { LlmTarget } from "../llm-types";
import type { FeatureModelRow } from "./feature-models.pg-store";

export interface FeatureModelLookup {
  targetFor(feature: AiFeature): Promise<LlmTarget | null>;
}

/** For tests and scripts without a database: the deployment's chain applies. */
export const NO_FEATURE_MODELS: FeatureModelLookup = {
  targetFor: async () => null,
};

/** How long another instance can keep serving the previous choice. */
export const FEATURE_MODELS_CACHE_TTL_MS = 60 * 1000;

type Snapshot = { choices: Map<AiFeature, LlmTarget>; expiresAt: number };

const logger = new Logger("FeatureModels");

/**
 * The admin's model per feature, read once a minute rather than on each AI
 * call. A database hiccup must not cost a CV: the last known choices keep
 * serving, and with none the deployment's chain applies.
 */
export class FeatureModelRouter implements FeatureModelLookup {
  private snapshot: Snapshot | null = null;

  constructor(
    private readonly store: { listAll(): Promise<FeatureModelRow[]> },
    private readonly now: () => number = Date.now,
  ) {}

  async targetFor(feature: AiFeature): Promise<LlmTarget | null> {
    const choices = await this.currentChoices();
    return choices.get(feature) ?? null;
  }

  /** Called after a change, so the instance that saved it applies it at once. */
  invalidate() {
    this.snapshot = null;
  }

  private async currentChoices(): Promise<Map<AiFeature, LlmTarget>> {
    if (this.snapshot && this.snapshot.expiresAt > this.now()) {
      return this.snapshot.choices;
    }

    try {
      const rows = await this.store.listAll();
      const choices = new Map(
        rows.map((row) => [row.feature, { model: row.model, provider: row.provider }]),
      );
      this.snapshot = { choices, expiresAt: this.now() + FEATURE_MODELS_CACHE_TTL_MS };
      return choices;
    } catch (error) {
      logger.warn(
        `Feature models unreadable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.snapshot?.choices ?? new Map();
    }
  }
}
