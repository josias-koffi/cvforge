import {
  routableAiFeatures,
  type AiFeature,
  type AiFeatureModelsOverview,
  type AiModelChoice,
} from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";
import type { AdminAuditService } from "../../admin/admin-audit.service";
import type { OpenRouterConfig } from "../openrouter.config";
import type { PgAnthropicCreditStore } from "./anthropic-credit.pg-store";
import type { FeatureModelRouter } from "./feature-model.router";
import type { PgFeatureModelsStore } from "./feature-models.pg-store";

type DeploymentModels = Pick<
  OpenRouterConfig,
  "anthropicApiKey" | "defaultModel" | "featureModels"
>;

/** The admin's side of per-feature models: read, choose, go back to the default. */
export class FeatureModelsAdminService {
  constructor(
    private readonly store: Pick<PgFeatureModelsStore, "listAll" | "remove" | "save">,
    private readonly router: Pick<FeatureModelRouter, "invalidate">,
    private readonly audit: Pick<AdminAuditService, "recordAiModelChange">,
    private readonly deployment: DeploymentModels,
    private readonly credit: Pick<PgAnthropicCreditStore, "clear" | "readSummary" | "save">,
  ) {}

  async overview(): Promise<AiFeatureModelsOverview> {
    const [rows, anthropicCredit] = await Promise.all([
      this.store.listAll(),
      this.credit.readSummary(),
    ]);
    const choiceOf = new Map(rows.map((row) => [row.feature, row]));

    return {
      anthropicCredit,
      anthropicEnabled: Boolean(this.deployment.anthropicApiKey),
      features: routableAiFeatures.map((feature) => {
        const row = choiceOf.get(feature);
        return {
          choice: row ? { model: row.model, provider: row.provider } : null,
          defaultModel:
            this.deployment.featureModels?.[feature] ?? this.deployment.defaultModel,
          feature,
        };
      }),
    };
  }

  /** `null` removes the figure, and the estimate with it. */
  async setAnthropicBalance(balanceUsd: number | null) {
    if (balanceUsd === null) await this.credit.clear();
    else await this.credit.save(balanceUsd);

    return this.overview();
  }

  async choose(feature: AiFeature, choice: AiModelChoice, actorEmail: string) {
    if (choice.provider === "anthropic" && !this.deployment.anthropicApiKey) {
      throw new BadRequestException("ANTHROPIC_API_KEY n'est pas configuree.");
    }

    await this.store.save(feature, choice);
    this.router.invalidate();
    await this.audit.recordAiModelChange({
      actorEmail,
      feature,
      model: `${choice.provider}:${choice.model}`,
    });

    return this.overview();
  }

  async reset(feature: AiFeature, actorEmail: string) {
    await this.store.remove(feature);
    this.router.invalidate();
    await this.audit.recordAiModelChange({ actorEmail, feature, model: null });

    return this.overview();
  }
}
