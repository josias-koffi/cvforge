import type { AiFeature, AiModelChoice } from "@cvforge/types";
import { eq } from "drizzle-orm";
import type { Database } from "../../database/database.types";
import { aiFeatureModels } from "../../database/schema";

export type FeatureModelRow = AiModelChoice & { feature: AiFeature };

export class PgFeatureModelsStore {
  constructor(private readonly db: Database) {}

  listAll(): Promise<FeatureModelRow[]> {
    return this.db
      .select({
        feature: aiFeatureModels.feature,
        model: aiFeatureModels.model,
        provider: aiFeatureModels.provider,
      })
      .from(aiFeatureModels);
  }

  async save(feature: AiFeature, choice: AiModelChoice) {
    const values = { model: choice.model, provider: choice.provider, updatedAt: new Date() };

    await this.db
      .insert(aiFeatureModels)
      .values({ feature, ...values })
      .onConflictDoUpdate({ set: values, target: aiFeatureModels.feature });
  }

  async remove(feature: AiFeature) {
    await this.db.delete(aiFeatureModels).where(eq(aiFeatureModels.feature, feature));
  }
}
